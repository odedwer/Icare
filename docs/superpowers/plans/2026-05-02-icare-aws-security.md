# ICare AWS Security & PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public API-key AppSync auth with a Cognito JWT Lambda authorizer, enforce widget permissions server-side, make S3 photos private behind CloudFront, enable PWA installation, and standardise all relative import paths to include `.ts`/`.tsx` extensions.

**Architecture:** The Amplify Gen2 stack stays intact. A new `appSyncAuthorizer` Lambda validates Cognito JWTs and injects `{ userId, role }` into every AppSync resolver context. A new `updateWidgetOps` Lambda replaces the auto-generated `PatientWidget.update` resolver and enforces `WidgetPermission` checks server-side. Patient photos move from a public S3 bucket to a private bucket behind a CloudFront distribution with Origin Access Control.

**Tech Stack:** AWS Amplify Gen2, AWS AppSync, Amazon DynamoDB, Amazon Cognito, Amazon CloudFront, Amazon S3, AWS Lambda, `aws-jwt-verify`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `vite-plugin-pwa`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `amplify/functions/appSyncAuthorizer/handler.ts` | Validate Cognito JWT → inject userId+role into resolver context |
| Create | `amplify/functions/appSyncAuthorizer/resource.ts` | defineFunction wrapper |
| Create | `amplify/functions/updateWidgetOps/handler.ts` | Server-side widget permission check + DynamoDB update + audit log |
| Create | `amplify/functions/updateWidgetOps/resource.ts` | defineFunction wrapper |
| Create | `scripts/migratePhotoUrls.ts` | One-time rewrite of S3 URLs → CloudFront URLs in Patient table |
| Modify | `amplify/data/resource.ts` | Switch all auth to lambda mode; add `updateWidget` custom mutation; restrict PatientWidget.update |
| Modify | `amplify/backend.ts` | Wire authorizer + updateWidgetOps Lambdas; S3 BLOCK_ALL + CloudFront OAC |
| Modify | `amplify/functions/adminUserOps/handler.ts` | Add admin role guard |
| Modify | `amplify/functions/photoOps/handler.ts` | Add auth guard; return CloudFront URL |
| Modify | `src/api/AmplifyDataService.ts` | Lambda auth mode; call `updateWidget` mutation; fix import extensions |
| Modify | `vite.config.ts` | Re-enable VitePWA with corrected manifest |
| Modify | `package.json` | Add `aws-jwt-verify`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb` |
| Modify | All `src/` files | Add `.ts`/`.tsx` extensions to every relative import |
| Modify | `amplify_outputs.example.json` | Remove API key fields; document new custom outputs |

---

## Task 1: Add npm dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new packages**

```bash
npm install aws-jwt-verify @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

Expected output: packages added to `node_modules` and `package.json` `dependencies`.

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npm run build
```

Expected: build succeeds (no new errors introduced yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add aws-jwt-verify and DynamoDB SDK packages"
```

---

## Task 2: Create AppSync Lambda Authorizer

**Files:**
- Create: `amplify/functions/appSyncAuthorizer/resource.ts`
- Create: `amplify/functions/appSyncAuthorizer/handler.ts`

- [ ] **Step 1: Create resource.ts**

Create `amplify/functions/appSyncAuthorizer/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const appSyncAuthorizer = defineFunction({
  name: 'appsync-authorizer',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
```

- [ ] **Step 2: Create handler.ts**

Create `amplify/functions/appSyncAuthorizer/handler.ts`:

```typescript
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const USER_RECORD_TABLE = process.env.USER_RECORD_TABLE!;

const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'id',
  clientId: USER_POOL_CLIENT_ID,
});

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface AuthorizerEvent {
  authorizationToken: string;
  requestContext: {
    apiId: string;
    accountId: string;
    requestId: string;
    queryString: string;
    operationName: string | null;
    variables: Record<string, unknown>;
  };
}

interface AuthorizerResult {
  isAuthorized: boolean;
  resolverContext?: Record<string, unknown>;
  ttlOverride?: number;
}

export const handler = async (event: AuthorizerEvent): Promise<AuthorizerResult> => {
  const token = event.authorizationToken.replace(/^Bearer\s+/i, '');

  let cognitoId: string;
  try {
    const payload = await verifier.verify(token);
    cognitoId = payload.sub;
  } catch {
    return { isAuthorized: false };
  }

  // UserRecord table has ~10 items — scan is acceptable and avoids GSI naming assumptions
  const result = await dynamo.send(
    new ScanCommand({
      TableName: USER_RECORD_TABLE,
      FilterExpression: 'cognitoId = :cid',
      ExpressionAttributeValues: { ':cid': cognitoId },
      Limit: 1,
    }),
  );

  const record = result.Items?.[0];
  if (!record) return { isAuthorized: false };

  return {
    isAuthorized: true,
    resolverContext: {
      userId: record['id'] as string,
      role: record['role'] as string,
    },
    ttlOverride: 300,
  };
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add amplify/functions/appSyncAuthorizer/handler.ts amplify/functions/appSyncAuthorizer/resource.ts
git commit -m "feat: add AppSync Lambda authorizer — validates Cognito JWT, injects userId+role"
```

---

## Task 3: Create updateWidgetOps Lambda

**Files:**
- Create: `amplify/functions/updateWidgetOps/resource.ts`
- Create: `amplify/functions/updateWidgetOps/handler.ts`

- [ ] **Step 1: Create resource.ts**

Create `amplify/functions/updateWidgetOps/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const updateWidgetOps = defineFunction({
  name: 'update-widget-ops',
  entry: './handler.ts',
  timeoutSeconds: 15,
});
```

- [ ] **Step 2: Create handler.ts**

Create `amplify/functions/updateWidgetOps/handler.ts`:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { AppSyncResolverHandler } from 'aws-lambda';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const WIDGET_TABLE = process.env.WIDGET_TABLE!;
const PERMISSION_TABLE = process.env.PERMISSION_TABLE!;
const AUDIT_TABLE = process.env.AUDIT_TABLE!;

