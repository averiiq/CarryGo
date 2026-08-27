import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { CarryGoStackConfig } from './config';

interface CarryGoCoreStackProps extends cdk.StackProps {
  config: CarryGoStackConfig;
}

export class CarryGoCoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CarryGoCoreStackProps) {
    super(scope, id, props);

    const { config } = props;
    const isProd = config.stage === 'prod';
    const prefix = `${config.projectName}-${config.stage}`;

    cdk.Tags.of(this).add('Project', config.projectName);
    cdk.Tags.of(this).add('Environment', config.stage);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Component', 'core-stack');

    const webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `${prefix}-web-${this.account}-${this.region}`.toLowerCase(),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `${prefix}-uploads-${this.account}-${this.region}`.toLowerCase(),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedOrigins: config.allowedOrigins,
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
        },
      ],
      versioned: true,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${prefix}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('MobileAndWebClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    const coreTable = new dynamodb.Table(this, 'CoreTable', {
      tableName: `${prefix}-core-table`,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    coreTable.addGlobalSecondaryIndex({
      indexName: 'gsi2',
      partitionKey: { name: 'gsi2pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi2sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const dlq = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `${prefix}-jobs-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    const asyncQueue = new sqs.Queue(this, 'AsyncQueue', {
      queueName: `${prefix}-jobs`,
      visibilityTimeout: cdk.Duration.seconds(90),
      retentionPeriod: cdk.Duration.days(4),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: dlq,
      },
    });

    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `${prefix}-notifications`,
      displayName: `CarryGo ${config.stage} notifications`,
    });

    const eventBus = new events.EventBus(this, 'DomainEventsBus', {
      eventBusName: `${prefix}-domain-events`,
    });

    const appLambda = new lambdaNodejs.NodejsFunction(this, 'AppLambda', {
      functionName: `${prefix}-app`,
      entry: path.join(__dirname, '../../backend/src/lambda.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        APP_ENV: config.stage,
        CORE_TABLE_NAME: coreTable.tableName,
        UPLOADS_BUCKET_NAME: uploadsBucket.bucketName,
        ASYNC_QUEUE_URL: asyncQueue.queueUrl,
        NOTIFICATIONS_TOPIC_ARN: notificationTopic.topicArn,
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    const workerLambda = new lambdaNodejs.NodejsFunction(this, 'WorkerLambda', {
      functionName: `${prefix}-worker`,
      entry: path.join(__dirname, '../../backend/src/lambda.ts'),
      handler: 'workerHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        APP_ENV: config.stage,
        CORE_TABLE_NAME: coreTable.tableName,
        UPLOADS_BUCKET_NAME: uploadsBucket.bucketName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    const scheduledJobsLambda = new lambdaNodejs.NodejsFunction(this, 'ScheduledJobsLambda', {
      functionName: `${prefix}-scheduler`,
      entry: path.join(__dirname, '../../backend/src/lambda.ts'),
      handler: 'scheduledHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        APP_ENV: config.stage,
        CORE_TABLE_NAME: coreTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    coreTable.grantReadWriteData(appLambda);
    coreTable.grantReadWriteData(workerLambda);
    coreTable.grantReadWriteData(scheduledJobsLambda);

    uploadsBucket.grantReadWrite(appLambda);
    uploadsBucket.grantReadWrite(workerLambda);

    asyncQueue.grantSendMessages(appLambda);
    asyncQueue.grantConsumeMessages(workerLambda);

    notificationTopic.grantPublish(appLambda);
    eventBus.grantPutEventsTo(appLambda);

    appLambda.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'AllowXRayAccess',
        effect: iam.Effect.ALLOW,
        actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
        resources: ['*'],
      }),
    );

    const appIntegration = new HttpLambdaIntegration('AppIntegration', appLambda);

    const jwtAuthorizer = new HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      },
    );

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: `${prefix}-api`,
      corsPreflight: {
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: config.allowedOrigins,
        allowHeaders: ['authorization', 'content-type', 'idempotency-key'],
        maxAge: cdk.Duration.days(1),
      },
    });

    httpApi.addRoutes({
      path: '/health',
      methods: [apigwv2.HttpMethod.GET],
      integration: appIntegration,
    });

    httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: appIntegration,
      authorizer: jwtAuthorizer,
    });

    workerLambda.addEventSourceMapping('QueueSourceMapping', {
      eventSourceArn: asyncQueue.queueArn,
      batchSize: 10,
      enabled: true,
    });

    new events.Rule(this, 'EveryFiveMinutes', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(scheduledJobsLambda)],
    });

    const apiDomain = cdk.Fn.select(2, cdk.Fn.split('/', httpApi.apiEndpoint));

    const distributionCustomDomain =
      config.cloudFrontAliases.length > 0 && config.cloudFrontCertificateArn
        ? {
            domainNames: config.cloudFrontAliases,
            certificate: certificatemanager.Certificate.fromCertificateArn(
              this,
              'CloudFrontCertificate',
              config.cloudFrontCertificateArn,
            ),
          }
        : {};

    const distributionProps: cloudfront.DistributionProps = {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        'api/*': {
          origin: new origins.HttpOrigin(apiDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      ...distributionCustomDomain,
    };

    const distribution = new cloudfront.Distribution(this, 'WebDistribution', distributionProps);

    if (config.hostedZoneName && config.cloudFrontAliases.length > 0) {
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: config.hostedZoneName,
      });

      for (const alias of config.cloudFrontAliases) {
        new route53.ARecord(this, `AliasRecord-${alias.replace(/\./g, '-')}`, {
          zone: hostedZone,
          recordName: alias,
          target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
        });
      }
    }

    if (config.sesSenderDomain) {
      new ses.EmailIdentity(this, 'SenderIdentity', {
        identity: ses.Identity.publicHostedZone(
          route53.HostedZone.fromLookup(this, 'SesZone', {
            domainName: config.sesSenderDomain,
          }),
        ),
      });
    }

    const trail = new cloudtrail.Trail(this, 'CloudTrail', {
      trailName: `${prefix}-audit-trail`,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      managementEvents: cloudtrail.ReadWriteType.ALL,
      sendToCloudWatchLogs: true,
    });

    trail.addS3EventSelector(
      [
        {
          bucket: webBucket,
        },
        {
          bucket: uploadsBucket,
        },
      ],
      {
        readWriteType: cloudtrail.ReadWriteType.ALL,
      },
    );

    new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: `${prefix}-api-5xx`,
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5xx',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ApiId: httpApi.apiId,
          Stage: '$default',
        },
      }),
    });

    new cloudwatch.Alarm(this, 'AppLambdaErrorsAlarm', {
      alarmName: `${prefix}-app-lambda-errors`,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      metric: appLambda.metricErrors({
        period: cdk.Duration.minutes(5),
      }),
    });

    new cloudwatch.Alarm(this, 'QueueDepthAlarm', {
      alarmName: `${prefix}-jobs-queue-depth`,
      threshold: 100,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      metric: asyncQueue.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
      }),
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.apiEndpoint,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'DynamoTableName', {
      value: coreTable.tableName,
    });

    new cdk.CfnOutput(this, 'UploadsBucketName', {
      value: uploadsBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'AsyncQueueName', {
      value: asyncQueue.queueName,
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
    });

    new cdk.CfnOutput(this, 'EventBusName', {
      value: eventBus.eventBusName,
    });
  }
}
