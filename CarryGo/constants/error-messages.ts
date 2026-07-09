/**
 * Centralized user-facing error messages.
 * Consistent tone: empathetic, clear, actionable.
 */

export interface ErrorMessage {
  title: string;
  description: string;
}

export const NETWORK_ERRORS: Record<string, ErrorMessage> = {
  OFFLINE: {
    title: 'No Internet Connection',
    description: 'Please check your connection and try again.',
  },
  TIMEOUT: {
    title: 'Request Timed Out',
    description: 'The server took too long to respond. Please try again.',
  },
  SERVER_DOWN: {
    title: 'Server Unavailable',
    description: 'Our servers are temporarily unavailable. Please try again in a few minutes.',
  },
};

export const AUTH_ERRORS: Record<string, ErrorMessage> = {
  SESSION_EXPIRED: {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again to continue.',
  },
  INVALID_CREDENTIALS: {
    title: 'Invalid Credentials',
    description: 'The email or password you entered is incorrect.',
  },
  UNAUTHORIZED: {
    title: 'Access Denied',
    description: 'You do not have permission to perform this action.',
  },
  ACCOUNT_LOCKED: {
    title: 'Account Locked',
    description: 'Too many failed attempts. Please try again later or reset your password.',
  },
};

export const VALIDATION_ERRORS: Record<string, ErrorMessage> = {
  INVALID_EMAIL: {
    title: 'Invalid Email',
    description: 'Please enter a valid email address.',
  },
  INVALID_PHONE: {
    title: 'Invalid Phone Number',
    description: 'Please enter a valid Indian mobile number.',
  },
  INVALID_AMOUNT: {
    title: 'Invalid Amount',
    description: 'Please enter a valid amount within the allowed range.',
  },
  INVALID_WEIGHT: {
    title: 'Invalid Weight',
    description: 'Weight must be between 0.1 kg and 500 kg.',
  },
  REQUIRED_FIELD: {
    title: 'Required Field',
    description: 'Please fill in all required fields.',
  },
  TEXT_TOO_LONG: {
    title: 'Text Too Long',
    description: 'Please shorten your text to fit within the character limit.',
  },
  INVALID_CITY: {
    title: 'Invalid City Name',
    description: 'Please enter a valid city name without special characters.',
  },
};

export const PAYMENT_ERRORS: Record<string, ErrorMessage> = {
  PAYMENT_FAILED: {
    title: 'Payment Failed',
    description: 'Your payment could not be processed. Please check your payment details and try again.',
  },
  INSUFFICIENT_FUNDS: {
    title: 'Insufficient Funds',
    description: 'Your account does not have enough balance to complete this transaction.',
  },
  PAYMENT_CANCELLED: {
    title: 'Payment Cancelled',
    description: 'You cancelled the payment. No charges were made.',
  },
  PAYMENT_RATE_LIMITED: {
    title: 'Too Many Attempts',
    description: 'You have made too many payment attempts. Please wait a moment before trying again.',
  },
};

export const REQUEST_ERRORS: Record<string, ErrorMessage> = {
  ALREADY_EXISTS: {
    title: 'Duplicate Request',
    description: 'You have already submitted a request for this trip.',
  },
  NOT_FOUND: {
    title: 'Not Found',
    description: 'The item you are looking for no longer exists or has been removed.',
  },
  RATE_LIMITED: {
    title: 'Slow Down',
    description: 'You are performing actions too quickly. Please wait a moment.',
  },
  CONFLICT: {
    title: 'Action Conflict',
    description: 'This item was modified by someone else. Please refresh and try again.',
  },
};

export const GENERAL_ERRORS: Record<string, ErrorMessage> = {
  UNKNOWN: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again later.',
  },
  STORAGE_FULL: {
    title: 'Storage Full',
    description: 'Your device storage is full. Please free up some space and try again.',
  },
};
