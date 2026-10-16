import http from "http";
import crypto from "crypto";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import app from "./app";
import { logger } from "./utils/logger";
import { setServerDraining } from "./controllers/healthController";
import QueueEntry from "./models/QueueEntry";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/queueless";
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "your_jwt_secret_key");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET environment variable is required in production mode.");
  process.exit(1);
}

// Fail-closed CORS policy
export const getSocketCorsOrigins = (): string[] | boolean => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === "production") {
    // Fail-closed in production: reject all origins if not explicitly configured
    return false;
  }
  return ["http://localhost:3000", "http://localhost:5000", "http://localhost:8081", "http://127.0.0.1:3000"];
};

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: getSocketCorsOrigins(),
    methods: ["GET", "POST"]
  }
});

// Socket Authentication Middleware
io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token || 
    (socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(" ")[1]);

  if (token && JWT_SECRET) {
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id && ["customer", "business"].includes(decoded.role)) {
        socket.data.user = decoded;
      } else {
        socket.data.user = null;
      }
    } catch {
      // Allow unauthenticated connection for guest socket listeners, but restrict sensitive rooms
      socket.data.user = null;
    }
  } else {
    socket.data.user = null;
  }
  next();
});

// Hardened Socket.IO connection handlers
io.on("connection", (socket: Socket) => {
  logger.debug(`[Socket] User connected: ${socket.id} (Auth: ${socket.data.user ? socket.data.user.id : "guest"})`);

  // Authenticated user room join: automatically join personal room for authenticated connection
  if (socket.data.user && socket.data.user.id) {
    socket.join(`user_${socket.data.user.id}`);
    logger.debug(`[Socket] Socket ${socket.id} joined personal room user_${socket.data.user.id}`);
  }

  // Explicit user room join: strictly requires matching authenticated user ID
  socket.on("join_user", (userId: string) => {
    const user = socket.data.user;
    if (!user || !user.id || user.id !== userId) {
      logger.warn(`[Socket] Unauthorized join_user attempt by socket ${socket.id} for user ${userId}`);
      socket.emit("socket_error", { message: "Unauthorized user room join: identity mismatch or unauthenticated" });
      return;
    }
    socket.join(`user_${userId}`);
    logger.debug(`[Socket] Verified user ${userId} joined room user_${userId}`);
  });

  // Business room join: strictly protected to verified business owners (NO unauthenticated fallback)
  socket.on("join_business", (businessId: string) => {
    const user = socket.data.user;
    if (user && user.role === "business" && user.id === businessId) {
      socket.join(`business_${businessId}`);
      logger.debug(`[Socket] Verified business ${user.id} joined business_${businessId}`);
    } else {
      logger.warn(`[Socket] Unauthorized join_business attempt by ${user?.id || "unauthenticated"} for ${businessId}`);
      socket.emit("socket_error", { message: "Unauthorized: Only verified business owners can join this business room" });
    }
  });

  // Ticket room join: strictly authorized to ticket owner or store manager
  socket.on("join_queue", async (queueId: string) => {
    if (!queueId || typeof queueId !== "string" || !mongoose.Types.ObjectId.isValid(queueId)) {
      socket.emit("socket_error", { message: "Invalid queue ticket ID format" });
      return;
    }

    const user = socket.data.user;
    if (!user || !user.id) {
      logger.warn(`[Socket] Unauthenticated join_queue attempt for ticket ${queueId}`);
      socket.emit("socket_error", { message: "Authentication required to join ticket room" });
      return;
    }

    try {
      const entry = await QueueEntry.findById(queueId).select("customerId businessId");
      if (!entry) {
        socket.emit("socket_error", { message: "Queue ticket not found" });
        return;
      }

      const isAuthorized = entry.customerId.toString() === user.id || entry.businessId.toString() === user.id;
      if (!isAuthorized) {
        logger.warn(`[Socket] Unauthorized join_queue attempt by ${user.id} for ticket ${queueId}`);
        socket.emit("socket_error", { message: "Unauthorized: You are not the ticket owner or store manager" });
        return;
      }

      socket.join(`queue_${queueId}`);
      logger.debug(`[Socket] Verified socket ${socket.id} joined queue_${queueId}`);
    } catch (err) {
      logger.error(`[Socket] Error verifying join_queue:`, { error: err });
      socket.emit("socket_error", { message: "Failed to verify ticket room authorization" });
    }
  });

  // Shared ticket room join: validates that share token exists, is active, and is not expired
  socket.on("join_shared_ticket", async (shareToken: string) => {
    if (!shareToken || typeof shareToken !== "string" || shareToken.trim().length === 0) {
      socket.emit("socket_error", { message: "Valid share token is required" });
      return;
    }

    try {
      const cleanToken = shareToken.trim();
      const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");

      const entry = await QueueEntry.findOne({
        $or: [
          { shareTokenHash: tokenHash },
          { shareToken: cleanToken }
        ],
        shareTokenRevoked: { $ne: true }
      }).select("_id shareTokenHash shareTokenExpiresAt");

      if (!entry) {
        logger.warn(`[Socket] Rejecting join_shared_ticket for non-existent or revoked token`);
        socket.emit("socket_error", { message: "Shared ticket not found or link has been revoked" });
        return;
      }

      if (entry.shareTokenExpiresAt && entry.shareTokenExpiresAt < new Date()) {
        logger.warn(`[Socket] Rejecting join_shared_ticket for expired token`);
        socket.emit("socket_error", { message: "Shared ticket link has expired" });
        return;
      }

      const roomKey = entry.shareTokenHash || tokenHash;
      socket.join(`shared_ticket_${roomKey}`);
      if (roomKey !== cleanToken) {
        socket.join(`shared_ticket_${cleanToken}`);
      }
      logger.debug(`[Socket] Verified guest socket ${socket.id} joined shared ticket room`);
    } catch (err) {
      logger.error(`[Socket] Error verifying join_shared_ticket:`, { error: err });
      socket.emit("socket_error", { message: "Failed to verify share token" });
    }
  });

  socket.on("disconnect", () => {
    logger.debug(`[Socket] User disconnected: ${socket.id}`);
  });
});

app.set("io", io);

// Database connection
mongoose.connect(MONGO_URI)
  .then(() => {
    logger.info("Connected to MongoDB via Mongoose");
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [env: ${process.env.NODE_ENV || "development"}]`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", { error: err });
  });

// Graceful shutdown engine
let isShuttingDown = false;

export const handleShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);

  // Step 1: Mark readiness probe not ready so load balancers stop forwarding traffic immediately
  setServerDraining(true);

  // Step 2: Establish a force-kill timeout (10 seconds)
  const forceKillTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out after 10s. Forcing exit.");
    process.exit(1);
  }, 10000);
  forceKillTimer.unref();

  // Step 3: Stop accepting new HTTP connections
  server.close(async () => {
    logger.info("HTTP server closed to new inbound connections.");

    try {
      // Step 4: Disconnect all active Socket.IO clients and close engine
      io.disconnectSockets(true);
      io.close();
      logger.info("Socket.IO server and active connections closed.");

      // Step 5: Close MongoDB connection cleanly
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        logger.info("MongoDB connection cleanly closed.");
      }

      logger.info("Graceful shutdown completed successfully.");
      process.exit(0);
    } catch (err) {
      logger.error("Error during graceful shutdown execution:", { error: err });
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Promise Rejection:", { reason: reason?.message || reason });
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", { error: error.message, stack: error.stack });
  handleShutdown("uncaughtException");
});

export { server, io };
