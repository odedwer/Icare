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