type Args = { widgetId: string; newValue: string };
type Result = {
  id: string;
  patientId: string;
  widgetType: string;
  value: string;
  lastUpdated: string;
  updatedBy: string;
};

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { widgetId, newValue } = event.arguments;
  const identity = event.identity as { resolverContext?: { userId?: string; role?: string } } | null;
  const userId = identity?.resolverContext?.userId;
  const role = identity?.resolverContext?.role;

  if (!userId || !role) throw new Error('Unauthorized');

  // 1. Fetch existing widget
  const widgetResult = await dynamo.send(
    new GetCommand({ TableName: WIDGET_TABLE, Key: { id: widgetId } }),
  );
  const widget = widgetResult.Item;
  if (!widget) throw new Error('Widget not found');

  // 2. Check WidgetPermission — WidgetPermission table has 9 items, scan is fine
  const permResult = await dynamo.send(
    new ScanCommand({
      TableName: PERMISSION_TABLE,
      FilterExpression: 'widgetType = :wt',
      ExpressionAttributeValues: { ':wt': widget['widgetType'] as string },
    }),
  );
  const perm = permResult.Items?.[0];
  const allowed = (perm?.['rolesAllowedToEdit'] as string[] | undefined) ?? [];
  if (!allowed.includes(role)) throw new Error('Permission denied');

  // 3. Update widget — 'value' is a DynamoDB reserved word, use expression name alias
  const now = new Date().toISOString();
  await dynamo.send(
    new UpdateCommand({
      TableName: WIDGET_TABLE,
      Key: { id: widgetId },
      UpdateExpression: 'SET #v = :val, lastUpdated = :lu, updatedBy = :ub, updatedAt = :ua',
      ExpressionAttributeNames: { '#v': 'value' },
      ExpressionAttributeValues: {
        ':val': newValue,
        ':lu': now,
        ':ub': userId,
        ':ua': now,
      },
    }),
  );

  // 4. Write AuditLogEntry
  await dynamo.send(
    new PutCommand({
      TableName: AUDIT_TABLE,
      Item: {
        id: crypto.randomUUID(),
        __typename: 'AuditLogEntry',
        userId,
        patientId: widget['patientId'] as string,
        widgetType: widget['widgetType'] as string,
        oldValue: widget['value'] as string,
        newValue,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      },
    }),
  );

  return {
    id: widgetId,
    patientId: widget['patientId'] as string,
    widgetType: widget['widgetType'] as string,
    value: newValue,
    lastUpdated: now,
    updatedBy: userId,
  };
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add amplify/functions/updateWidgetOps/handler.ts amplify/functions/updateWidgetOps/resource.ts
git commit -m "feat: add updateWidgetOps Lambda — server-side widget permission enforcement"
```

---

## Task 4: Update AppSync Schema

**Files:**
- Modify: `amplify/data/resource.ts`

- [ ] **Step 1: Rewrite amplify/data/resource.ts**

Replace the entire file with:

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { adminUserOps } from '../functions/adminUserOps/resource.ts';
import { photoOps } from '../functions/photoOps/resource.ts';
import { appSyncAuthorizer } from '../functions/appSyncAuthorizer/resource.ts';
import { updateWidgetOps } from '../functions/updateWidgetOps/resource.ts';

const schema = a.schema({
  UserRecord: a
    .model({
      cognitoId: a.string().required(),
      name: a.string().required(),
      username: a.string().required(),
      role: a.string().required(),
    })
    .secondaryIndexes((index) => [index('username'), index('cognitoId')])
    .authorization((allow) => [allow.custom()]),

  Patient: a
    .model({
      fullName: a.string().required(),
      idNumber: a.string().required(),
      photoUrl: a.string().required(),
      group: a.string().required(),
      dateOfBirth: a.string().required(),
      gender: a.string().required(),
    })
    .secondaryIndexes((index) => [index('idNumber')])
    .authorization((allow) => [allow.custom()]),

  PatientWidget: a
    .model({
      patientId: a.string().required(),
      widgetType: a.string().required(),
      value: a.string().required(),
      lastUpdated: a.string().required(),
      updatedBy: a.string().required(),
    })
    .secondaryIndexes((index) => [index('patientId')])
    // update is disabled here — use the custom updateWidget mutation which enforces WidgetPermission
    // Valid operations: create, read, delete. 'read' covers both get and list.
    .authorization((allow) => [allow.custom().to(['create', 'read', 'delete'])]),

  WidgetPermission: a
    .model({
      widgetType: a.string().required(),
      rolesAllowedToEdit: a.string().array().required(),
    })
    .secondaryIndexes((index) => [index('widgetType')])
    .authorization((allow) => [allow.custom()]),

  WidgetConfig: a
    .model({
      widgetType: a.string().required(),
      inputType: a.string().required(),
      options: a.string().array().required(),
    })
    .secondaryIndexes((index) => [index('widgetType')])
    .authorization((allow) => [allow.custom()]),

  AuditLogEntry: a
    .model({
      userId: a.string().required(),
      patientId: a.string().required(),
      widgetType: a.string().required(),
      oldValue: a.string().required(),
      newValue: a.string().required(),
      timestamp: a.string().required(),
    })
    .secondaryIndexes((index) => [index('patientId')])
    // Append-only: deny mutations other than create and reads
    .authorization((allow) => [allow.custom().to(['create', 'read', 'list', 'get'])]),

  RoleDefinition: a
    .model({
      roleId: a.string().required(),
      label: a.string().required(),
      isBuiltIn: a.boolean().required(),
    })
    .secondaryIndexes((index) => [index('roleId')])
    .authorization((allow) => [allow.custom()]),

  // Custom mutation — replaces auto-generated PatientWidget.update.
  // The Lambda handler enforces WidgetPermission server-side before writing.
  updateWidget: a
    .mutation()
    .arguments({
      widgetId: a.string().required(),
      newValue: a.string().required(),
    })
    .returns(a.ref('PatientWidget'))
    .handler(a.handler.function(updateWidgetOps))
    .authorization((allow) => [allow.custom()]),

  userAdminCreate: a
    .mutation()
    .arguments({
      username: a.string().required(),
      password: a.string().required(),
      role: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.custom()]),

  userAdminSetPassword: a
    .mutation()
    .arguments({
      username: a.string().required(),
      password: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.custom()]),

  userAdminDelete: a
    .mutation()
    .arguments({
      username: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.custom()]),

  uploadPatientPhoto: a
    .mutation()
    .arguments({
      patientId: a.string().required(),
      imageBase64: a.string().required(),
      contentType: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(photoOps))
    .authorization((allow) => [allow.custom()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'AWS_LAMBDA',
    lambdaAuthorizerConfig: {
      function: appSyncAuthorizer,
      timeToLiveInSeconds: 300,
    },
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors. Note: the Amplify backend compile (`amplify/tsconfig.json`) runs as part of `tsc -b`.

- [ ] **Step 3: Commit**

```bash
git add amplify/data/resource.ts
git commit -m "feat: switch AppSync auth from publicApiKey to Lambda authorizer; restrict PatientWidget.update"
```

---

## Task 5: Update backend.ts — Wire Lambdas + CloudFront

**Files:**
- Modify: `amplify/backend.ts`

- [ ] **Step 1: Rewrite amplify/backend.ts**

Replace the entire file with:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { RemovalPolicy } from 'aws-cdk-lib';
import { UserPool, UserPoolClient, AccountRecovery } from 'aws-cdk-lib/aws-cognito';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import {
  Distribution,
  ViewerProtocolPolicy,
  AllowedMethods,
  CachePolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IConstruct } from 'constructs';
import { data } from './data/resource.ts';

const backend = defineBackend({ data });

// ─── Auth — Cognito User Pool (username-only, no email/phone required) ────────

const authStack = backend.createStack('AuthStack');

const userPool = new UserPool(authStack, 'UserPool', {
  userPoolName: 'icare-user-pool',
  selfSignUpEnabled: false,
  signInAliases: { username: true },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: false,
  },
  accountRecovery: AccountRecovery.NONE,
});

const userPoolClient = new UserPoolClient(authStack, 'UserPoolClient', {
  userPool,
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
  generateSecret: false,
});

// ─── Lambda finder helper ──────────────────────────────────────────────────────

function findLambdaInTree(scope: IConstruct, nameFragment: string): LambdaFunction {
  const match = scope.node
    .findAll()
    .find(
      (n) =>
        n instanceof LambdaFunction &&
        n.node.path.toLowerCase().replace(/-/g, '').includes(nameFragment.toLowerCase()),
    ) as LambdaFunction | undefined;

  if (!match) {
    const available = scope.node
      .findAll()
      .filter((n) => n instanceof LambdaFunction)
      .map((n) => n.node.path);
    throw new Error(
      `Lambda matching '${nameFragment}' not found.\nAvailable Lambdas:\n${available.join('\n')}`,
    );
  }
  return match;
}

const cdkApp = backend.data.resources.graphqlApi.stack.node.root;

// ─── AppSync Authorizer Lambda ─────────────────────────────────────────────────

const appSyncAuthorizerLambda = findLambdaInTree(cdkApp, 'appsyncauthorizer');
appSyncAuthorizerLambda.addEnvironment('USER_POOL_ID', userPool.userPoolId);
appSyncAuthorizerLambda.addEnvironment('USER_POOL_CLIENT_ID', userPoolClient.userPoolClientId);

const userRecordTable = backend.data.resources.tables['UserRecord'];
appSyncAuthorizerLambda.addEnvironment('USER_RECORD_TABLE', userRecordTable.tableName);
userRecordTable.grantReadData(appSyncAuthorizerLambda);

// ─── Admin User Ops Lambda ─────────────────────────────────────────────────────

const adminUserOpsLambda = findLambdaInTree(cdkApp, 'adminuserops');
adminUserOpsLambda.addEnvironment('USER_POOL_ID', userPool.userPoolId);
adminUserOpsLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminDeleteUser',
    ],
    resources: [userPool.userPoolArn],
  }),
);

// ─── Update Widget Ops Lambda ──────────────────────────────────────────────────

const updateWidgetOpsLambda = findLambdaInTree(cdkApp, 'updatewidgetops');

const widgetTable = backend.data.resources.tables['PatientWidget'];
const permissionTable = backend.data.resources.tables['WidgetPermission'];
const auditTable = backend.data.resources.tables['AuditLogEntry'];

updateWidgetOpsLambda.addEnvironment('WIDGET_TABLE', widgetTable.tableName);
updateWidgetOpsLambda.addEnvironment('PERMISSION_TABLE', permissionTable.tableName);
updateWidgetOpsLambda.addEnvironment('AUDIT_TABLE', auditTable.tableName);

widgetTable.grantReadWriteData(updateWidgetOpsLambda);
permissionTable.grantReadData(updateWidgetOpsLambda);
auditTable.grantWriteData(updateWidgetOpsLambda);

// ─── S3 + CloudFront for patient photos ───────────────────────────────────────

const photoStack = backend.createStack('PhotoStack');

const photoBucket = new Bucket(photoStack, 'PatientPhotosBucket', {
  // Fully private — access only via CloudFront OAC
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  removalPolicy: RemovalPolicy.RETAIN,
});

const photoDistribution = new Distribution(photoStack, 'PhotoDistribution', {
  defaultBehavior: {
    // S3BucketOrigin.withOriginAccessControl creates the OAC and wires the bucket policy automatically
    origin: S3BucketOrigin.withOriginAccessControl(photoBucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
    cachePolicy: CachePolicy.CACHING_OPTIMIZED,
  },
});

// Grant the photoOps Lambda permission to put objects into the bucket
const photoOpsLambda = findLambdaInTree(cdkApp, 'photoops');
photoOpsLambda.addEnvironment('PHOTO_BUCKET_NAME', photoBucket.bucketName);
photoOpsLambda.addEnvironment('CLOUDFRONT_DOMAIN', photoDistribution.domainName);
photoBucket.grantPut(photoOpsLambda);

// ─── Outputs ───────────────────────────────────────────────────────────────────

backend.addOutput({
  custom: {
    userPoolId: userPool.userPoolId,
    userPoolClientId: userPoolClient.userPoolClientId,
    region: authStack.region,
    photoBucketName: photoBucket.bucketName,
    cloudfrontDomain: photoDistribution.domainName,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add amplify/backend.ts
git commit -m "feat: wire authorizer+updateWidget Lambdas; add CloudFront OAC; block S3 public access"
```

