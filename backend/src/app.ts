import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import businessRoutes from "./routes/businessRoutes";
import queueRoutes from "./routes/queueRoutes";
import healthRoutes from "./routes/healthRoutes";
import supportRoutes from "./routes/supportRoutes";
import { requestIdMiddleware } from "./middleware/requestId";
import { generalApiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
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

// Built-in trusted origins (production frontend, Vercel deployments, Render domain, local dev)
export const DEFAULT_ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://queueless-gamma.vercel.app",
  /^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/,
  /^https:\/\/([a-zA-Z0-9_-]+\.)*onrender\.com$/,
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:8081",
  "http://127.0.0.1:3000"
];

export const getAppCorsOrigins = (): (string | RegExp)[] | string => {
  if (process.env.ALLOWED_ORIGINS) {
    const configured = process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean);
    if (configured.includes("*")) {
      return "*";
    }
    // Merge configured origins with default allowed origins
    return Array.from(new Set([...configured, ...DEFAULT_ALLOWED_ORIGINS]));
  }
  return DEFAULT_ALLOWED_ORIGINS;
};

// Cross-Origin Resource Sharing
app.use(cors({
  origin: getAppCorsOrigins(),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  optionsSuccessStatus: 204
}));

// Request tracing & structured HTTP access logging (mounted before body parsing to trace all requests)
app.use(requestIdMiddleware);

app.use(express.json({ limit: "2mb" }));

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
app.use("/api/support", supportRoutes);

// Central 404 handler for unknown routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
