#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CarryGoCoreStack } from '../lib/carrygo-core-stack';
import { loadStackConfig } from '../lib/config';

const app = new cdk.App();
const config = loadStackConfig(app);

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION ?? 'ap-south-1';

new CarryGoCoreStack(app, `${config.projectName}-${config.stage}-core`, {
  env: {
    account,
    region,
  },
  config,
});

