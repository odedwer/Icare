# ICare — AWS Security & PWA Design

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** Security hardening of the existing Amplify Gen2 stack + PWA enablement + import path standardisation

---

## Context

ICare is a Hebrew-language, RTL residential care management app for ~10 daily users. It runs on AWS Amplify Gen2 (AppSync + DynamoDB + Cognito + S3 + Lambda). The data includes sensitive resident PHI. There are no formal compliance requirements. The target is a single production environment with minimal cost (all services stay within AWS free tiers at this scale).

### Critical problems being fixed

| # | Problem | Impact |
|---|---|---|
| 1 | All AppSync models authorised via public API key | Anyone with the key (visible in browser DevTools) can call any mutation |
| 2 | No server-side permission enforcement | Client-side-only role checks are bypassable |
| 3 | S3 bucket fully public | Patient photos (PHI) are accessible without any auth |
| 4 | `adminUserOps` Lambda trusts the caller blindly | Any request can create/delete Cognito users |
| 5 | PWA plugin commented out due to manifest syntax error | App is not installable |
| 6 | Inconsistent import paths (missing `.ts` extensions) | Diverges from project convention set in `amplify/` |

---

## Architecture Overview

The stack stays on **AWS Amplify Gen2**. No services are replaced. Every fix is a targeted change within the existing CDK + AppSync + Lambda setup.

```
Browser (React + Amplify JS)
  │  Cognito JWT (ID token) in Authorization header
  ▼
AppSync (GraphQL)
  │  Lambda Authorizer validates JWT → injects { userId, role } into resolver context
  ▼
DynamoDB (via auto-generated resolvers)          Lambda resolvers (custom mutations)
                                                  ├── updateWidgetOps  (permission check)
                                                  ├── adminUserOps     (admin check)
                                                  └── photoOps         (auth check)

S3 (private) ◄── CloudFront (OAC) ◄── browser (photo fetch, no auth token needed)
```

---

## Section 1 — AppSync Authentication (Lambda Authorizer)

### What changes

**New file:** `amplify/functions/appSyncAuthorizer/handler.ts`

Responsibilities:
1. Receives the `Authorization: Bearer <cognitoIdToken>` header from every AppSync request
2. Validates the JWT against the Cognito UserPool JWKS endpoint using `aws-jwt-verify`
3. Extracts `cognitoId` (`sub` claim) from the validated token
4. Does one DynamoDB read: `UserRecord.listByCognitoId(cognitoId)` → gets `userId` and `role`
5. Returns:
   ```json
   { "isAuthorized": true, "resolverContext": { "userId": "...", "role": "..." }, "ttlOverride": 300 }
   ```
6. On invalid JWT or missing UserRecord: returns `{ "isAuthorized": false }`

The 300-second TTL means one DynamoDB lookup per user per 5 minutes regardless of request frequency. Effectively free at this scale.

**New file:** `amplify/functions/appSyncAuthorizer/resource.ts`

Standard `defineFunction` wrapper. Needs `USER_POOL_ID` and `USER_POOL_CLIENT_ID` env vars (injected in `backend.ts`).

**Updated:** `amplify/data/resource.ts`

- All model `.authorization()` calls: `allow.publicApiKey()` → `allow.custom()`
- `AuditLogEntry`: `allow.custom().to(['create', 'read'])` (append-only preserved)
- `authorizationModes` block:
  ```typescript
  authorizationModes: {
    defaultAuthorizationMode: 'AWS_LAMBDA',
    lambdaAuthorizerConfig: {
      function: appSyncAuthorizer,
      timeToLiveInSeconds: 300,
    },
  }
  ```
- API key config removed entirely

**Updated:** `amplify/backend.ts`

- Inject `USER_POOL_ID` and `USER_POOL_CLIENT_ID` into the authorizer Lambda env
- Grant the authorizer Lambda `dynamodb:Query` on the `UserRecord` table's GSI

**Updated:** `src/api/AmplifyDataService.ts`

- Switch `generateClient` from `{ authMode: 'apiKey' }` to:
  ```typescript
  generateClient<Schema>({
    authMode: 'lambda',
    authToken: async () => {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? '';
    },
  })
  ```

