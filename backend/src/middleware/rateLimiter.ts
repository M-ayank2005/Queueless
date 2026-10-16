import rateLimit from "express-rate-limit";

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
});
