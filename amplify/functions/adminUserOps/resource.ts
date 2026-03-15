import { defineFunction } from '@aws-amplify/backend';

export const adminUserOps = defineFunction({
  name: 'admin-user-ops',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