---

## Task 6: Secure adminUserOps Lambda

**Files:**
- Modify: `amplify/functions/adminUserOps/handler.ts`

- [ ] **Step 1: Add admin role guard at top of handler**

Replace the entire file with:

```typescript
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { AppSyncResolverHandler } from 'aws-lambda';

const cognitoClient = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

export const handler: AppSyncResolverHandler<
  { username?: string; password?: string; role?: string },
  string
> = async (event) => {
  // Enforce admin-only access using role injected by the Lambda authorizer
  const identity = event.identity as { resolverContext?: { role?: string } } | null;
  if (identity?.resolverContext?.role !== 'admin') {
    throw new Error('Forbidden: admin role required');
  }

  const { fieldName } = event.info;
  const args = event.arguments;

  if (fieldName === 'userAdminCreate') {
    const { username, password } = args as {
      username: string;
      password: string;
      role: string;
    };

    const createRes = await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        MessageAction: 'SUPPRESS',
        UserAttributes: [],
      }),
    );

    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: password,
        Permanent: true,
      }),
    );

    const sub = createRes.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    if (!sub) throw new Error('Failed to get Cognito sub for new user');
    return sub;
  }

  if (fieldName === 'userAdminSetPassword') {
    const { username, password } = args as { username: string; password: string };

    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: password,
        Permanent: true,
      }),
    );

    return 'ok';
  }

  if (fieldName === 'userAdminDelete') {
    const { username } = args as { username: string };

    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      }),
    );

    return 'ok';
  }

  throw new Error(`Unknown fieldName: ${fieldName}`);
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add amplify/functions/adminUserOps/handler.ts
git commit -m "feat: enforce admin role in adminUserOps Lambda via authorizer context"
```

