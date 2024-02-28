import * as cdk from 'aws-cdk-lib';
import { WebAppStack } from '../lib/web_app-stack';

const app = new cdk.App();
new WebAppStack(app, 'WebAppStack', {
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});