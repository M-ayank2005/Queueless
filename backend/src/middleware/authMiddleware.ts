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
  return secret;
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
    const decoded = jwt.verify(token, getJwtSecret()) as UserPayload;
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token payload"
      });
    }

    // Role allowlist enforcement
    if (!VALID_ROLES.includes(decoded.role)) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid account role claim"
      });
    }

    // User existence and active status verification against live database
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
      const user = await User.findById(decoded.id).select("_id role name email");
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
    } else {
      req.user = decoded;
    }

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
