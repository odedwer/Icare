import { defineFunction } from '@aws-amplify/backend';

export const photoOps = defineFunction({
  name: 'photo-ops',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
