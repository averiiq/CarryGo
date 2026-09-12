import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../../lib/dynamo';
import { config } from '../../config';
import { l1Cache } from '../../lib/cache';
import { enqueueDomainEvent } from '../../lib/queue';
import { sandboxClient } from './sandbox-client';
import {
  AadhaarVerifiedData,
  KycRecord,
  KycState,
  PanVerifiedData,
} from './types';

const nowIso = () => new Date().toISOString();

const maskMobile = (num: string): string => {
  const clean = num.replace(/\D/g, '');
  if (clean.length < 10) return clean;
  return `${clean.slice(0, 2)}******${clean.slice(-2)}`;
};

export const getKycRecord = async (userId: string): Promise<KycRecord | null> => {
  const cacheKey = `kyc:${userId}`;

  return l1Cache.getOrFetch(
    cacheKey,
    async () => {
      const { Item } = await ddb.send(
        new GetCommand({
          TableName: config.coreTableName,
          Key: {
            pk: `USER#${userId}`,
            sk: 'KYC#META',
          },
        }),
      );

      if (!Item) {
        return null;
      }

      return Item as KycRecord;
    },
    15_000,
  );
};

export const saveKycRecord = async (record: KycRecord): Promise<void> => {
  await ddb.send(
    new PutCommand({
      TableName: config.coreTableName,
      Item: {
        pk: `USER#${record.userId}`,
        sk: 'KYC#META',
        entityType: 'kyc_record',
        gsi1pk: `KYC#STATE#${record.state}`,
        gsi1sk: `USER#${record.updatedAt}#${record.userId}`,
        ...record,
      },
    }),
  );

  l1Cache.invalidate(`kyc:${record.userId}`);
};

/**
 * Initiates Sandbox Aadhaar verification using DigiLocker.
 */
const maskAadhaar = (num: string): string => {
  const clean = num.replace(/\D/g, '');
  if (clean.length < 4) return '•••• •••• ••••';
  return `•••• •••• ${clean.slice(-4)}`;
};

/**
 * Initiates Sandbox Aadhaar verification using either:
 * 1. 12-Digit Aadhaar number (Generates UIDAI OTP to registered mobile)
 * 2. 10-Digit Mobile number (DigiLocker consent flow)
 */
