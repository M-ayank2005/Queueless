import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, {
  IUser,
  IBusinessProfile,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_POLICY_VERSION
} from "../models/User";
import QueueEntry from "../models/QueueEntry";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest, getJwtSecret } from "../middleware/authMiddleware";

const sendValidationError = (res: Response, req: Request, field: string, message: string) => {
  return res.status(400).json({
    success: false,
    message,
    error: {
      code: "VALIDATION_ERROR",
      message,
      details: [{ field, message }],
      requestId: req.requestId
    },
    requestId: req.requestId
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      businessName,
      address,
      timezone,
      agreedToTerms,
      privacyPolicyAcknowledged
    } = req.body;

    // 1. Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return sendValidationError(res, req, "name", "Name must be at least 2 characters long");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return sendValidationError(res, req, "email", "Please provide a valid email address");
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 5) {
      return sendValidationError(res, req, "phone", "Please provide a valid phone number");
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return sendValidationError(res, req, "password", "Password must be at least 6 characters long");
    }

    if (role !== "customer" && role !== "business") {
      return sendValidationError(res, req, "role", "Role must be either 'customer' or 'business'");
    }

    if (role === "business") {
      if (!businessName || typeof businessName !== "string" || businessName.trim().length === 0) {
        return sendValidationError(res, req, "businessName", "Business name is required for business accounts");
      }
      if (!address || typeof address !== "string" || address.trim().length === 0) {
        return sendValidationError(res, req, "address", "Business address is required for business accounts");
      }
    }

    // 2. Legal Terms & Privacy Consent Enforcement (Server-Enforced)
    if (agreedToTerms !== true) {
      return sendValidationError(res, req, "agreedToTerms", "You must agree to the Terms and Conditions to create an account");
    }

    if (privacyPolicyAcknowledged !== true) {
      return sendValidationError(res, req, "privacyPolicyAcknowledged", "You must acknowledge the Privacy Policy to create an account");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
        error: {
          code: "DUPLICATE_KEY_CONFLICT",
          message: "An account with this email already exists",
          details: [{ field: "email", message: "Email is already registered" }],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }

    // 3. Password Hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Business Profile Setup
    let businessProfile: IBusinessProfile | undefined;
    if (role === "business") {
      businessProfile = {
        shopName: businessName.trim(),
        address: address.trim(),
        uniqueQrCode: uuidv4(),
        services: [],
        workingHours: {
          openTime: "00:00",
          closeTime: "23:59",
          closedDays: [],
          timezone: timezone || "UTC"
        }
      };
    }

    // 5. Authoritative Server-Generated Legal Consent Metadata
    const acceptedAt = new Date();
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const clientUserAgent = req.headers["user-agent"];

    const legalConsent = {
      agreedToTerms: true,
      privacyPolicyAcknowledged: true,
      acceptedAt,
      termsVersion: CURRENT_TERMS_VERSION,
      privacyPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      ipAddress: clientIp,
      userAgent: clientUserAgent
    };

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      role,
      businessProfile,
      legalConsent
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, name: newUser.name, email: newUser.email },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        businessProfile: newUser.businessProfile,
        legalConsent: newUser.legalConsent
      },
      token
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const missingField = !email ? "email" : "password";
      return sendValidationError(res, req, missingField, "Email and password are required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          details: [],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          details: [],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        businessProfile: user.businessProfile,
        legalConsent: user.legalConsent
      },
      token
    });
  } catch (error) {
    return next(error);
  }
};

// Get User Profile
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "User not found",
          details: [],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      businessProfile: user.businessProfile,
      legalConsent: user.legalConsent
    });
  } catch (error) {
    return next(error);
  }
};

// Update Legal Consent for Existing User
export const updateConsent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { agreedToTerms, privacyPolicyAcknowledged } = req.body;

    if (agreedToTerms !== true) {
      return sendValidationError(res, req, "agreedToTerms", "You must agree to the Terms and Conditions");
    }

    if (privacyPolicyAcknowledged !== true) {
      return sendValidationError(res, req, "privacyPolicyAcknowledged", "You must acknowledge the Privacy Policy");
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "User not found",
          details: [],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const clientUserAgent = req.headers["user-agent"];
    const now = new Date();

    user.legalConsent = {
      agreedToTerms: true,
      privacyPolicyAcknowledged: true,
      acceptedAt: user.legalConsent?.acceptedAt || now, // preserve initial acceptance timestamp
      latestAcceptedAt: now,
      termsVersion: CURRENT_TERMS_VERSION,
      privacyPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      ipAddress: clientIp,
      userAgent: clientUserAgent
    };

    await user.save();

    return res.json({
      success: true,
      message: "Legal consent successfully recorded",
      legalConsent: user.legalConsent,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
};

// Update User Profile
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "User not found",
          details: [],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }

    if (req.body.name && typeof req.body.name === "string" && req.body.name.trim().length >= 2) {
      user.name = req.body.name.trim();
    }

    if (req.body.email && typeof req.body.email === "string") {
      const newEmail = req.body.email.toLowerCase().trim();
      if (newEmail !== user.email) {
        const emailTaken = await User.findOne({ email: newEmail });
        if (emailTaken) {
          return res.status(400).json({
            success: false,
            message: "Email already taken by another account",
            error: {
              code: "DUPLICATE_KEY_CONFLICT",
              message: "Email already taken by another account",
              details: [{ field: "email", message: "Email already taken by another account" }],
              requestId: req.requestId
            },
            requestId: req.requestId
          });
        }
        user.email = newEmail;
      }
    }

    if (req.body.phone && typeof req.body.phone === "string" && req.body.phone.trim().length >= 5) {
      user.phone = req.body.phone.trim();
    }

    if (req.body.password && typeof req.body.password === "string") {
      if (req.body.password.length < 6) {
        return sendValidationError(res, req, "password", "New password must be at least 6 characters long");
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(req.body.password, salt);
    }

    // Role cannot be changed via profile update (immutable for security)
    const updatedUser = await user.save();

    const token = jwt.sign(
      { id: updatedUser._id, role: updatedUser.role, name: updatedUser.name, email: updatedUser.email },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      businessProfile: updatedUser.businessProfile,
      token
    });
  } catch (error) {
    return next(error);
  }
};

// Delete User Account (with cascading queue cleanup)
export const deleteProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "User not found",
          details: [],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }

    // Clean up active queues to prevent orphaned tickets
    const now = new Date();
    if (user.role === "customer") {
      await QueueEntry.updateMany(
        { customerId: userId, status: { $in: ["waiting", "in_progress"] } },
        { $set: { status: "cancelled", cancelledAt: now } }
      );
    } else if (user.role === "business") {
      await QueueEntry.updateMany(
        { businessId: userId, status: { $in: ["waiting", "in_progress"] } },
        { $set: { status: "cancelled", cancelledAt: now } }
      );
    }

    await User.findByIdAndDelete(userId);
    return res.json({ success: true, message: "Account and associated active queues cancelled successfully" });
  } catch (error) {
    return next(error);
  }
};
