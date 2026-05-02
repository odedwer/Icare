import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { AppSyncResolverHandler } from 'aws-lambda';

const s3 = new S3Client({});
const BUCKET = process.env.PHOTO_BUCKET_NAME!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;

export const handler: AppSyncResolverHandler<
  { patientId: string; imageBase64: string; contentType: string },
  string
> = async (event) => {
  // Any authenticated user may upload a photo
  const identity = event.identity as { resolverContext?: { userId?: string } } | null;
  if (!identity?.resolverContext?.userId) {
    throw new Error('Unauthorized');
  }

  const { patientId, imageBase64, contentType } = event.arguments as {
    patientId: string;
    imageBase64: string;
    contentType: string;
  };

  const ext = contentType.split('/')[1] ?? 'jpg';
  const key = `patients/${patientId}/photo.${ext}`;
  const buffer = Buffer.from(imageBase64, 'base64');

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  // Return CloudFront URL — S3 bucket is now private
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
};