### Dependencies

- New npm package: `aws-jwt-verify` (zero-dependency, AWS-maintained)

---

## Section 2 — Server-side Authorization

### Layer 1 — Admin operation gating

**Updated:** `amplify/functions/adminUserOps/handler.ts`

Add at the top of the handler, before any switch on `fieldName`:
```typescript
if (event.identity?.resolverContext?.role !== 'admin') {
  throw new Error('Forbidden');
}
```

**Updated:** `amplify/functions/photoOps/handler.ts`

Add auth guard (any authenticated user may upload):
```typescript
if (!event.identity?.resolverContext?.userId) {
  throw new Error('Forbidden');
}
```

### Layer 2 — Widget update enforcement

**Schema change in `amplify/data/resource.ts`:**

- `PatientWidget` model: add `.disableOperations(['update'])` to remove the auto-generated update resolver
- Add custom mutation:
  ```typescript
  updateWidget: a.mutation()
    .arguments({ widgetId: a.string().required(), newValue: a.string().required() })
    .returns(a.ref('PatientWidget'))
    .handler(a.handler.function(updateWidgetFn))
    .authorization((allow) => [allow.custom()])
  ```

**New file:** `amplify/functions/updateWidgetOps/handler.ts`

Logic (moved server-side from `AmplifyDataService.updateWidget`):
1. Extract `role` and `userId` from `event.identity.resolverContext` (no DB read — already set by authorizer)
2. Fetch widget by `widgetId` → get `widgetType` and `patientId`
3. Look up `WidgetPermission` by `widgetType` → check `rolesAllowedToEdit.includes(role)`
4. If denied: throw `Forbidden`
5. Update widget (`value`, `lastUpdated`, `updatedBy`)
6. Write `AuditLogEntry`
7. Return updated widget

**New file:** `amplify/functions/updateWidgetOps/resource.ts`

Standard `defineFunction` wrapper.

### Layer 3 — Admin-only table writes (via Lambda Authorizer)

The Lambda authorizer checks `role` against operation name for write operations on admin-only tables (`RoleDefinition`, `WidgetPermission`, `WidgetConfig`, `UserRecord`, `Patient`). Non-admin write attempts return `{ isAuthorized: false }` before reaching AppSync resolvers.

The authorizer's operation-level check logic:

```typescript
const ADMIN_ONLY_MUTATIONS = [
  'createRoleDefinition', 'updateRoleDefinition', 'deleteRoleDefinition',
  'createWidgetPermission', 'updateWidgetPermission', 'deleteWidgetPermission',
  'updateWidgetConfig',
  'createUserRecord', 'updateUserRecord', 'deleteUserRecord',
  'createPatient', 'updatePatient', 'deletePatient',
  'userAdminCreate', 'userAdminSetPassword', 'userAdminDelete',
];

if (ADMIN_ONLY_MUTATIONS.includes(operationName) && role !== 'admin') {
  return { isAuthorized: false };
}
```

`operationName` comes from `event.requestContext.operationName`.

---

## Section 3 — S3 Photo Privacy (CloudFront + OAC)

### What changes

**Updated:** `amplify/backend.ts`

- `PatientPhotosBucket`: replace the current `BlockPublicAccess` config with `BlockPublicAccess.BLOCK_ALL`
- Add CloudFront `Distribution` with:
  - `S3BucketOrigin` using `S3BucketOriginWithOAC` (OAC, not legacy OAI)
  - Default behaviour: `REDIRECT_TO_HTTPS`, `AllowedMethods.ALLOW_GET_HEAD`
  - No caching override needed (use CloudFront defaults)
- Add `BucketPolicy` granting CloudFront OAC `s3:GetObject` on the bucket
- Expose `cloudfrontDomain` via `backend.addOutput({ custom: { ..., cloudfrontDomain: distribution.domainName } })`
- Inject `CLOUDFRONT_DOMAIN` env var into `photoOps` Lambda

**Updated:** `amplify/functions/photoOps/handler.ts`

