import { defineFunction } from '@aws-amplify/backend';

export const updateWidgetOps = defineFunction({
  name: 'update-widget-ops',
  entry: './handler.ts',
  timeoutSeconds: 15,
});
