import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケットの作成
    const bucket = new s3.Bucket(this, 'DemoBucket', {
      bucketName: 'IMAGE_UPLOAD_BUCKET',
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.GET,
          ],
          allowedOrigins: ['*'], // 本番環境では適切なオリジンを設定します
          allowedHeaders: ['*'], // 本番環境では適切なヘッダを設定します
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // テスト用のため
      autoDeleteObjects: true, // テスト用のため
    });


    const textractFunction = new nodeLambda.NodejsFunction(this, 'TextractFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      memorySize: 256,
      entry: path.join(__dirname, '../lambda/textract.ts'),
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    textractFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['textract:AnalyzeDocument'],
        resources: ['*'],
      })
    );

    const textractFunctionUrl = textractFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'], // 本番環境では適切なオリジンを設定します
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['content-type'],
      },
    });

    bucket.grantRead(textractFunction);

    const presignedUrlFunction = new nodeLambda.NodejsFunction(this, 'PresignedUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/generate-presigned-url.ts'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    const presignedUrlFunctionUrl = presignedUrlFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // テスト用のため認証なし
      cors: {
        allowedOrigins: ['*'], // 本番環境では適切なオリジンを設定します
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ['content-type'],
      },
    });

    bucket.grantPut(presignedUrlFunction);
    bucket.grantPutAcl(presignedUrlFunction);

    new cdk.CfnOutput(this, 'TextractFunctionUrl', {
      value: textractFunctionUrl.url,
      description: 'URL for the Textract function',
    });

    new cdk.CfnOutput(this, 'UploadFunctionUrl', {
      value: presignedUrlFunctionUrl.url,
      description: 'URL for the presigned URL generator function',
    });
  }
}
