import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User";

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET must be configured in production.");
    }
    return "dev_queueless_jwt_secret_key_change_in_prod";
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("FATAL: JWT_SECRET must be at least 32 characters long in production.");
  }
  return secret;
};

export const verifyJwtToken = (token: string): UserPayload => {
  return jwt.verify(token, getJwtSecret()) as UserPayload;
};

export const VALID_ROLES = ["customer", "business"] as const;
export type ValidRole = typeof VALID_ROLES[number];

export interface UserPayload {
  id: string;
  role: ValidRole;
  name?: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const socketAuthMiddleware = (socket: any, next: (err?: any) => void) => {
  const token = socket.handshake?.auth?.token || 
    (socket.handshake?.headers?.authorization && socket.handshake.headers.authorization.split(" ")[1]);

  if (token) {
    try {
      const decoded = verifyJwtToken(token);
      if (decoded && decoded.id && VALID_ROLES.includes(decoded.role)) {
        socket.data = socket.data || {};
        socket.data.user = decoded;
      } else {
        socket.data = socket.data || {};
        socket.data.user = null;
      }
    } catch {
      // Allow unauthenticated connection for guest socket listeners, but restrict sensitive rooms
      socket.data = socket.data || {};
      socket.data.user = null;
    }
  } else {
    socket.data = socket.data || {};
    socket.data.user = null;
  }
  next();
};

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no Bearer token provided"
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token missing"
    });
  }

  try {
    const decoded = verifyJwtToken(token);
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token payload"
      });
    }

    // Validate user ID format (MongoDB ObjectId)
    if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid account identifier"
      });
    }

    // Role allowlist enforcement
    if (!VALID_ROLES.includes(decoded.role)) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid account role claim"
      });
    }

    // Fail closed if database is unavailable
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable, authentication database unreachable"
      });
    }

    // Live account lookup
    let user;
    try {
      user = await User.findById(decoded.id).select("_id role name email");
    } catch {
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable, failed to verify account"
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user account no longer exists"
      });
    }

    if (user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, account role mismatch"
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email
    };

    return next();
  } catch (error: any) {
    const message = error.name === "TokenExpiredError" 
      ? "Not authorized, token has expired" 
      : "Not authorized, token verification failed";

    return res.status(401).json({
      success: false,
      message
    });
  }
};

export const requireRole = (role: ValidRole) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no user session"
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: this action requires '${role}' role, but your account is '${req.user.role}'`
      });
    }

    return next();
  };
};
