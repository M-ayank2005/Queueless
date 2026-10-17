import axios from "axios";

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface NormalizedApiError {
  code: string;
  message: string;
  details: ErrorDetail[];
  status: number;
  requestId?: string;
  isNetworkError: boolean;
  isTimeout: boolean;
  isCancelled: boolean;
  isValidationError: boolean;
  isUnauthorized: boolean;
  isForbidden: boolean;
  isNotFound: boolean;
  isConflict: boolean;
  isRateLimited: boolean;
  isServerError: boolean;
  retryAfterSeconds?: number;
  activeTicketId?: string;
}

/**
 * Normalizes any backend response, HTTP error, network failure, or timeout
 * into a predictable, typed, user-safe mobile representation.
 */
export function normalizeApiError(error: any): NormalizedApiError {
  if (!error) {
    return {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
      details: [],
      status: 0,
      isNetworkError: false,
      isTimeout: false,
      isCancelled: false,
      isValidationError: false,
      isUnauthorized: false,
      isForbidden: false,
      isNotFound: false,
      isConflict: false,
      isRateLimited: false,
      isServerError: false
    };
  }

  // Already normalized
  if (typeof error === "object" && "isNetworkError" in error && "code" in error) {
    return error as NormalizedApiError;
  }

  // 1. Request cancellation
  if (axios.isCancel(error) || error.name === "AbortError" || error.code === "ERR_CANCELED") {
    return {
      code: "REQUEST_CANCELLED",
      message: "Request was cancelled.",
      details: [],
      status: 0,
      isNetworkError: false,
      isTimeout: false,
      isCancelled: true,
      isValidationError: false,
      isUnauthorized: false,
      isForbidden: false,
      isNotFound: false,
      isConflict: false,
      isRateLimited: false,
      isServerError: false
    };
  }

  // 2. Transport / Network failure (offline, DNS failure, server unreachable)
  if (!error.response) {
    const isTimeout =
      error.code === "ECONNABORTED" ||
      (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));

    const isOffline =
      error.code === "ERR_NETWORK" ||
      (typeof error.message === "string" && error.message.toLowerCase().includes("network error"));

    if (isTimeout) {
      return {
        code: "REQUEST_TIMEOUT",
        message: "The server took too long to respond. Please check your connection and try again.",
        details: [],
        status: 0,
        isNetworkError: true,
        isTimeout: true,
        isCancelled: false,
        isValidationError: false,
        isUnauthorized: false,
        isForbidden: false,
        isNotFound: false,
        isConflict: false,
        isRateLimited: false,
        isServerError: false
      };
    }

    if (isOffline) {
      return {
        code: "NETWORK_DISCONNECTED",
        message: "Network unreachable. Please check your internet connection.",
        details: [],
        status: 0,
        isNetworkError: true,
        isTimeout: false,
        isCancelled: false,
        isValidationError: false,
        isUnauthorized: false,
        isForbidden: false,
        isNotFound: false,
        isConflict: false,
        isRateLimited: false,
        isServerError: false
      };
    }

    return {
      code: "NETWORK_ERROR",
      message: error.message || "Unable to reach QueueLess service. Please try again shortly.",
      details: [],
      status: 0,
      isNetworkError: true,
      isTimeout: false,
      isCancelled: false,
      isValidationError: false,
      isUnauthorized: false,
      isForbidden: false,
      isNotFound: false,
      isConflict: false,
      isRateLimited: false,
      isServerError: false
    };
  }

  // 3. HTTP Response Received
  const status: number = error.response.status || 500;
  const data: any = error.response.data;
  const headers: any = error.response.headers || {};

  // Handle HTML response documents
  if (typeof data === "string" && (data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html"))) {
    let htmlFriendlyMessage = "The service returned an unexpected response. Please try again.";
    if (status === 502) htmlFriendlyMessage = "Server gateway is restarting or temporarily unavailable. Please retry shortly.";
    if (status === 503) htmlFriendlyMessage = "The service is temporarily under maintenance. Please try again soon.";
    if (status === 504) htmlFriendlyMessage = "Gateway connection timed out. Please retry in a few moments.";

    return {
      code: `HTTP_${status}`,
      message: htmlFriendlyMessage,
      details: [],
      status,
      isNetworkError: false,
      isTimeout: status === 504,
      isCancelled: false,
      isValidationError: false,
      isUnauthorized: status === 401,
      isForbidden: status === 403,
      isNotFound: status === 404,
      isConflict: status === 409,
      isRateLimited: status === 429,
      isServerError: status >= 500
    };
  }

  // Structured response extraction
  const errorObj = data && typeof data === "object" ? (data.error || {}) : {};
  const code: string = errorObj.code || data?.code || (
    status === 400 ? "BAD_REQUEST" :
    status === 401 ? "UNAUTHORIZED" :
    status === 403 ? "FORBIDDEN" :
    status === 404 ? "RESOURCE_NOT_FOUND" :
    status === 409 ? "CONFLICT" :
    status === 429 ? "RATE_LIMITED" :
    status >= 500 ? "INTERNAL_SERVER_ERROR" : "API_ERROR"
  );

  const rawMessage = errorObj.message || data?.message || error.message;
  let message = typeof rawMessage === "string" ? rawMessage : "An unexpected error occurred.";

  if (status >= 500 && (!rawMessage || rawMessage.toLowerCase().includes("database") || rawMessage.toLowerCase().includes("sql") || rawMessage.toLowerCase().includes("mongo"))) {
    message = "An unexpected server error occurred. Please try again shortly.";
  }

  let details: ErrorDetail[] = [];
  if (Array.isArray(errorObj.details)) {
    details = errorObj.details;
  } else if (Array.isArray(data?.details)) {
    details = data.details;
  }

  const requestId: string | undefined = errorObj.requestId || data?.requestId || headers["x-request-id"];
  const activeTicketId: string | undefined = data?.activeTicketId || errorObj.activeTicketId;

  let retryAfterSeconds: number | undefined = errorObj.retryAfter || data?.retryAfter;
  if (!retryAfterSeconds && headers["retry-after"]) {
    const headerVal = parseInt(headers["retry-after"], 10);
    if (!isNaN(headerVal)) retryAfterSeconds = headerVal;
  }

  return {
    code,
    message,
    details,
    status,
    requestId,
    isNetworkError: false,
    isTimeout: status === 408 || status === 504,
    isCancelled: false,
    isValidationError: status === 400 && (code === "VALIDATION_ERROR" || details.length > 0),
    isUnauthorized: status === 401,
    isForbidden: status === 403,
    isNotFound: status === 404,
    isConflict: status === 409,
    isRateLimited: status === 429,
    isServerError: status >= 500,
    retryAfterSeconds,
    activeTicketId
  };
}

export function getFieldError(error: NormalizedApiError | null | undefined, fieldName: string): string | null {
  if (!error || !Array.isArray(error.details) || error.details.length === 0) {
    return null;
  }
  const match = error.details.find(
    (d) => d.field && (d.field.toLowerCase() === fieldName.toLowerCase() || d.field.endsWith(`.${fieldName}`))
  );
  return match?.message || null;
}

export function getErrorMessage(error: any): string {
  const normalized = normalizeApiError(error);
  return normalized.message;
}
