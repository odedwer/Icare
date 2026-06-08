/**
 * One-off script: remove duplicate UserRecord entries, keeping the most recently updated one per username.
 *
 *   npx tsx scripts/dedup-user-records.ts
 */
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
const client = generateClient<Schema>({ authMode: 'apiKey' });

async function main() {
  const { data: records, errors } = await client.models.UserRecord.list();
  if (errors?.length) { console.error(errors); process.exit(1); }

  // Group by username
  const byUsername = new Map<string, typeof records>();
  for (const r of records) {
    const group = byUsername.get(r.username) ?? [];
    group.push(r);
    byUsername.set(r.username, group);
  }

  for (const [username, group] of byUsername) {
    if (group.length <= 1) {
      console.log(`  ✓ ${username} — no duplicates`);
      continue;
    }
    // Keep the one with the latest updatedAt
    group.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    const [keep, ...dupes] = group;
    console.log(`  ${username}: keeping ${keep.id} (${keep.updatedAt}), deleting ${dupes.length} duplicate(s)`);
    for (const dupe of dupes) {
      const { errors: delErrors } = await client.models.UserRecord.delete({ id: dupe.id });
      if (delErrors?.length) console.error(`    ✗ failed to delete ${dupe.id}:`, delErrors);
      else console.log(`    deleted ${dupe.id}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
