import * as cdk from 'aws-cdk-lib';

export interface CarryGoStackConfig {
  projectName: string;
  stage: string;
  allowedOrigins: string[];
  cloudFrontAliases: string[];
  cloudFrontCertificateArn?: string;
  hostedZoneName?: string;
  sesSenderDomain?: string;
}

const parseCsv = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const loadStackConfig = (app: cdk.App): CarryGoStackConfig => {
  const projectName =
    app.node.tryGetContext('projectName') ??
    process.env.CARRYGO_PROJECT_NAME ??
    'carrygo';
  const stage = app.node.tryGetContext('stage') ?? process.env.CARRYGO_STAGE ?? 'dev';

  const allowedOriginsRaw =
    app.node.tryGetContext('allowedOrigins') ?? process.env.CARRYGO_ALLOWED_ORIGINS ?? '*';
  const aliasesRaw =
    app.node.tryGetContext('cloudFrontAliases') ?? process.env.CARRYGO_CLOUDFRONT_ALIASES;

  const cloudFrontCertificateArn =
    app.node.tryGetContext('cloudFrontCertificateArn') ??
    process.env.CARRYGO_CLOUDFRONT_CERT_ARN;

  const hostedZoneName =
    app.node.tryGetContext('hostedZoneName') ?? process.env.CARRYGO_HOSTED_ZONE_NAME;

  const sesSenderDomain =
    app.node.tryGetContext('sesSenderDomain') ?? process.env.CARRYGO_SES_SENDER_DOMAIN;

  return {
    projectName,
    stage,
    allowedOrigins: parseCsv(allowedOriginsRaw),
    cloudFrontAliases: parseCsv(aliasesRaw),
    cloudFrontCertificateArn,
    hostedZoneName,
    sesSenderDomain,
  };
};

