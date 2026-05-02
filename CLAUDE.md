# ICare — Project Context for Claude

## What This Is

ICare is a **secure internal web application** for caregivers in residential care facilities for people with intellectual disabilities. It enables quick resident lookup and viewing/editing of critical care data organised as widget cards on each resident's profile. The data is sensitive medical/personal information (PHI).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + React Router v7 |
| State | React Context (`AuthContext`, `DataContext`) |
| Backend infra | AWS Amplify Gen2 (CDK-based) |
| API | AWS AppSync (GraphQL) |
| Database | Amazon DynamoDB (via Amplify Data) |
| Auth | AWS Cognito (custom CDK UserPool — username-only, no email) |
| Storage | Amazon S3 (patient photos) |
| Hosting | AWS Amplify Hosting (CI/CD via `amplify.yml`) |
| Lambdas | `adminUserOps` (Cognito CRUD), `photoOps` (S3 upload) |

---

## Key Files

| File | Purpose |
|---|---|
| `amplify/backend.ts` | CDK entry — Cognito, S3, IAM wiring |
| `amplify/data/resource.ts` | AppSync schema + authorization rules |
| `amplify/functions/adminUserOps/handler.ts` | Lambda: create/set-password/delete Cognito users |
| `amplify/functions/photoOps/handler.ts` | Lambda: base64 image → S3 |
| `src/api/DataService.ts` | DataService interface (contract) |
| `src/api/AmplifyDataService.ts` | Live implementation against AppSync |
| `src/api/MockDataService.ts` | In-memory mock (dev/demo) |
| `src/context/AuthContext.tsx` | Login/logout, `canEdit()` per widget type |
| `src/context/DataContext.tsx` | Provides `DataService` via context |
| `amplify.yml` | Amplify Hosting build config |

---

## Data Models (DynamoDB tables via AppSync)

| Model | Key fields |
|---|---|
| `UserRecord` | `cognitoId`, `username`, `role` |
| `Patient` | `fullName`, `idNumber`, `group`, `dateOfBirth`, `gender`, `photoUrl` |
| `PatientWidget` | `patientId`, `widgetType`, `value`, `lastUpdated`, `updatedBy` |
| `WidgetPermission` | `widgetType`, `rolesAllowedToEdit[]` |
| `WidgetConfig` | `widgetType`, `inputType`, `options[]` |
| `AuditLogEntry` | `userId`, `patientId`, `widgetType`, `oldValue`, `newValue`, `timestamp` |
| `RoleDefinition` | `roleId`, `label`, `isBuiltIn` |

---

## RBAC Model

- 13 built-in roles (doctor, nurse, caregiver, admin, etc.) plus custom roles
- Per-widget edit permissions stored in `WidgetPermission` table
- All authenticated users can **view** all widgets; only authorised roles can **edit**
- `canEdit()` is currently enforced client-side only

---

## Known Security Issues (Critical)

1. **API Key auth for all models** — every DynamoDB table uses `allow.publicApiKey()`. The API key is in the frontend JS bundle. Authorization is not enforced at the AppSync/IAM level.
2. **S3 bucket is public** — `blockPublicAccess` is fully disabled; patient photos are served at plain public S3 URLs (PHI exposure).
3. **No server-side permission enforcement** — `updateWidget` checks permissions in `AmplifyDataService`, but AppSync itself doesn't enforce them. Any client can bypass this.
4. **`adminUserOps` Lambda has no caller verification** — it performs Cognito admin operations without validating that the caller has admin role.
5. **API key expires in 365 days** — long rotation window, manual rotation required.
6. **No WAF** on AppSync endpoint or Amplify Hosting.
7. **No VPC isolation** for Lambda functions.
8. **Audit log weakly protected** — only `create`/`read` allowed via API key, but the API key is public.

---

## Architecture Pattern

The `DataService` interface (`src/api/DataService.ts`) is the single abstraction layer between the frontend and any backend. Swapping implementations requires only changing the instantiation in `src/App.tsx`. This makes it straightforward to introduce a more secure implementation.

---

## Build & Deploy

```bash
npm ci --legacy-peer-deps   # install
npm run build               # tsc + vite build → dist/
```

Amplify Hosting builds from `amplify.yml`. The secret `AMPLIFY_OUTPUTS_JSON` env var is injected at build time to produce `amplify_outputs.json`.

---

## Coding Conventions

- TypeScript strict mode; all types defined in `src/types/index.ts`
- Components in `src/components/`, pages in `src/pages/`
- All styles in `src/styles.css` (single file)
- Hebrew is the UI language; RTL layout throughout
- No test suite yet (all testing is manual/demo)
- Amplify Gen2 CDK patterns used for infra (not Amplify Gen1 CLI)
