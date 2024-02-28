import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CloudFrontWebDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

import * as _lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';
import { HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class WebAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const imgBucket = new Bucket(this, 'ImageBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, 'WebPictureDeployment', {
      sources: [Source.asset(path.join(__dirname, '..', 'picture'))],
      destinationBucket: imgBucket
    });

    const reactBucket = new Bucket(this, 'ReactBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
      publicReadAccess: true
    });

    const distribution = new CloudFrontWebDistribution(this, 'cloudfront', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: reactBucket,
          },
          behaviors: [{
            isDefaultBehavior: true
          }]
        }
      ]
    });

    new BucketDeployment(this, 'reactDeployment', {
      sources: [Source.asset(path.join(__dirname, '..', 'react', 'image-display-app', 'build'))],
      destinationBucket: reactBucket,
      distribution: distribution
    });

    const getImage = new _lambda.NodejsFunction(this, 'getImageLambda', {
      runtime: Runtime.NODEJS_16_X,
      entry: path.join(__dirname, '..', 'lambda', 'getImage', 'index.ts'),
      handler: 'getImage',
      environment: {
        IMAGE_PHOTO_BUCKET_NAME: imgBucket.bucketName,
      },
    });

    const bucketListPermissions = new PolicyStatement();
    bucketListPermissions.addResources(imgBucket.bucketArn);
    bucketListPermissions.addActions('s3:ListBucket');

    const bucketObjectPermissions = new PolicyStatement();
    bucketObjectPermissions.addResources(`${imgBucket.bucketArn}/*`);
    bucketObjectPermissions.addActions('s3:GetObject', 's3:PutObject');

    getImage.addToRolePolicy(bucketObjectPermissions);
    getImage.addToRolePolicy(bucketListPermissions);

    const api = new apigateway.RestApi(this, 'GetImageApi', {
      restApiName: 'GetImageApi',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: [HttpMethod.GET],
      },
    });

    const integration = new apigateway.LambdaIntegration(getImage);
    const resource = api.root.addResource('image');
    resource.addMethod('GET', integration);

    const imgBucketOutput = 'ImageBucketNameExport';
    new CfnOutput(this, imgBucketOutput, {
      value: imgBucket.bucketName,
      exportName: imgBucketOutput,
    });

    const reactBucketOutput = 'ReactBucketNameExport';
    new CfnOutput(this, reactBucketOutput, {
      value: reactBucket.bucketName,
      exportName: reactBucketOutput,
    });

    const apiOutput = 'ApiEndpointExport';
    new CfnOutput(this, apiOutput, {
      value: api.url,
      exportName: apiOutput,
    });

    const reactURLOutput = 'ReactURLExport';
    new CfnOutput(this, reactURLOutput, {
      value: distribution.distributionDomainName,
      exportName: reactURLOutput,
    });
  }
}
