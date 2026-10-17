export interface ErrorDetail {
  field?: string;
  message: string;
  value?: any;
}

export interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  details?: ErrorDetail[];
  isOperational?: boolean;
  metadata?: Record<string, any>;
  cause?: Error;
}

/**
 * Base Application Error class for QueueLess.
 * Provides structured status codes, stable error codes, and safe client messages.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetail[];
  public readonly isOperational: boolean;
  public readonly metadata: Record<string, any>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || (this.statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
    this.details = options.details || [];
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    this.metadata = options.metadata || {};

    // Capture stack trace excluding constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details: ErrorDetail[] = [], metadata?: Record<string, any>) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
      isOperational: true,
      metadata
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", metadata?: Record<string, any>) {
    super(message, {
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
      details: [],
      isOperational: true,
      metadata
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required", metadata?: Record<string, any>) {
    super(message, {
      statusCode: 401,
      code: "UNAUTHORIZED",
      details: [],
      isOperational: true,
      metadata
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden", metadata?: Record<string, any>) {
    super(message, {
      statusCode: 403,
      code: "FORBIDDEN",
      details: [],
      isOperational: true,
      metadata
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict", metadata?: Record<string, any>) {
    super(message, {
      statusCode: 409,
      code: "CONFLICT",
      details: [],
      isOperational: true,
      metadata
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests, please slow down", metadata?: Record<string, any>) {
    super(message, {
      statusCode: 429,
      code: "RATE_LIMITED",
      details: [],
      isOperational: true,
      metadata
    });
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", details: ErrorDetail[] = [], metadata?: Record<string, any>) {
    super(message, {
      statusCode: 400,
      code: "BAD_REQUEST",
      details,
      isOperational: true,
      metadata
    });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "An unexpected internal server error occurred", metadata?: Record<string, any>) {
    super(message, {
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      details: [],
      isOperational: false,
      metadata
    });
  }
}
