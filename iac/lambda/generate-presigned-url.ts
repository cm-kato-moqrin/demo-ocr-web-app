import { Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME ?? '';
const URL_EXPIRATION_SECONDS = 180;

interface RequestEvent {
    body: string;
}

export const handler = async (event: RequestEvent, context: Context) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const fileName = body.fileName;
        const fileType = body.fileType;

        if (!(fileName && fileType)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'fileName and fileType are required' })
            };
        }

        const key = `uploads/${Date.now()}-${fileName}`;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: fileType
        });

        const presignedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: URL_EXPIRATION_SECONDS
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                uploadUrl: presignedUrl,
                key: key
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate pre-signed URL' })
        };
    }
};