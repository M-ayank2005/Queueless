import { Request, Response, NextFunction } from "express";
import rateLimit, { Options } from "express-rate-limit";

const createRateLimitHandler = (defaultMessage: string) => {
  return (req: Request, res: Response, _next: NextFunction, options: Options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    const message = typeof options.message === "string" ? options.message : (options.message?.message || defaultMessage);
    res.status(options.statusCode).json({
      success: false,
      message,
      error: {
        code: "RATE_LIMITED",
        message,
        details: [],
        requestId: req.requestId,
        retryAfter
      },
      requestId: req.requestId
    });
  };
};

/**
 * Rate limiter for sensitive authentication endpoints (login, register).
 * Prevents credential brute-forcing.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // 30 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  handler: createRateLimitHandler("Too many authentication attempts. Please try again after 15 minutes.")
});

/**
 * Rate limiter for queue mutations (joining queue, leaving queue, rebooking).
 * Prevents queue flooding and spam.
 */
export const queueMutationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 mutations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Queue mutation rate limit exceeded. Please slow down and wait a minute.",
  },
  handler: createRateLimitHandler("Queue mutation rate limit exceeded. Please slow down and wait a minute.")
});

/**
 * Rate limiter for public shared tickets lookup.
 * Protects against scrapers querying shared tickets repeatedly.
 */
export const sharedTicketRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // 60 lookups per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many requests to public shared tickets. Please slow down.",
  },
  handler: createRateLimitHandler("Too many requests to public shared tickets. Please slow down.")
});

/**
 * Rate limiter for AI Support Chat requests.
 * Prevents API quota abuse and denial of service.
 */
export const supportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 40, // 40 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many AI support messages. Please wait a few minutes before trying again.",
  },
  handler: createRateLimitHandler("Too many AI support messages. Please wait a few minutes before trying again.")
});

/**
 * Rate limiter for business announcements and updates posting.
 * Max 10 per hour.
 */
export const businessUpdateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 updates per hour per IP/user
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Rate limit exceeded. Businesses can post up to 10 updates per hour.",
  },
  handler: createRateLimitHandler("Rate limit exceeded. Businesses can post up to 10 updates per hour.")
});

/**
 * General baseline rate limiter for API routes.
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300, // 300 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
  handler: createRateLimitHandler("Too many requests. Please slow down.")
});

