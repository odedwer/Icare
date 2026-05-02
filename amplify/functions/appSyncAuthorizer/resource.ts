import { defineFunction } from '@aws-amplify/backend';

export const appSyncAuthorizer = defineFunction({
  name: 'appsync-authorizer',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
