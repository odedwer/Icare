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
