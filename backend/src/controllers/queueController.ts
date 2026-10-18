import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User";
import QueueEntry from "../models/QueueEntry";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  calculateTicketWaitEstimate,
  joinQueueService,
  getTicketStatusService,
  getCustomerActiveQueuesService,
  cancelCustomerTicketService,
  getCustomerHistoryService,
  isStoreOpenNow,
  toggleFavoriteService,
  getCustomerFavoritesService,
  quickRebookService,
  generateTicketShareTokenService,
  revokeTicketShareTokenService,
  getSharedTicketService,
  editCustomerTicketService,
  revokeTicketVerificationTokenService
} from "../services/queueService";

// Re-export timezone-aware open hours helper
export { isStoreOpenNow };

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

const sendNotFoundError = (res: Response, req: Request, message: string = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
    error: {
      code: "RESOURCE_NOT_FOUND",
      message,
      details: [],
      requestId: req.requestId
    },
    requestId: req.requestId
  });
};

const handleQueueError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
  fallbackMessage: string
) => {
  if (!error.status && !error.statusCode) {
    return next(error);
  }
  const status = error.status || error.statusCode || 500;
  const message = error.message || fallbackMessage;
  const code = status === 400 ? "BAD_REQUEST" :
               status === 401 ? "UNAUTHORIZED" :
               status === 403 ? "FORBIDDEN" :
               status === 404 ? "RESOURCE_NOT_FOUND" :
               status === 409 ? "CONFLICT" :
               status === 410 ? "GONE" :
               status === 429 ? "RATE_LIMITED" : "INTERNAL_SERVER_ERROR";

  const extraFields: Record<string, any> = {};
  if (error.activeTicketId) {
    extraFields.activeTicketId = error.activeTicketId;
  }
  if (error.activeTicket) {
    extraFields.activeTicket = error.activeTicket;
  }

  return res.status(status).json({
    success: false,
    message,
    error: {
      code,
      message,
      details: error.details || [],
      requestId: req.requestId,
      ...extraFields
    },
    requestId: req.requestId,
    ...extraFields
  });
};

// Get Store Info by QR Code or Merchant ID (Public with optional auth enrichment)
export const getStoreByQr = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCode } = req.params;
    if (!qrCode || typeof qrCode !== "string") {
      return sendNotFoundError(res, req, "Store not found");
    }

    const trimmedCode = qrCode.trim();
    const isObjectId = mongoose.isValidObjectId(trimmedCode);

    const store = await User.findOne({
      role: "business",
      ...(isObjectId
        ? {
            $or: [
              { _id: trimmedCode },
              { "businessProfile.uniqueQrCode": trimmedCode }
            ]
          }
        : { "businessProfile.uniqueQrCode": trimmedCode })
    }).select("name businessProfile.shopName businessProfile.address businessProfile.uniqueQrCode businessProfile.services businessProfile.workingHours");

    if (!store || !store.businessProfile) {
      return sendNotFoundError(res, req, "Store not found");
    }

    const effectiveQrCode = store.businessProfile.uniqueQrCode || store._id.toString();
    const workingHours = store.businessProfile.workingHours;
    const openStatus = workingHours ? isStoreOpenNow(workingHours) : { isOpen: true };

    let isFavorite = false;
    let activeTicket: any = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET || "your_jwt_secret_key";
        const decoded: any = jwt.verify(token, secret);
        if (decoded && decoded.id) {
          const user = await User.findById(decoded.id).select("favoriteBusinesses");
          if (user?.favoriteBusinesses) {
            isFavorite = user.favoriteBusinesses.some(id => id.toString() === store._id.toString());
          }

          const existingActiveTicket = await QueueEntry.findOne({
            businessId: store._id,
            customerId: decoded.id,
            status: { $in: ["waiting", "in_progress"] }
          });

          if (existingActiveTicket) {
            const estimate = await calculateTicketWaitEstimate(
              store._id,
              existingActiveTicket.joinedAt || existingActiveTicket.date,
              existingActiveTicket.status,
              existingActiveTicket.serviceStartedAt
            );
            activeTicket = {
              _id: existingActiveTicket._id,
              status: existingActiveTicket.status,
              selectedServices: existingActiveTicket.selectedServices,
              joinedAt: existingActiveTicket.joinedAt,
              totalEstimatedTime: existingActiveTicket.totalEstimatedTime,
              peopleAhead: estimate.peopleAhead,
              currentEstimatedWait: estimate.currentEstimatedWait,
              estimatedServiceStartTime: estimate.estimatedServiceStartTime,
              verifiedAt: existingActiveTicket.verifiedAt,
              verificationToken: existingActiveTicket.verificationToken
            };
          }
        }
      } catch {}
    }

    return res.json({
      _id: store._id,
      name: store.name,
      businessProfile: {
        ...(typeof (store.businessProfile as any)?.toObject === "function"
          ? (store.businessProfile as any).toObject()
          : store.businessProfile),
        uniqueQrCode: effectiveQrCode
      },
      uniqueQrCode: effectiveQrCode,
      qrCode: effectiveQrCode,
      isOpen: openStatus.isOpen,
      closedReason: openStatus.reason,
      isFavorite,
      activeTicket
    });
  } catch (error) {
    return next(error);
  }
};