---

## Task 7: Update photoOps Lambda

**Files:**
- Modify: `amplify/functions/photoOps/handler.ts`

- [ ] **Step 1: Add auth guard and switch to CloudFront URL**

Replace the entire file with:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { AppSyncResolverHandler } from 'aws-lambda';

const s3 = new S3Client({});
const BUCKET = process.env.PHOTO_BUCKET_NAME!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;

export const handler: AppSyncResolverHandler<
  { patientId: string; imageBase64: string; contentType: string },
  string
> = async (event) => {
  // Any authenticated user may upload a photo
  const identity = event.identity as { resolverContext?: { userId?: string } } | null;
  if (!identity?.resolverContext?.userId) {
    throw new Error('Unauthorized');
  }

  const { patientId, imageBase64, contentType } = event.arguments as {
    patientId: string;
    imageBase64: string;
    contentType: string;
  };

  const ext = contentType.split('/')[1] ?? 'jpg';
  const key = `patients/${patientId}/photo.${ext}`;
  const buffer = Buffer.from(imageBase64, 'base64');

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  // Return CloudFront URL — S3 bucket is now private
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add amplify/functions/photoOps/handler.ts
git commit -m "feat: photoOps returns CloudFront URL; adds auth guard"
```

---

## Task 8: Update AmplifyDataService

**Files:**
- Modify: `src/api/AmplifyDataService.ts`

- [ ] **Step 1: Rewrite AmplifyDataService.ts**

Replace the entire file with:

```typescript
import { generateClient } from 'aws-amplify/data';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource.ts';
import type { DataService, CreateUserInput, CreatePatientInput } from './DataService.ts';
import {
  type User,
  type Patient,
  type PatientWidget,
  type WidgetPermission,
  type WidgetConfig,
  type AuditLogEntry,
  type RoleDefinition,
  type WidgetType,
  type WidgetInputType,
  Role,
  WidgetType as WidgetTypeEnum,
} from '../types/index.ts';

// ─── Pagination helper ────────────────────────────────────────

async function listAll<T>(
  fetcher: (nextToken?: string) => Promise<{ data: T[]; nextToken?: string | null }>,
): Promise<T[]> {
  const results: T[] = [];
  let nextToken: string | undefined;
  do {
    const response = await fetcher(nextToken);
    results.push(...response.data);
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);
  return results;
}

// ─── Type mappers ─────────────────────────────────────────────

type UserRecord = Schema['UserRecord']['type'];
type PatientRecord = Schema['Patient']['type'];
type PatientWidgetRecord = Schema['PatientWidget']['type'];
type WidgetPermissionRecord = Schema['WidgetPermission']['type'];
type WidgetConfigRecord = Schema['WidgetConfig']['type'];
type AuditLogRecord = Schema['AuditLogEntry']['type'];
type RoleRecord = Schema['RoleDefinition']['type'];

function toUser(r: UserRecord): User {
  return { id: r.id, name: r.name, username: r.username, role: r.role };
}

function toPatient(r: PatientRecord): Patient {
  return {
    id: r.id,
    fullName: r.fullName,
    idNumber: r.idNumber,
    photoUrl: r.photoUrl,
    group: r.group,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender as 'male' | 'female',
  };
}

function toWidget(r: PatientWidgetRecord): PatientWidget {
  return {
    id: r.id,
    patientId: r.patientId,
    widgetType: r.widgetType as WidgetType,
    value: r.value,
    lastUpdated: r.lastUpdated,
    updatedBy: r.updatedBy,
  };
}

function toPermission(r: WidgetPermissionRecord): WidgetPermission {
  return {
    widgetType: r.widgetType as WidgetType,
    rolesAllowedToEdit: r.rolesAllowedToEdit as string[],
  };
}

function toWidgetConfig(r: WidgetConfigRecord): WidgetConfig {
  return {
    widgetType: r.widgetType as WidgetType,
    inputType: r.inputType as WidgetInputType,
    options: r.options as string[],
  };
}

function toAuditEntry(r: AuditLogRecord): AuditLogEntry {
  return {
    id: r.id,
    userId: r.userId,
    patientId: r.patientId,
    widgetType: r.widgetType as WidgetType,
    oldValue: r.oldValue,
    newValue: r.newValue,
    timestamp: r.timestamp,
  };
}

function toRoleDefinition(r: RoleRecord): RoleDefinition {
  return { id: r.roleId, label: r.label, isBuiltIn: r.isBuiltIn };
}

// ─── Service ──────────────────────────────────────────────────

export class AmplifyDataService implements DataService {
  private _client: ReturnType<typeof generateClient<Schema>> | null = null;

  private get client(): ReturnType<typeof generateClient<Schema>> {
    if (!this._client) {
      this._client = generateClient<Schema>({
        authMode: 'lambda',
        authToken: async () => {
          const session = await fetchAuthSession();
          return session.tokens?.idToken?.toString() ?? '';
        },
      });
    }
    return this._client;
  }

  // ─── Auth ──────────────────────────────────────────────────

  async login(username: string, password: string): Promise<User | null> {
    try {
      await signIn({ username, password });
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'UserAlreadyAuthenticatedException') {
        await signOut();
        try {
          await signIn({ username, password });
        } catch (retryError) {
          console.error('[Login] signIn retry failed:', retryError);
          return null;
        }
      } else {
        console.error('[Login] signIn failed:', error);
        return null;
      }
    }
    return this.getCurrentSession();
  }

  async getCurrentSession(): Promise<User | null> {
    try {
      const { userId } = await getCurrentUser();
      const { data } = await this.client.models.UserRecord.listUserRecordByCognitoId({
        cognitoId: userId,
      });
      const record = data[0];
      return record ? toUser(record) : null;
    } catch (error) {
      console.error('[getCurrentSession] failed:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    await signOut();
  }

  async getUserById(id: string): Promise<User | null> {
    const { data } = await this.client.models.UserRecord.get({ id });
    return data ? toUser(data) : null;
  }

  // ─── Patients ──────────────────────────────────────────────

  async searchPatients(query: string): Promise<Patient[]> {
    const q = query.trim();
    if (!q) return [];

    if (/^\d+$/.test(q)) {
      const { data } = await this.client.models.Patient.listPatientByIdNumber({ idNumber: q });
      return data.map(toPatient);
    }

    const all = await listAll((nextToken) =>
      this.client.models.Patient.list({
        filter: { fullName: { contains: q } },
        nextToken,
      }),
    );
    return all.map(toPatient);
  }

  async getPatientById(id: string): Promise<Patient | null> {
    const { data } = await this.client.models.Patient.get({ id });
    return data ? toPatient(data) : null;
  }

  // ─── Widgets ───────────────────────────────────────────────

  async getWidgetsForPatient(patientId: string): Promise<PatientWidget[]> {
    const { data } = await this.client.models.PatientWidget.listPatientWidgetByPatientId({ patientId });
    return data.map(toWidget);
  }

  // Permission check and audit log are now enforced server-side in updateWidgetOps Lambda.
  // _userId is kept in the signature to satisfy the DataService interface.
  async updateWidget(widgetId: string, newValue: string, _userId: string): Promise<PatientWidget> {
    const { data: updated, errors } = await this.client.mutations.updateWidget({ widgetId, newValue });
    if (errors && errors.length > 0) throw new Error(errors[0].message);
    if (!updated) throw new Error('Widget update failed');
    return toWidget(updated as unknown as PatientWidgetRecord);
  }

  // ─── Permissions ───────────────────────────────────────────

  async getWidgetPermissions(): Promise<WidgetPermission[]> {
    const all = await listAll((nextToken) =>
      this.client.models.WidgetPermission.list({ nextToken }),
    );
    return all.map(toPermission);
  }

  async canEditWidget(widgetType: WidgetType, userRole: string): Promise<boolean> {
    const { data } = await this.client.models.WidgetPermission.listWidgetPermissionByWidgetType({ widgetType });
    const perm = data[0];
    return perm ? (perm.rolesAllowedToEdit as string[]).includes(userRole) : false;
  }

  // ─── Audit ─────────────────────────────────────────────────

  async getAuditLog(patientId?: string): Promise<AuditLogEntry[]> {
    if (patientId) {
      const { data } = await this.client.models.AuditLogEntry.listAuditLogEntryByPatientId({ patientId });
      return data.map(toAuditEntry);
    }
    const all = await listAll((nextToken) =>
      this.client.models.AuditLogEntry.list({ nextToken }),
    );
    return all.map(toAuditEntry);
  }

  // ─── Admin — Users ─────────────────────────────────────────

  async getAllUsers(): Promise<User[]> {
    const all = await listAll((nextToken) =>
      this.client.models.UserRecord.list({ nextToken }),
    );
    return all.map(toUser);
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await this.client.models.UserRecord.listUserRecordByUsername({ username: input.username });
    if (existing.data.length > 0) throw new Error('שם המשתמש כבר קיים');

    const { data: cognitoIdData, errors } = await this.client.mutations.userAdminCreate({
      username: input.username,
      password: input.password,
      role: input.role,
    });
    if (errors && errors.length > 0) throw new Error(errors[0].message);
    const cognitoId = cognitoIdData;
    if (!cognitoId) throw new Error('Failed to create Cognito user');

    const { data } = await this.client.models.UserRecord.create({
      cognitoId,
      name: input.name,
      username: input.username,
      role: input.role,
    });
    if (!data) throw new Error('Failed to create user record');
    return toUser(data);
  }

  async updateUser(id: string, updates: Partial<CreateUserInput>): Promise<User> {
    const { data: existing } = await this.client.models.UserRecord.get({ id });
    if (!existing) throw new Error('משתמש לא נמצא');

    if (updates.username && updates.username !== existing.username) {
      const dup = await this.client.models.UserRecord.listUserRecordByUsername({ username: updates.username });
      if (dup.data.length > 0) throw new Error('שם המשתמש כבר קיים');
    }

    if (updates.password) {
      const { errors } = await this.client.mutations.userAdminSetPassword({
        username: existing.username,
        password: updates.password,
      });
      if (errors && errors.length > 0) throw new Error(errors[0].message);
    }

    const { data: updated } = await this.client.models.UserRecord.update({
      id,
      name: updates.name ?? existing.name,
      username: updates.username ?? existing.username,
      role: updates.role ?? existing.role,
    });
    if (!updated) throw new Error('Failed to update user');
    return toUser(updated);
  }

  async deleteUser(id: string): Promise<void> {
    const { data } = await this.client.models.UserRecord.get({ id });
    if (!data) throw new Error('משתמש לא נמצא');

    const { errors } = await this.client.mutations.userAdminDelete({ username: data.username });
    if (errors && errors.length > 0) throw new Error(errors[0].message);

    await this.client.models.UserRecord.delete({ id });
  }

  // ─── Photos ────────────────────────────────────────────────

  async uploadPatientPhoto(patientId: string, file: File): Promise<string> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const { data: url, errors } = await this.client.mutations.uploadPatientPhoto({
      patientId,
      imageBase64: base64,
      contentType: file.type || 'image/jpeg',
    });
    if (errors && errors.length > 0) throw new Error(errors[0].message);
    if (!url) throw new Error('Failed to upload photo');

    await this.client.models.Patient.update({ id: patientId, photoUrl: url });

    return url;
  }

  // ─── Admin — Patients ──────────────────────────────────────

  async getAllPatients(): Promise<Patient[]> {
    const all = await listAll((nextToken) =>
      this.client.models.Patient.list({ nextToken }),
    );
    return all.map(toPatient);
  }

  async createPatient(input: CreatePatientInput): Promise<Patient> {
    const existing = await this.client.models.Patient.listPatientByIdNumber({ idNumber: input.idNumber });
    if (existing.data.length > 0) throw new Error('מספר ת.ז כבר קיים במערכת');

    const { data: patient } = await this.client.models.Patient.create({
      fullName: input.fullName,
      idNumber: input.idNumber,
      photoUrl: input.photoUrl,
      group: input.group,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
    });
    if (!patient) throw new Error('Failed to create patient');

    const now = new Date().toISOString();
    const widgetTypes = Object.values(WidgetTypeEnum);
    await Promise.all(
      widgetTypes.map((wt) =>
        this.client.models.PatientWidget.create({
          patientId: patient.id,
          widgetType: wt,
          value: '',
          lastUpdated: now,
          updatedBy: '',
        }),
      ),
    );

    return toPatient(patient);
  }

  // ─── Admin — Permissions ───────────────────────────────────

  async updateWidgetPermissions(widgetType: WidgetType, rolesAllowedToEdit: string[]): Promise<WidgetPermission> {
    const { data: existing } = await this.client.models.WidgetPermission.listWidgetPermissionByWidgetType({ widgetType });
    const record = existing[0];
    if (!record) throw new Error('סוג ווידג\'ט לא נמצא');

    const { data: updated } = await this.client.models.WidgetPermission.update({
      id: record.id,
      rolesAllowedToEdit,
    });
    if (!updated) throw new Error('Failed to update permissions');
    return toPermission(updated);
  }

  // ─── Admin — Roles ─────────────────────────────────────────

  async getAllRoles(): Promise<RoleDefinition[]> {
    const all = await listAll((nextToken) =>
      this.client.models.RoleDefinition.list({ nextToken }),
    );
    return all.map(toRoleDefinition);
  }

  async createRole(id: string, label: string): Promise<RoleDefinition> {
    const existing = await this.client.models.RoleDefinition.listRoleDefinitionByRoleId({ roleId: id });
    if (existing.data.length > 0) throw new Error('מזהה התפקיד כבר קיים');

    const { data } = await this.client.models.RoleDefinition.create({ roleId: id, label, isBuiltIn: false });
    if (!data) throw new Error('Failed to create role');
    return toRoleDefinition(data);
  }

  async deleteRole(id: string): Promise<void> {
    const existing = await this.client.models.RoleDefinition.listRoleDefinitionByRoleId({ roleId: id });
    const record = existing.data[0];
    if (!record) throw new Error('תפקיד לא נמצא');
    if (record.isBuiltIn) throw new Error('לא ניתן למחוק תפקיד מובנה');

    const allPerms = await listAll((nextToken) =>
      this.client.models.WidgetPermission.list({ nextToken }),
    );
    await Promise.all(
      allPerms
        .filter((p) => (p.rolesAllowedToEdit as string[]).includes(id))
        .map((p) =>
          this.client.models.WidgetPermission.update({
            id: p.id,
            rolesAllowedToEdit: (p.rolesAllowedToEdit as string[]).filter((r) => r !== id),
          }),
        ),
    );

    const allUsers = await listAll((nextToken) =>
      this.client.models.UserRecord.list({ nextToken }),
    );
    await Promise.all(
      allUsers
        .filter((u) => u.role === id)
        .map((u) =>
          this.client.models.UserRecord.update({ id: u.id, role: Role.Caregiver }),
        ),
    );

    await this.client.models.RoleDefinition.delete({ id: record.id });
  }

  // ─── Admin — Widget Config ─────────────────────────────────

  async getWidgetConfigs(): Promise<WidgetConfig[]> {
    const all = await listAll((nextToken) =>
      this.client.models.WidgetConfig.list({ nextToken }),
    );
    return all.map(toWidgetConfig);
  }

  async updateWidgetConfig(widgetType: WidgetType, inputType: WidgetInputType, options: string[]): Promise<WidgetConfig> {
    const { data: existing } = await this.client.models.WidgetConfig.listWidgetConfigByWidgetType({ widgetType });
    const record = existing[0];
    if (!record) throw new Error('סוג ווידג\'ט לא נמצא');

    const { data: updated } = await this.client.models.WidgetConfig.update({
      id: record.id,
      inputType,
      options,
    });
    if (!updated) throw new Error('Failed to update widget config');
    return toWidgetConfig(updated);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/AmplifyDataService.ts
git commit -m "feat: switch AmplifyDataService to lambda auth mode; delegate widget update to server Lambda"
```

---

## Task 9: Fix Import Path Extensions Across src/

**Files:** All `src/` TypeScript and TSX files with relative imports.

Apply each change with `Edit` tool (or sed equivalent). Every relative import path gets an explicit `.ts` or `.tsx` extension. Third-party imports are unchanged.

- [ ] **Step 1: Fix src/api/index.ts**

Change:
```typescript
export { type DataService, type CreateUserInput, type CreatePatientInput } from './DataService';
export { MockDataService } from './MockDataService';
export { AmplifyDataService } from './AmplifyDataService';
```
To:
```typescript
export { type DataService, type CreateUserInput, type CreatePatientInput } from './DataService.ts';
export { MockDataService } from './MockDataService.ts';
export { AmplifyDataService } from './AmplifyDataService.ts';
```

- [ ] **Step 2: Fix src/api/MockDataService.ts**

Change all relative imports (lines 1–2) to use `.ts` extension. Replace `'./DataService'` → `'./DataService.ts'` and any `'../types'` → `'../types/index.ts'`.

- [ ] **Step 3: Fix src/context/AuthContext.tsx**

Change:
```typescript
import type { User, WidgetType, WidgetPermission } from '../types';
import type { DataService } from '../api/DataService';
```
To:
```typescript
import type { User, WidgetType, WidgetPermission } from '../types/index.ts';
import type { DataService } from '../api/DataService.ts';
```

- [ ] **Step 4: Fix src/context/DataContext.tsx**

Change:
```typescript
import type { DataService } from '../api/DataService';
```
To:
```typescript
import type { DataService } from '../api/DataService.ts';
```

- [ ] **Step 5: Fix src/utils/trafficLight.ts**

Change:
```typescript
import { WidgetType } from '../types';
```
To:
```typescript
import { WidgetType } from '../types/index.ts';
```

- [ ] **Step 6: Fix src/components/AdminRoute.tsx**

Change:
```typescript
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
```
To:
```typescript
import { useAuth } from '../context/AuthContext.tsx';
import { Role } from '../types/index.ts';
```

- [ ] **Step 7: Fix src/components/ProtectedRoute.tsx**

Change:
```typescript
import { useAuth } from '../context/AuthContext';
```
To:
```typescript
import { useAuth } from '../context/AuthContext.tsx';
```

- [ ] **Step 8: Fix src/components/WidgetCard.tsx**

Change:
```typescript
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { PatientWidget, WidgetConfig } from '../types';
import { WIDGET_META, WIDGET_EMPTY_LABEL } from '../types';
import { getTrafficLight } from '../utils/trafficLight';
```
To:
```typescript
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import type { PatientWidget, WidgetConfig } from '../types/index.ts';
import { WIDGET_META, WIDGET_EMPTY_LABEL } from '../types/index.ts';
import { getTrafficLight } from '../utils/trafficLight.ts';
```

- [ ] **Step 9: Fix src/components/EventLogCard.tsx**

Change:
```typescript
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { PatientWidget, EventLogEntry } from '../types';
import { WIDGET_META, WidgetType, parseEventLog } from '../types';
```
To:
```typescript
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import type { PatientWidget, EventLogEntry } from '../types/index.ts';
import { WIDGET_META, WidgetType, parseEventLog } from '../types/index.ts';
```

- [ ] **Step 10: Fix src/components/admin/PatientForm.tsx**

Change:
```typescript
import { useData } from '../../context/DataContext';
```
To:
```typescript
import { useData } from '../../context/DataContext.tsx';
```

- [ ] **Step 11: Fix src/components/admin/PermissionsManager.tsx**

Change:
```typescript
import { useData } from '../../context/DataContext';
import type { WidgetPermission, RoleDefinition } from '../../types';
import { WidgetType, WIDGET_META } from '../../types';
```
To:
```typescript
import { useData } from '../../context/DataContext.tsx';
import type { WidgetPermission, RoleDefinition } from '../../types/index.ts';
import { WidgetType, WIDGET_META } from '../../types/index.ts';
```

- [ ] **Step 12: Fix src/components/admin/RoleManagement.tsx**

Change:
```typescript
import { useData } from '../../context/DataContext';
import type { RoleDefinition } from '../../types';
```
To:
```typescript
import { useData } from '../../context/DataContext.tsx';
import type { RoleDefinition } from '../../types/index.ts';
```

- [ ] **Step 13: Fix src/components/admin/UserManagement.tsx**

Change:
```typescript
import { useData } from '../../context/DataContext';
import type { User, RoleDefinition } from '../../types';
```
To:
```typescript
import { useData } from '../../context/DataContext.tsx';
import type { User, RoleDefinition } from '../../types/index.ts';
```

- [ ] **Step 14: Fix src/components/admin/WidgetConfigManager.tsx**

Change:
```typescript
import { useData } from '../../context/DataContext';
import type { WidgetConfig, WidgetInputType } from '../../types';
import { WidgetType, WIDGET_META } from '../../types';
```
To:
```typescript
import { useData } from '../../context/DataContext.tsx';
import type { WidgetConfig, WidgetInputType } from '../../types/index.ts';
import { WidgetType, WIDGET_META } from '../../types/index.ts';
```

- [ ] **Step 15: Fix src/pages/LoginPage.tsx**

Change:
```typescript
import { useAuth } from '../context/AuthContext';
```
To:
```typescript
import { useAuth } from '../context/AuthContext.tsx';
```

- [ ] **Step 16: Fix src/pages/SearchPage.tsx**

Change:
```typescript
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Patient } from '../types';
import { Role, ROLE_LABELS } from '../types';
```
To:
```typescript
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { Patient } from '../types/index.ts';
import { Role, ROLE_LABELS } from '../types/index.ts';
```

- [ ] **Step 17: Fix src/pages/PatientPage.tsx**

Change:
```typescript
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Patient, PatientWidget } from '../types';
import { Role, WIDGET_META, ROLE_LABELS, WidgetType } from '../types';
import WidgetCard from '../components/WidgetCard';
import EventLogCard from '../components/EventLogCard';
```
To:
```typescript
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { Patient, PatientWidget } from '../types/index.ts';
import { Role, WIDGET_META, ROLE_LABELS, WidgetType } from '../types/index.ts';
import WidgetCard from '../components/WidgetCard.tsx';
import EventLogCard from '../components/EventLogCard.tsx';
```

- [ ] **Step 18: Fix src/pages/ConfirmPage.tsx**

Change:
```typescript
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import type { Patient } from '../types';
import { Role } from '../types';
```
To:
```typescript
import { useData } from '../context/DataContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import type { Patient } from '../types/index.ts';
import { Role } from '../types/index.ts';
```

- [ ] **Step 19: Fix src/pages/AdminPage.tsx**

Change:
```typescript
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import UserManagement from '../components/admin/UserManagement';
import PatientForm from '../components/admin/PatientForm';
import PermissionsManager from '../components/admin/PermissionsManager';
import RoleManagement from '../components/admin/RoleManagement';
import WidgetConfigManager from '../components/admin/WidgetConfigManager';
```
To:
```typescript
import { useAuth } from '../context/AuthContext.tsx';
import { ROLE_LABELS } from '../types/index.ts';
import UserManagement from '../components/admin/UserManagement.tsx';
import PatientForm from '../components/admin/PatientForm.tsx';
import PermissionsManager from '../components/admin/PermissionsManager.tsx';
import RoleManagement from '../components/admin/RoleManagement.tsx';
import WidgetConfigManager from '../components/admin/WidgetConfigManager.tsx';
```

- [ ] **Step 20: Fix src/App.tsx**

Change:
```typescript
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AmplifyDataService } from './api';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import ConfirmPage from './pages/ConfirmPage';
import PatientPage from './pages/PatientPage';
import AdminPage from './pages/AdminPage';
```
To:
```typescript
import { AuthProvider } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { AmplifyDataService } from './api/index.ts';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import AdminRoute from './components/AdminRoute.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SearchPage from './pages/SearchPage.tsx';
import ConfirmPage from './pages/ConfirmPage.tsx';
import PatientPage from './pages/PatientPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
```

- [ ] **Step 21: Fix src/main.tsx**

Change:
```typescript
import App from './App';
```
To:
```typescript
import App from './App.tsx';
```

- [ ] **Step 22: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 23: Commit**

```bash
git add src/
git commit -m "chore: add .ts/.tsx extensions to all relative imports in src/"
```

---

## Task 10: Fix PWA Configuration

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Re-enable VitePWA with corrected config**

Replace the entire file with:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
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
          // Two separate entries required — 'any maskable' as a single string is invalid
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        // Required for React Router — serve index.html for all navigation requests
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache patient photos served from CloudFront
            urlPattern: ({ url }: { url: URL }) => url.hostname.endsWith('.cloudfront.net'),
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'patient-photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
```

