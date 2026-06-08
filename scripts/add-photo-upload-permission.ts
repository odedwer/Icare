/**
 * One-off script: upsert the photo_upload WidgetPermission entry.
 * Safe to run on a live database — skips if the entry already exists.
 *
 *   npx tsx scripts/add-photo-upload-permission.ts
 */
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

async function main() {
  // Check whether it already exists
  const { data: existing } = await client.models.WidgetPermission.list();
  const alreadyExists = existing.some((p) => p.widgetType === 'photo_upload');

  if (alreadyExists) {
    console.log('photo_upload permission already exists — nothing to do.');
    return;
  }

  const { data, errors } = await client.models.WidgetPermission.create({
    widgetType: 'photo_upload',
    rolesAllowedToEdit: ['admin', 'head_nurse'],
  });

  if (errors && errors.length > 0) {
    console.error('Failed to create permission:', errors);
    process.exit(1);
  }

  console.log('✓ Created photo_upload permission:', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
