import { defineBackend } from '@aws-amplify/backend';
import { CfnOutput } from 'aws-cdk-lib';
import { UserPool, UserPoolClient, AccountRecovery } from 'aws-cdk-lib/aws-cognito';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import type { IConstruct } from 'constructs';
import { data } from './data/resource.ts';

const backend = defineBackend({ data });

// Create Cognito User Pool via CDK directly — pure username/password, no email required.
// We intentionally bypass defineAuth, which enforces email or phone as a required attribute.
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

// Write User Pool config into amplify_outputs.json via the 'custom' key.
// We intentionally avoid backend.addOutput({ auth: ... }) — it triggers Amplify to attach
// Cognito auth to the AppSync API, causing a duplicate 'awsAppsyncApiId' construct error.
backend.addOutput({
  custom: {
    userPoolId: userPool.userPoolId,
    userPoolClientId: userPoolClient.userPoolClientId,
    region: authStack.region,
  },
});

// The adminUserOps Lambda lives inside the data construct (referenced via a.handler.function()).
// Amplify doesn't expose it through resources.functions when auth is not in defineBackend,
// so we locate it by traversing the CDK construct tree.
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
    throw new Error(`Lambda matching '${nameFragment}' not found.\nAvailable Lambdas:\n${available.join('\n')}`);
  }
  return match;
}

// Search from the CDK app root — the Lambda lives in its own stack, not the data stack.
const cdkApp = backend.data.resources.graphqlApi.stack.node.root;
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