- [ ] **Step 2: Build and verify manifest is generated**

```bash
npm run build
```

Expected: build succeeds. Check `dist/manifest.webmanifest` exists and contains valid JSON with two icon entries (purpose `any` and `maskable` separately). If `vite-plugin-pwa@1.2.0` throws a Vite 8 compatibility error, update it first:

```bash
npm install vite-plugin-pwa@latest
npm run build
```

- [ ] **Step 3: Check manifest content**

```bash
cat dist/manifest.webmanifest
```

Expected: JSON with `"name": "ICare — ניהול דיירים"`, `"display": "standalone"`, two icon objects each with a single `purpose` string.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts package.json package-lock.json
git commit -m "feat: re-enable PWA — fix icon purpose split, add CloudFront photo cache, navigateFallback"
```

---

## Task 11: Photo URL Migration Script

**Files:**
- Create: `scripts/migratePhotoUrls.ts`

This script rewrites all `Patient.photoUrl` values in DynamoDB from direct S3 URLs to CloudFront URLs. Run it **once** after the first deployment with CloudFront enabled.

- [ ] **Step 1: Create scripts/migratePhotoUrls.ts**

```typescript
/**
 * One-time migration: rewrite Patient.photoUrl from S3 direct URLs to CloudFront URLs.
 *
 * Usage:
 *   CLOUDFRONT_DOMAIN=<domain> PATIENT_TABLE=<table> AWS_REGION=<region> npx tsx scripts/migratePhotoUrls.ts
 *
 * The PATIENT_TABLE and CLOUDFRONT_DOMAIN values are printed by `amplify generate outputs`
 * and are also available in amplify_outputs.json under custom.cloudfrontDomain and
 * from the AWS Console (DynamoDB table name for the Patient model).
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const PATIENT_TABLE = process.env.PATIENT_TABLE;

if (!CLOUDFRONT_DOMAIN || !PATIENT_TABLE) {
  console.error('Error: CLOUDFRONT_DOMAIN and PATIENT_TABLE env vars are required');
  process.exit(1);
}

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' }),
);

async function migrate(): Promise<void> {
  console.log(`Migrating Patient.photoUrl → CloudFront domain: ${CLOUDFRONT_DOMAIN}`);

  let scanned = 0;
  let updated = 0;
  let nextToken: Record<string, unknown> | undefined;

  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: PATIENT_TABLE,
        ExclusiveStartKey: nextToken,
      }),
    );

    for (const item of result.Items ?? []) {
      scanned++;
      const photoUrl = item['photoUrl'] as string | undefined;
      if (!photoUrl) continue;

      // Match direct S3 URLs: https://<bucket>.s3.<region>.amazonaws.com/<key>
      const s3Match = photoUrl.match(/^https:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com\/(.+)$/);
      if (!s3Match) continue;

      const key = s3Match[1];
      const newUrl = `https://${CLOUDFRONT_DOMAIN}/${key}`;

      await dynamo.send(
        new UpdateCommand({
          TableName: PATIENT_TABLE,
          Key: { id: item['id'] },
          UpdateExpression: 'SET photoUrl = :url, updatedAt = :ua',
          ExpressionAttributeValues: { ':url': newUrl, ':ua': new Date().toISOString() },
        }),
      );

      console.log(`  Updated ${item['id']}: ${photoUrl} → ${newUrl}`);
      updated++;
    }

    nextToken = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (nextToken);

  console.log(`Done. Scanned ${scanned} patients, updated ${updated} photo URLs.`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors (the script is compiled as part of the project's tsconfig).

- [ ] **Step 3: Commit**

```bash
git add scripts/migratePhotoUrls.ts
git commit -m "chore: add one-time photo URL migration script (S3 direct → CloudFront)"
```

---

## Task 12: Update amplify_outputs.example.json

**Files:**
- Modify: `amplify_outputs.example.json`

- [ ] **Step 1: Update the example outputs to reflect new auth mode**

Replace the entire file with:

```json
{
  "$schema": "https://raw.githubusercontent.com/aws-amplify/amplify-backend/main/packages/client-config/src/client-config-schema/schema_v1.json",
  "version": "1.4",
  "data": {
    "url": "REPLACE_WITH_APPSYNC_URL",
    "aws_region": "REPLACE_WITH_REGION",
    "default_authorization_type": "AWS_LAMBDA",
    "authorization_types": [],
    "model_introspection": {}
  },
  "custom": {
    "userPoolId": "REPLACE_WITH_USER_POOL_ID",
    "userPoolClientId": "REPLACE_WITH_USER_POOL_CLIENT_ID",
    "region": "REPLACE_WITH_REGION",
    "photoBucketName": "REPLACE_WITH_BUCKET_NAME",
    "cloudfrontDomain": "REPLACE_WITH_CLOUDFRONT_DOMAIN"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add amplify_outputs.example.json
git commit -m "docs: update amplify_outputs.example.json — remove API key, add CloudFront domain"
```

---

## Verification Checklist

After all tasks complete, verify the following manually after deploying to Amplify:

- [ ] Unauthenticated AppSync call (e.g., via curl with no Authorization header) returns 401
- [ ] Login with valid credentials succeeds and populates the resident list
- [ ] A caregiver cannot edit a medical widget (permission denied error visible in console/UI)
- [ ] Patient photo loads via CloudFront URL (`*.cloudfront.net`), not direct S3 URL
- [ ] Attempting to fetch the S3 photo URL directly returns 403 Access Denied
- [ ] The app installs as a PWA (Chrome: address bar shows install icon; mobile: "Add to Home Screen" prompt appears)
- [ ] Admin can create/delete users from the admin panel
- [ ] Audit log entries are created after each widget edit
- [ ] Run migration script: `CLOUDFRONT_DOMAIN=<domain> PATIENT_TABLE=<table> npx tsx scripts/migratePhotoUrls.ts`
