import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import businessRoutes from "./routes/businessRoutes";
import queueRoutes from "./routes/queueRoutes";
import healthRoutes from "./routes/healthRoutes";
import { requestIdMiddleware } from "./middleware/requestId";
import { generalApiRateLimiter } from "./middleware/rateLimiter";
import { logger } from "./utils/logger";

const app = express();

// Disable powered-by signature
app.disable("x-powered-by");

// Standard security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

export const getAppCorsOrigins = (): string[] | boolean => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === "production") {
    // Fail-closed in production: reject all origins unless explicitly configured
    return false;
  }
  return ["http://localhost:3000", "http://localhost:5000", "http://localhost:8081", "http://127.0.0.1:3000"];
};

// Cross-Origin Resource Sharing (Fail-closed in production)
app.use(cors({
  origin: getAppCorsOrigins(),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
}));

app.use(express.json({ limit: "2mb" }));

// Request tracing & structured HTTP access logging
app.use(requestIdMiddleware);

// Root landing endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("QueueLess Backend is running");
});

// Health check & probe endpoints (/health, /health/live, /health/ready)
app.use("/health", healthRoutes);

// General rate limiter for all /api endpoints
app.use("/api", generalApiRateLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/customer", queueRoutes);

// Central 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.requestId,
  });
});

// Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error caught in central error handler:", {
    requestId: req.requestId,
    error: err.message || err,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    requestId: req.requestId,
  });
});

export default app;
