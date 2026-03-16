import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { AppSyncResolverHandler } from 'aws-lambda';

const s3 = new S3Client({});
const BUCKET = process.env.PHOTO_BUCKET_NAME!;
const REGION = process.env.AWS_REGION ?? 'us-east-1';

export const handler: AppSyncResolverHandler<
  { patientId: string; imageBase64: string; contentType: string },
  string
> = async (event) => {
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

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
};