```typescript
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
// ...
return `https://${CLOUDFRONT_DOMAIN}/patients/${patientId}/photo.${ext}`;
```

### Data migration

**New file:** `scripts/migratePhotoUrls.ts`

One-time script (run manually after deployment):
1. Scans all `Patient` records
2. For each `photoUrl` starting with `https://<bucket>.s3.`, rewrites to `https://${CLOUDFRONT_DOMAIN}/...`
3. Updates the record in DynamoDB

This script is idempotent — safe to run multiple times.

---

## Section 4 — PWA (Installable App)

### What changes

**Updated:** `vite.config.ts`

Re-enable `VitePWA` with corrected manifest and updated runtime caching:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png'],
  manifest: {
    name: 'ICare — ניהול דיירים',
    short_name: 'ICare',
    description: 'מערכת ניהול דיירים למסגרות מגורים',
    theme_color: '#1976d2',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    lang: 'he',
    dir: 'rtl',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    cleanupOutdatedCaches: true,
    navigateFallback: '/index.html',
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.hostname.endsWith('.cloudfront.net'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'patient-photos',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
})
```

**Root cause of original syntax error:** The original config had `purpose: 'any maskable'` as a single string on one icon entry. The Web App Manifest spec requires `purpose` to be a space-separated string on a single entry OR split into two separate icon objects. `vite-plugin-pwa` validates strictly — splitting into two entries (one `'any'`, one `'maskable'`) resolves it.

**Install criteria:**
- HTTPS: Amplify Hosting (already enforced)
- Valid manifest: ✓ (name, short_name, icons ×2, display, start_url, lang, dir)
- Service worker: generated by Workbox via plugin
- Icons: already present at `public/icons/icon-192.png` and `public/icons/icon-512.png`

---

## Section 5 — Import Path Standardisation

### Rule

Every relative import path (starting with `./` or `../`) must end with an explicit `.ts` or `.tsx` extension. Third-party package imports are unchanged.

### Files to update

| File | Affected imports |
|---|---|
| `src/api/AmplifyDataService.ts` | `../../amplify/data/resource` → `.ts`, `./DataService` → `.ts`, `../types` → `.ts` |
| `src/api/index.ts` | `./DataService`, `./MockDataService`, `./AmplifyDataService` → `.ts` |
| `src/context/AuthContext.tsx` | `../api/DataService` → `.ts`, `../types` → `.ts` |
| `src/context/DataContext.tsx` | `../api/DataService` → `.ts` |
| `src/components/**/*.tsx` | All relative imports |
| `src/pages/**/*.tsx` | All relative imports |
| `amplify/functions/*/handler.ts` | Any cross-file relative imports |
| New files created in this plan | All relative imports use `.ts`/`.tsx` from the start |

---

## Files Created / Modified Summary

| Action | File |
|---|---|
| **New** | `amplify/functions/appSyncAuthorizer/handler.ts` |
| **New** | `amplify/functions/appSyncAuthorizer/resource.ts` |
| **New** | `amplify/functions/updateWidgetOps/handler.ts` |
| **New** | `amplify/functions/updateWidgetOps/resource.ts` |
| **New** | `scripts/migratePhotoUrls.ts` |
| **Updated** | `amplify/backend.ts` |
| **Updated** | `amplify/data/resource.ts` |
| **Updated** | `amplify/functions/adminUserOps/handler.ts` |
| **Updated** | `amplify/functions/photoOps/handler.ts` |
| **Updated** | `src/api/AmplifyDataService.ts` |
| **Updated** | `vite.config.ts` |
| **Updated** | All `src/` files with relative imports (`.ts`/`.tsx` extension fix) |

---

## Cost Impact

All changes stay within AWS free tiers for 10 daily users:

| Service | Monthly cost |
|---|---|
| AppSync | $0 (within 250K free queries) |
| Lambda (all functions) | $0 (within 1M free invocations) |
| DynamoDB | $0 (within free tier) |
| Cognito | $0 (within 50K MAUs) |
| CloudFront | $0 (within 1TB free) |
| S3 | ~$0.01 |
| Amplify Hosting | $0 (free tier) |
| **Total** | **~$0/month** |

WAF is omitted — for 10 internal users behind Cognito, AWS Shield Standard (free, always-on) provides sufficient DDoS protection. WAF can be added later if needed (~$10/month).
