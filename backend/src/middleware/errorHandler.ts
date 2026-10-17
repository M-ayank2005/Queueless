import { Request, Response, NextFunction } from "express";
import { AppError, ErrorDetail } from "../utils/errors";
import { logger } from "../utils/logger";

export interface StandardErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
    requestId?: string;
    [key: string]: any;
  };
  requestId?: string;
  [key: string]: any;
}

/**
 * Express 404 Not Found Handler for unknown API routes.
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  const responsePayload: StandardErrorResponse = {
    success: false,
    message,
    error: {
      code: "ROUTE_NOT_FOUND",
      message,
      details: [],
      requestId: req.requestId
    },
    requestId: req.requestId
  };
  return res.status(404).json(responsePayload);
};

/**
 * Centralized Express Error Handling Middleware.
 * Normalizes all database, validation, syntax, JWT, rate-limit, and operational errors
 * into a safe, structured JSON contract. Prevents leakage of internal stack traces or queries.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response headers have already been sent to client, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected internal server error occurred";
  let details: ErrorDetail[] = [];
  let extraFields: Record<string, any> = {};

  // 1. AppError instances or custom typed errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
    if (err.metadata) {
      extraFields = { ...err.metadata };
    }
  }
  // 2. Body-Parser / JSON parsing syntax error
  else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    code = "MALFORMED_REQUEST_BODY";
    message = "Malformed JSON syntax in request body";
  }
  // 3. Payload too large (413)
  else if (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413) {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request payload exceeds the maximum allowed 2MB limit";
  }
  // 4. Mongoose Validation Error
  else if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Please correct the highlighted validation fields";
    details = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message || `Invalid value for ${key}`,
      value: err.errors[key].value
    }));
  }
  // 5. Mongoose CastError (e.g., malformed ObjectId)
  else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_IDENTIFIER";
    message = `Invalid format for resource identifier at '${err.path}'`;
    details = [{
      field: err.path,
      message: `Value '${err.value}' is not a valid ${err.kind || "identifier"}`
    }];
  }
  // 6. MongoDB Duplicate Key (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_KEY_CONFLICT";
    const duplicateKeys = err.keyValue ? Object.keys(err.keyValue).join(", ") : "resource";
    message = `A record with this ${duplicateKeys} already exists`;
    if (err.keyValue) {
      details = Object.keys(err.keyValue).map((k) => ({
        field: k,
        message: `${k} '${err.keyValue[k]}' is already in use`
      }));
    }
  }
  // 7. JWT verification & expiry errors
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "TOKEN_EXPIRED";
    message = "Authentication token has expired. Please sign in again.";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "INVALID_TOKEN";
    message = "Authentication token is invalid.";
  }
  // 8. Custom status from existing controller throws ({ status, message, activeTicketId })
  else if (typeof err.status === "number" || typeof err.statusCode === "number") {
    statusCode = err.status || err.statusCode;
    message = err.message || "An error occurred processing your request";
    code = statusCode === 400 ? "BAD_REQUEST" :
           statusCode === 401 ? "UNAUTHORIZED" :
           statusCode === 403 ? "FORBIDDEN" :
           statusCode === 404 ? "RESOURCE_NOT_FOUND" :
           statusCode === 409 ? "CONFLICT" :
           statusCode === 429 ? "RATE_LIMITED" :
           statusCode === 503 ? "SERVICE_UNAVAILABLE" : "ERROR";

    if (err.activeTicketId) {
      extraFields.activeTicketId = err.activeTicketId;
    }
    if (Array.isArray(err.details)) {
      details = err.details;
    }
  }
  // 9. Standard unhandled Error
  else {
    statusCode = 500;
    code = "INTERNAL_SERVER_ERROR";
    // Never leak raw exception messages or stack traces in production / 500 errors
    message = "An unexpected internal server error occurred";
  }

  // Structured server-side logging with diagnostic details
  const logContext = {
    requestId: req.requestId,
    statusCode,
    code,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    detailsCount: details.length,
    originalError: err.message || err.toString()
  };

  if (statusCode >= 500) {
    logger.error(`[Server Error] ${statusCode} ${code} - ${req.method} ${req.originalUrl}`, {
      ...logContext,
      stack: err.stack
    });
  } else if (statusCode === 401 || statusCode === 403) {
    logger.warn(`[Auth Guard] ${statusCode} ${code} - ${req.method} ${req.originalUrl}`, logContext);
  } else {
    logger.info(`[Client Error] ${statusCode} ${code} - ${req.method} ${req.originalUrl}`, logContext);
  }

  const responsePayload: StandardErrorResponse = {
    success: false,
    message,
    error: {
      code,
      message,
      details,
      requestId: req.requestId,
      ...extraFields
    },
    requestId: req.requestId,
    ...extraFields
  };

  return res.status(statusCode).json(responsePayload);
};
