/**
 * One-off script: sync UserRecord.cognitoId with the current Cognito sub for each user.
 * Needed after a Cognito user was deleted and recreated (new sub assigned).
 *
 *   npx tsx scripts/sync-cognito-ids.ts
 */
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);

const custom = (outputs as any).custom as { userPoolId?: string; region?: string } | undefined;
const userPoolId = ((outputs as any).auth?.user_pool_id ?? custom?.userPoolId) as string;
const region = ((outputs as any).auth?.aws_region ?? custom?.region ?? 'us-east-1') as string;

const cognito = new CognitoIdentityProviderClient({ region });
const client = generateClient<Schema>({ authMode: 'apiKey' });

async function getCognitoSub(username: string): Promise<string> {
  const res = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
  const sub = res.UserAttributes?.find((a) => a.Name === 'sub')?.Value;
  if (!sub) throw new Error(`No sub found for ${username}`);
  return sub;
}

async function main() {
  // List all UserRecords
  const { data: records, errors } = await client.models.UserRecord.list();
  if (errors?.length) { console.error(errors); process.exit(1); }

  for (const record of records) {
    let currentSub: string;
    try {
      currentSub = await getCognitoSub(record.username);
    } catch (e) {
      console.warn(`  Skipping ${record.username}: not found in Cognito`);
      continue;
    }

    if (record.cognitoId === currentSub) {
      console.log(`  ✓ ${record.username} — cognitoId already in sync`);
      continue;
    }

    const { errors: updateErrors } = await client.models.UserRecord.update({
      id: record.id,
      cognitoId: currentSub,
    });
    if (updateErrors?.length) {
      console.error(`  ✗ ${record.username}:`, updateErrors);
    } else {
      console.log(`  ✓ ${record.username} — updated ${record.cognitoId} → ${currentSub}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
