import { createHmac, timingSafeEqual } from 'crypto';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { json, JsonResponse } from '../../http/response';
import { getAuthenticatedUserId } from '../../http/auth';
import { parseJsonBody } from '../../lib/http';
import { config } from '../../config';
import {
  initiateAadhaar,
  verifyAadhaar,
  registerSelfie,
  verifyPan,
  skipPan,
  getKycStatus,
} from './service';
import {
  InitiateAadhaarInput,
  RegisterSelfieInput,
  VerifyAadhaarInput,
  VerifyPanInput,
} from './types';

export const handleInitiateAadhaar = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<InitiateAadhaarInput>(event.body);
  const identifier = payload?.aadhaarNumber ?? payload?.mobileNumber;
  if (!identifier) {
    return json(400, { message: 'Aadhaar number is required.' });
  }

  try {
    const result = await initiateAadhaar(userId, identifier);
    return json(200, result);
  } catch (error) {
    return json(400, {
      message: error instanceof Error ? error.message : 'Failed to initiate verification.',
    });
  }
};

export const handleVerifyAadhaar = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<VerifyAadhaarInput>(event.body);
  if (!payload?.referenceId) {
    return json(400, { message: 'Verification reference ID is required.' });
  }

  try {
    const result = await verifyAadhaar(userId, payload.referenceId, payload.otp);
    return json(result.verified ? 200 : 400, result);
  } catch (error) {
    return json(400, {
      message: error instanceof Error ? error.message : 'Aadhaar verification error.',
    });
  }
};

export const handleRegisterSelfie = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<RegisterSelfieInput>(event.body);
  if (!payload?.selfieUrl) {
    return json(400, { message: 'Selfie photo URL is required.' });
  }

  try {
    const result = await registerSelfie(userId, payload.selfieUrl);
    return json(200, result);
  } catch (error) {
    return json(400, {
      message: error instanceof Error ? error.message : 'Selfie upload error.',
    });
  }
};

export const handleVerifyPan = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return json(401, { message: 'Authentication required' });
  }

  const payload = parseJsonBody<VerifyPanInput>(event.body);
  if (!payload?.panNumber) {
    return json(400, { message: 'PAN number is required.' });
  }

  try {
    const result = await verifyPan(userId, payload.panNumber);
    return json(result.verified ? 200 : 400, result);
  } catch (error) {
    return json(400, {
      message: error instanceof Error ? error.message : 'PAN verification error.',
    });
  }
};

export const handleSkipPan = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return json(401, { message: 'Authentication required' });
  }

  try {
    const result = await skipPan(userId);
    return json(200, result);
  } catch (error) {
    return json(400, {
      message: error instanceof Error ? error.message : 'Error skipping PAN step.',
    });
  }
};

export const handleGetKycStatus = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return json(401, { message: 'Authentication required' });
  }

  try {
    const status = await getKycStatus(userId);
    return json(200, status, {
      cacheControl: 'private, no-cache, no-store, must-revalidate',
    });
  } catch (error) {
    console.error('kyc.get_status_error', error);
    return json(500, {
      message: 'Failed to fetch KYC status. Please try again later.',
    });
  }
};

export const handleSandboxWebhook = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const secret = config.sandboxWebhookSecret;
  if (secret) {
    const signature =
      event.headers['x-sandbox-signature'] ??
      event.headers['x-webhook-signature'] ??
      event.headers['X-Sandbox-Signature'] ??
      event.headers['X-Webhook-Signature'];

    if (!signature) {
      return json(401, { message: 'Missing webhook signature header' });
    }

    const expected = createHmac('sha256', secret)
      .update(event.body ?? '')
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return json(401, { message: 'Invalid webhook signature' });
    }
  }

  // Idempotency tracking
  const eventId =
    event.headers['x-sandbox-delivery-id'] ??
    event.headers['x-webhook-id'] ??
    event.headers['X-Sandbox-Delivery-Id'];

  // Sanitized logging (zero PII leakage)
  console.log('kyc.webhook_received', {
    eventId: eventId ?? 'unknown',
    hasBody: Boolean(event.body),
    verified: Boolean(secret),
  });

  return json(200, { received: true });
};

