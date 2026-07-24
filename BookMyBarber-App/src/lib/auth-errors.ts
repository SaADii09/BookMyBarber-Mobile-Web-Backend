import axios from 'axios';

const AUTH_MESSAGES: Record<string, string> = {
  AUTH_FAILED: 'Invalid email or password. Please try again.',
  SIGNUP_FAILED: 'An account with this email already exists. Try signing in instead.',
  VALIDATION_ERROR: 'Please check your details and try again.',
  EMAIL_FAILED: 'Unable to send verification email. Please try again later.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before signing in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_IMPLEMENTED: 'This feature is not available yet.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked for 24 hours due to too many attempts. Please try again later.',
};

export function formatAuthError(error: unknown, fallback = 'Something went wrong. Please try again later.'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to connect. Check your internet connection and try again.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    const data = error.response?.data as { code?: string; error?: string; message?: string } | undefined;
    if (data?.code && AUTH_MESSAGES[data.code]) {
      return AUTH_MESSAGES[data.code];
    }
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (error.message) return mapHttpStatus(error.response?.status);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function mapHttpStatus(status?: number): string {
  switch (status) {
    case 400: return 'Please check your details and try again.';
    case 401: return 'Invalid email or password. Please try again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'Resource not found.';
    case 409: return 'This action conflicts with the current state. Please refresh and try again.';
    case 429: return 'Too many attempts. Please wait a moment and try again.';
    case 500: return 'Something went wrong on our end. Please try again later.';
    case 503: return 'Service temporarily unavailable. Please try again later.';
    default: return 'Something went wrong. Please try again later.';
  }
}