export const initiateAadhaar = async (
  userId: string,
  aadhaarOrMobile: string,
  redirectUrl?: string,
): Promise<{
  state: KycState;
  referenceId: string;
  consentUrl?: string;
  message: string;
  isMock: boolean;
  isOtpFlow: boolean;
  maskedAadhaar?: string;
}> => {
  const cleanInput = aadhaarOrMobile.replace(/\D/g, '');
  const isAadhaarNumber = cleanInput.length === 12;
  const isMobileNumber = cleanInput.length === 10;

  if (!isAadhaarNumber && !isMobileNumber) {
    throw new Error('Please enter a valid 12-digit Aadhaar number.');
  }

  const existing = await getKycRecord(userId);
  if (existing && existing.state === 'KYC_COMPLETED') {
    return {
      state: 'KYC_COMPLETED',
      referenceId: existing.aadhaar?.referenceId ?? '',
      message: 'KYC is already completed for this account.',
      isMock: false,
      isOtpFlow: isAadhaarNumber,
    };
  }

  const now = nowIso();
  let refId: string;
  let consent: string | undefined;
  let message: string;
  let isMock: boolean;

  if (isAadhaarNumber) {
    // 12-Digit Aadhaar OTP Flow via UIDAI
    const otpRes = await sandboxClient.generateAadhaarOtp(cleanInput);
    refId = otpRes.referenceId;
    message = otpRes.message;
    isMock = otpRes.isMock;
  } else {
    // 10-Digit Mobile DigiLocker Flow
    const dlRes = await sandboxClient.initiateAadhaarDigiLocker(cleanInput, redirectUrl);
    refId = dlRes.referenceId;
    consent = dlRes.consentUrl;
    message = dlRes.message;
    isMock = dlRes.isMock;
  }

  const maskedAadhaar = isAadhaarNumber ? maskAadhaar(cleanInput) : undefined;
  const newRecord: KycRecord = {
    userId,
    state: 'AADHAAR_PENDING',
    aadhaarNumberMasked: maskedAadhaar,
    mobileNumberMasked: isMobileNumber ? maskMobile(cleanInput) : undefined,
    aadhaarReferenceId: refId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await saveKycRecord(newRecord);

  return {
    state: 'AADHAAR_PENDING',
    referenceId: refId,
    consentUrl: consent,
    message,
    isMock,
    isOtpFlow: isAadhaarNumber,
    maskedAadhaar,
  };
};

/**
 * Validates Aadhaar status once DigiLocker or OTP authorization completes.
 * Transitions to SELFIE_PENDING and stores verified identity + address.
 */
export const verifyAadhaar = async (
  userId: string,
  referenceId: string,
  otp?: string,
): Promise<{
  state: KycState;
  verified: boolean;
  data?: AadhaarVerifiedData;
  error?: string;
}> => {
  const existing = await getKycRecord(userId);
  if (!existing) {
    throw new Error('No active KYC verification found.');
  }

  // IDOR defense: Verify referenceId matches this user's KYC session
  if (existing.aadhaarReferenceId && existing.aadhaarReferenceId !== referenceId) {
    throw new Error('Verification reference does not match this KYC session.');
  }

  const result = otp
    ? await sandboxClient.verifyAadhaarOtp(referenceId, otp)
    : await sandboxClient.getAadhaarResult(referenceId);


  if (result.status === 'pending') {
    return {
      state: 'AADHAAR_PENDING',
      verified: false,
      error: 'DigiLocker verification is still in progress. Please approve the consent request.',
    };
  }

  if (result.status === 'failed' || !result.data) {
    existing.state = 'VERIFICATION_FAILED';
    existing.updatedAt = nowIso();
    await saveKycRecord(existing);

    return {
      state: 'VERIFICATION_FAILED',
      verified: false,
      error: result.error ?? 'Aadhaar verification could not be completed.',
    };
  }

  // Verification succeeded: Advance to SELFIE_PENDING
  const now = nowIso();
  existing.state = 'SELFIE_PENDING';
  existing.aadhaar = result.data;
  existing.updatedAt = now;
  await saveKycRecord(existing);

  // Auto-populate verified profile details in DynamoDB
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: config.coreTableName,
        Key: {
          pk: `USER#${userId}`,
          sk: 'META',
        },
        UpdateExpression:
          'SET isAadhaarVerified = :t, isAddressVerified = :t, verifiedName = :name, verifiedAddress = :addr, updatedAt = :now',
        ExpressionAttributeValues: {
          ':t': true,
          ':name': result.data.name,
          ':addr': result.data.address?.fullAddress ?? '',
          ':now': now,
        },
      }),
    );
  } catch (err) {
    console.error('kyc.profile_autofill_warning', err);
  }

  await enqueueDomainEvent({
    topic: 'kyc.aadhaar_verified',
    actorId: userId,
    entityType: 'kyc',
    entityId: userId,
    payload: {
      referenceId: result.data.referenceId,
      name: result.data.name,
    },
  });

  return {
    state: 'SELFIE_PENDING',
    verified: true,
    data: result.data,
  };
};

/**
 * Registers mandatory user selfie. Transitions to PAN_PENDING.
 */
export const registerSelfie = async (
  userId: string,
  selfieUrl: string,
): Promise<{ state: KycState; success: boolean }> => {
  if (!selfieUrl || typeof selfieUrl !== 'string' || !selfieUrl.trim()) {
    throw new Error('Valid selfie photo is required.');
  }

  const trimmedUrl = selfieUrl.trim();
  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error('Selfie photo must be a secure HTTPS URL.');
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.16.') ||
      host.endsWith('.internal')
    ) {
      throw new Error('Selfie URL domain is not permitted.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Selfie')) {
      throw err;
    }
    throw new Error('Invalid selfie photo URL format.');
  }

  const existing = await getKycRecord(userId);
  if (!existing || !existing.aadhaar) {
    throw new Error('Aadhaar verification must be completed prior to uploading a selfie.');
  }

  const now = nowIso();
  existing.selfieUrl = selfieUrl.trim();
  existing.selfieUploadedAt = now;
  existing.state = 'PAN_PENDING';
  existing.updatedAt = now;

  await saveKycRecord(existing);

  return {
    state: 'PAN_PENDING',
    success: true,
  };
};

