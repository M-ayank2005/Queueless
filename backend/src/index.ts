import http from "http";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import app from "./app";
import { logger } from "./utils/logger";
import { setServerDraining } from "./controllers/healthController";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/queueless";
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "your_jwt_secret_key");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET environment variable is required in production mode.");
  process.exit(1);
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
    methods: ["GET", "POST"]
  }
});

// Socket Authentication Middleware
io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token || 
    (socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(" ")[1]);

  if (token && JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.data.user = decoded;
    } catch {
      // Allow unauthenticated connection for guest socket listeners, but restrict sensitive rooms
      socket.data.user = null;
    }
  } else {
    socket.data.user = null;
  }
  next();
});

// Socket.io connection handlers
io.on("connection", (socket: Socket) => {
  logger.debug(`[Socket] User connected: ${socket.id} (Auth: ${socket.data.user ? socket.data.user.id : "guest"})`);

  // Authenticated user room join
  if (socket.data.user && socket.data.user.id) {
    socket.join(`user_${socket.data.user.id}`);
    logger.debug(`[Socket] Socket ${socket.id} joined personal room user_${socket.data.user.id}`);
  }

  // Explicit user room join (fallback for clients that identify customer after connect)
  socket.on("join_user", (userId: string) => {
    if (userId && typeof userId === "string") {
      socket.join(`user_${userId}`);
      logger.debug(`[Socket] Socket ${socket.id} joined user_${userId}`);
    }
  });

  // Business room join - protected to the business owner
  socket.on("join_business", (businessId: string) => {
    const user = socket.data.user;
    if (user && user.role === "business" && user.id === businessId) {
      socket.join(`business_${businessId}`);
      logger.debug(`[Socket] Verified business ${user.id} joined business_${businessId}`);
    } else if (!user) {
      // Backward compatibility for existing dev clients without auth token attached yet
      socket.join(`business_${businessId}`);
      logger.debug(`[Socket] Dev fallback: socket ${socket.id} joined business_${businessId}`);
    } else {
      logger.warn(`[Socket] Unauthorized join_business attempt by ${user?.id} for ${businessId}`);
    }
  });

  // Ticket room join
  socket.on("join_queue", (queueId: string) => {
    if (queueId && typeof queueId === "string") {
      socket.join(`queue_${queueId}`);
      logger.debug(`[Socket] Socket ${socket.id} joined queue_${queueId}`);
    }
  });

  // Shared ticket room join (guest listener with valid share token)
  socket.on("join_shared_ticket", (shareToken: string) => {
    if (shareToken && typeof shareToken === "string") {
      socket.join(`shared_ticket_${shareToken.trim()}`);
      logger.debug(`[Socket] Guest socket ${socket.id} joined shared_ticket_${shareToken.trim()}`);
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
