import { Request, Response } from "express";
import mongoose from "mongoose";

let isDraining = false;

export const setServerDraining = (draining: boolean = true) => {
  isDraining = draining;
};

export const isServerDraining = () => isDraining;

const getMongooseStateLabel = (state: number): string => {
  switch (state) {
    case 0: return "disconnected";
    case 1: return "connected";
    case 2: return "connecting";
    case 3: return "disconnecting";
    default: return "unknown";
  }
};

/**
 * Liveness Probe (/health/live)
 * Checks if the Node.js event loop and HTTP server are responsive.
 * Used by orchestrators (Kubernetes/ECS) to restart stalled containers.
 */
export const getLiveness = (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Readiness Probe (/health/ready)
 * Verifies the application is ready to accept production traffic (DB connected, not draining).
 * Returns 503 when draining during graceful shutdown or when DB is disconnected.
 */
export const getReadiness = (req: Request, res: Response) => {
  const readyState = mongoose.connection.readyState;
  const isDbReady = readyState === 1;
  const isReady = isDbReady && !isDraining;

  const payload = {
    status: isReady ? "ready" : "not_ready",
    database: {
      status: getMongooseStateLabel(readyState),
      readyState,
    },
    draining: isDraining,
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };

  if (!isReady) {
    res.status(503).json(payload);
    return;
  }

  res.status(200).json(payload);
};

/**
 * Legacy / Standard Health Probe (/health)
 * Backward-compatible endpoint returning overall system status.
 */
export const getHealthSummary = (req: Request, res: Response) => {
  const readyState = mongoose.connection.readyState;
  const isDbReady = readyState === 1;

  res.status(200).json({
    status: isDbReady ? "healthy" : "degraded",
    live: true,
    ready: isDbReady && !isDraining,
    database: getMongooseStateLabel(readyState),
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};