/**
 * Verifies optional PAN card. Transitions to KYC_COMPLETED.
 */
export const verifyPan = async (
  userId: string,
  panNumber: string,
): Promise<{ state: KycState; verified: boolean; data?: PanVerifiedData; error?: string }> => {
  const existing = await getKycRecord(userId);
  if (!existing || existing.state !== 'PAN_PENDING') {
    throw new Error('Aadhaar and selfie verification must be completed first.');
  }

  const result = await sandboxClient.verifyPan(panNumber, existing.aadhaar?.name);

  if (!result.verified || !result.data) {
    return {
      state: 'PAN_PENDING',
      verified: false,
      error: result.error ?? 'PAN verification failed. You may retry or skip this step.',
    };
  }

  const now = nowIso();
  existing.pan = result.data;
  existing.state = 'KYC_COMPLETED';
  existing.updatedAt = now;

  await saveKycRecord(existing);

  // Update user profile to fully verified
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: config.coreTableName,
        Key: {
          pk: `USER#${userId}`,
          sk: 'META',
        },
        UpdateExpression: 'SET kycStatus = :status, verified = :t, updatedAt = :now',
        ExpressionAttributeValues: {
          ':status': 'approved',
          ':t': true,
          ':now': now,
        },
      }),
    );
  } catch (err) {
    console.error('kyc.complete_profile_warning', err);
  }

  await enqueueDomainEvent({
    topic: 'kyc.completed',
    actorId: userId,
    entityType: 'kyc',
    entityId: userId,
    payload: {
      panVerified: true,
    },
  });

  return {
    state: 'KYC_COMPLETED',
    verified: true,
    data: result.data,
  };
};

/**
 * Skips optional PAN step. Completes KYC immediately!
 * Explicit Rule: Skipping PAN must NEVER block KYC completion.
 */
export const skipPan = async (
  userId: string,
): Promise<{ state: KycState; success: boolean }> => {
  const existing = await getKycRecord(userId);
  if (!existing || existing.state !== 'PAN_PENDING') {
    throw new Error('Aadhaar and selfie verification must be completed first.');
  }

  const now = nowIso();
  existing.panSkipped = true;
  existing.state = 'KYC_COMPLETED';
  existing.updatedAt = now;

  await saveKycRecord(existing);

  // Update user profile to fully verified
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: config.coreTableName,
        Key: {
          pk: `USER#${userId}`,
          sk: 'META',
        },
        UpdateExpression: 'SET kycStatus = :status, verified = :t, updatedAt = :now',
        ExpressionAttributeValues: {
          ':status': 'approved',
          ':t': true,
          ':now': now,
        },
      }),
    );
  } catch (err) {
    console.error('kyc.complete_profile_warning', err);
  }

  await enqueueDomainEvent({
    topic: 'kyc.completed',
    actorId: userId,
    entityType: 'kyc',
    entityId: userId,
    payload: {
      panVerified: false,
      panSkipped: true,
    },
  });

  return {
    state: 'KYC_COMPLETED',
    success: true,
  };
};

/**
 * Fetches current KYC status for the authenticated user.
 */
export const getKycStatus = async (
  userId: string,
): Promise<{
  state: KycState;
  isAadhaarVerified: boolean;
  isSelfieCompleted: boolean;
  isPanVerified: boolean;
  panSkipped: boolean;
  aadhaar?: AadhaarVerifiedData;
  panMasked?: string;
}> => {
  const record = await getKycRecord(userId);

  if (!record) {
    return {
      state: 'NOT_STARTED',
      isAadhaarVerified: false,
      isSelfieCompleted: false,
      isPanVerified: false,
      panSkipped: false,
    };
  }

  return {
    state: record.state,
    isAadhaarVerified: Boolean(record.aadhaar),
    isSelfieCompleted: Boolean(record.selfieUrl),
    isPanVerified: Boolean(record.pan),
    panSkipped: Boolean(record.panSkipped),
    aadhaar: record.aadhaar,
    panMasked: record.pan?.panNumberMasked,
  };
};
