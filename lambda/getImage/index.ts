import {
  APIGatewayProxyEventV2,
  Context,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { S3 } from 'aws-sdk';

const s3 = new S3();
const bucketName = process.env.IMAGE_PHOTO_BUCKET_NAME;

async function createUrl(object: S3.Object): Promise<{ filename: string; url: string }> {
  const url = await s3.getSignedUrlPromise('getObject', {
    Bucket: bucketName,
    Key: object.Key!,
    Expires: 24 * 60 * 60,
  });
  return {
    filename: object.Key!,
    url,
  };
}

async function getImage(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2> {

  try {
    const params = {
      Bucket: bucketName!
    }
    const { Contents: results } = await s3.listObjects(params).promise();
    const photos = await Promise.all(
      results!.map((result) => createUrl(result))
    );
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(photos),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: error?.message,
    };
  }
}

export { getImage };