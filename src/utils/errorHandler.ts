import { AxiosError } from 'axios';

export interface ApiError {
  status?: number;
  message: string;
  code?: string;
  details?: any;
  isNetwork?: boolean;
  isTimeout?: boolean;
  isServerError?: boolean;
  isClientError?: boolean;
}

/**
 * Handle and normalize API errors from Axios
 * Provides user-friendly error messages
 */
export const handleApiError = (error: unknown): ApiError => {
  if (!error) {
    return { message: 'An unknown error occurred' };
  }

  const axiosError = error as AxiosError;

  // Network error (no response from server)
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED') {
      return {
        message: 'Request timeout. The server took too long to respond. Please try again.',
        isTimeout: true,
        code: 'TIMEOUT',
      };
    }

    if (axiosError.code === 'ERR_NETWORK') {
      return {
        message: 'Network error. Please check your internet connection and try again.',
        isNetwork: true,
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: 'Connection failed. Please check your internet and try again.',
      isNetwork: true,
      code: 'CONNECTION_ERROR',
    };
  }

  const { status, data } = axiosError.response;

  // Server error (500+)
  if (status && status >= 500) {
    return {
      status,
      message: 'Server error. Our team has been notified. Please try again later.',
      isServerError: true,
      code: 'SERVER_ERROR',
      details: data,
    };
  }

  // Specific client errors
  if (status === 401) {
    return {
      status,
      message: 'Your session has expired. Please log in again.',
      code: 'UNAUTHORIZED',
      isClientError: true,
    };
  }

  if (status === 403) {
    return {
      status,
      message: 'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
      isClientError: true,
    };
  }

  if (status === 404) {
    return {
      status,
      message: 'Resource not found. It may have been deleted.',
      code: 'NOT_FOUND',
      isClientError: true,
    };
  }

  if (status === 400) {
    const errorData = data as any;
    const errorMessages = errorData?.errors || errorData?.detail || data;
    
    // Extract field-specific errors
    let fieldErrors = '';
    if (typeof errorMessages === 'object' && !Array.isArray(errorMessages)) {
      fieldErrors = Object.entries(errorMessages)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ');
    }

    return {
      status,
      message: fieldErrors || 'Invalid request. Please check your input and try again.',
      code: 'BAD_REQUEST',
      details: errorMessages,
      isClientError: true,
    };
  }

  if (status === 429) {
    return {
      status,
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
      isClientError: true,
    };
  }

  // Generic client error
  if (status && status >= 400 && status < 500) {
    return {
      status,
      message: (data as any)?.detail || `Error (${status}): Invalid request`,
      code: 'CLIENT_ERROR',
      details: data,
      isClientError: true,
    };
  }

  // Default fallback
  return {
    status,
    message: `Error (${status}): ${(data as any)?.detail || 'Unknown error occurred'}`,
    code: 'UNKNOWN_ERROR',
    details: data,
  };
};

/**
 * Log error for debugging and monitoring
 * In production, this should send to error tracking service (e.g., Sentry)
 */
export const logError = (error: ApiError, context: string, metadata?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    error: {
      message: error.message,
      code: error.code,
      status: error.status,
    },
    metadata,
  };

  console.error(`[${timestamp}] ${context}:`, logEntry);

  // In production, send to error tracking service
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    // TODO: Integrate with Sentry or similar
    // Sentry.captureException(error);
  }
};

/**
 * Get user-friendly error message based on error type
 */
export const getErrorMessage = (error: unknown, defaultMessage = 'An error occurred'): string => {
  if (!error) return defaultMessage;

  const apiError = handleApiError(error);
  return apiError.message;
};

/**
 * Check if error is recoverable (user can retry)
 */
export const isRecoverableError = (error: unknown): boolean => {
  const apiError = handleApiError(error);
  return !!(
    apiError.isTimeout ||
    apiError.isNetwork ||
    apiError.status === 429 ||
    (apiError.status && apiError.status >= 500)
  );
};

/**
 * Retry logic with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts && isRecoverableError(error)) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(
          `Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms...`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  throw lastError;
};
