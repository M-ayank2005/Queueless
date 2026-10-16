import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const existingId = req.headers["x-request-id"];
  const requestId = (typeof existingId === "string" && existingId.trim().length > 0)
    ? existingId.trim()
    : `req_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

  req.requestId = requestId;
  req.startTime = Date.now();
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    logger.http(
      {
        method: req.method,
        path: req.originalUrl || req.path,
        headers: { "x-request-id": requestId },
      },
      { statusCode: res.statusCode },
      durationMs
    );
  });

  next();
};