// Join Queue (Customer / Business) - delegates to QueueService
export const joinQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { businessId, selectedServices } = req.body;

    if (!businessId) {
      return sendValidationError(res, req, "businessId", "businessId is required");
    }

    if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
      return sendValidationError(res, req, "selectedServices", "At least one service must be selected");
    }

    // Verify operating hours before joining
    const businessUser = await User.findById(businessId);
    if (!businessUser || !businessUser.businessProfile || businessUser.role !== "business") {
      return sendNotFoundError(res, req, "Business not found or invalid");
    }

    if (businessUser.businessProfile.workingHours) {
      const openCheck = isStoreOpenNow(businessUser.businessProfile.workingHours);
      if (!openCheck.isOpen) {
        return res.status(400).json({
          success: false,
          message: openCheck.reason || "Store is closed",
          error: {
            code: "STORE_CLOSED",
            message: openCheck.reason || "Store is closed",
            details: [],
            requestId: req.requestId
          },
          requestId: req.requestId
        });
      }
    }

    const result = await joinQueueService(
      req.user!.id,
      req.user!.name || "Customer",
      businessId,
      selectedServices,
      req.app.get("io")
    );

    return res.status(201).json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Server error while joining queue");
  }
};

// Get Ticket Status (Customer / Business) - delegates to QueueService
export const getMyQueueStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await getTicketStatusService(id, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Server error retrieving ticket status");
  }
};

// Get My Active Queues (Customer / Business) - delegates to QueueService
export const getMyQueues = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await getCustomerActiveQueuesService(req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Server error retrieving active queues");
  }
};

// Cancel Queue Ticket (Customer self-service) - delegates to QueueService
export const cancelQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { queueId } = req.body;
    if (!queueId) {
      return sendValidationError(res, req, "queueId", "queueId is required");
    }

    const entry = await cancelCustomerTicketService(queueId, req.user!.id, req.app.get("io"));
    return res.json({ success: true, message: "Queue entry cancelled successfully", entry });
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Server error cancelling ticket");
  }
};

// Get Queue History (Customer) with Cursor Pagination Support
export const getQueueHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const cursor = req.query.cursor as string | undefined;
    const isPaginated = req.query.paginated === "true";

    const { items, nextCursor, hasMore } = await getCustomerHistoryService(
      req.user!.id,
      limit,
      cursor
    );

    // Set cursor pagination response headers
    if (nextCursor) res.setHeader("X-Next-Cursor", nextCursor);
    res.setHeader("X-Has-More", String(hasMore));

    if (isPaginated) {
      return res.json({ items, nextCursor, hasMore });
    }

    // Default: Return direct array for 100% backward compatibility
    return res.json(items);
  } catch (error: any) {
    return next(error);
  }
};

// Toggle Store in Customer Favorites
export const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return sendValidationError(res, req, "businessId", "businessId is required");
    }

    const result = await toggleFavoriteService(req.user!.id, businessId);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Failed to toggle favorite");
  }
};

// Get Customer Favorited Stores with Live Telemetry
export const getFavorites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const favorites = await getCustomerFavoritesService(req.user!.id);
    return res.json(favorites);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Failed to fetch favorites");
  }
};

// 1-Click Quick Rebook Queue Entry
export const quickRebookQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { businessId, pastTicketId, serviceNames } = req.body;
    const io = req.app.get("io");

    const result = await quickRebookService(
      req.user!.id,
      req.user!.name || "Customer",
      { businessId, pastTicketId, serviceNames },
      io
    );

    return res.status(201).json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Quick rebook failed");
  }
};

// Generate / Retrieve Shareable Link (Protected: Customer or Business)
export const generateTicketShareToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await generateTicketShareTokenService(id, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Failed to generate share link");
  }
};

// Revoke Shareable Link (Protected: Customer or Business)
export const revokeTicketShareToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const io = req.app.get("io");
    const result = await revokeTicketShareTokenService(id, req.user!.id, io);
    return res.json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Failed to revoke share link");
  }
};

// Public Guest-Accessible Shared Ticket Status Lookup (Sanitized, No PII)
export const getSharedTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shareToken } = req.params;
    const result = await getSharedTicketService(shareToken);
    return res.json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Shared ticket not found");
  }
};

// Edit Active Ticket Services (Protected: Customer or Business)
export const editTicketServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { selectedServices } = req.body;

    if (!selectedServices || !Array.isArray(selectedServices)) {
      return sendValidationError(res, req, "selectedServices", "selectedServices must be provided as an array");
    }

    const io = req.app.get("io");
    const result = await editCustomerTicketService(id, req.user!.id, selectedServices, io);
    return res.json({
      success: true,
      message: "Ticket services updated successfully",
      entry: result
    });
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Failed to edit ticket services");
  }
};

// Revoke or Regenerate Ticket Verification Token (Protected: Customer or Business)
export const revokeTicketVerificationToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const regenerate = req.body.regenerate !== false;
    const result = await revokeTicketVerificationTokenService(id, req.user!.id, regenerate);
    return res.json(result);
  } catch (error: any) {
    return handleQueueError(error, req, res, next, "Failed to update verification token");
  }
};

