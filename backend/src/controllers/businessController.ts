import { Request, Response, NextFunction } from "express";
import User, { IService } from "../models/User";
import QueueEntry from "../models/QueueEntry";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  transitionTicketStatusService,
  calculateTicketWaitEstimate,
  verifyTicketService
} from "../services/queueService";
import { getBusinessAnalyticsService } from "../services/analyticsService";
import {
  createBusinessUpdateService,
  getBusinessUpdatesService,
  deleteBusinessUpdateService
} from "../services/notificationService";

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

// Get Business Profile (Services, QR, Working Hours)
export const getBusinessProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user || user.role !== "business" || !user.businessProfile) {
      return sendNotFoundError(res, req, "Business profile not found");
    }
    return res.json(user.businessProfile);
  } catch (error) {
    return next(error);
  }
};

// Update Services Catalog
export const updateServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { services } = req.body;

    if (!Array.isArray(services)) {
      return sendValidationError(res, req, "services", "Services must be provided as an array");
    }

    // Validate each service in the catalog
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (!s.name || typeof s.name !== "string" || s.name.trim().length === 0) {
        return sendValidationError(res, req, `services[${i}].name`, `Service at index ${i} requires a valid name`);
      }
      if (typeof s.durationMin !== "number" || s.durationMin <= 0) {
        return sendValidationError(res, req, `services[${i}].durationMin`, `Service '${s.name}' must have a positive duration (minutes)`);
      }
      if (typeof s.cost !== "number" || s.cost < 0) {
        return sendValidationError(res, req, `services[${i}].cost`, `Service '${s.name}' must have a non-negative cost`);
      }
    }

    const user = await User.findById(req.user!.id);
    if (!user || user.role !== "business" || !user.businessProfile) {
      return sendNotFoundError(res, req, "Business not found");
    }

    user.businessProfile.services = services.map((s: any) => ({
      name: s.name.trim(),
      durationMin: Number(s.durationMin),
      cost: Number(s.cost)
    }));

    await user.save();
    return res.json(user.businessProfile);
  } catch (error) {
    return next(error);
  }
};

// Update Business Settings (Hours, Address, Name, Timezone)
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { shopName, address, workingHours } = req.body;

    const user = await User.findById(req.user!.id);
    if (!user || user.role !== "business" || !user.businessProfile) {
      return sendNotFoundError(res, req, "Business not found");
    }

    if (shopName !== undefined) {
      if (typeof shopName !== "string" || shopName.trim().length === 0) {
        return sendValidationError(res, req, "shopName", "Shop name cannot be empty");
      }
      user.businessProfile.shopName = shopName.trim();
    }

    if (address !== undefined) {
      if (typeof address !== "string" || address.trim().length === 0) {
        return sendValidationError(res, req, "address", "Address cannot be empty");
      }
      user.businessProfile.address = address.trim();
    }

    if (workingHours !== undefined) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (workingHours.openTime && !timeRegex.test(workingHours.openTime)) {
        return sendValidationError(res, req, "workingHours.openTime", "openTime must be in 24h HH:mm format");
      }
      if (workingHours.closeTime && !timeRegex.test(workingHours.closeTime)) {
        return sendValidationError(res, req, "workingHours.closeTime", "closeTime must be in 24h HH:mm format");
      }
      if (workingHours.closedDays && !Array.isArray(workingHours.closedDays)) {
        return sendValidationError(res, req, "workingHours.closedDays", "closedDays must be an array of day numbers (0-6)");
      }

      user.businessProfile.workingHours = {
        openTime: workingHours.openTime || user.businessProfile.workingHours?.openTime || "00:00",
        closeTime: workingHours.closeTime || user.businessProfile.workingHours?.closeTime || "23:59",
        closedDays: workingHours.closedDays !== undefined ? workingHours.closedDays : (user.businessProfile.workingHours?.closedDays || []),
        timezone: workingHours.timezone || user.businessProfile.workingHours?.timezone || "UTC"
      };
    }

    await user.save();
    return res.json(user.businessProfile);
  } catch (error) {
    return next(error);
  }
};

// Get Current Queue and Recently Processed Entries (Enriched with unified estimates)
export const getQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Fetch active queue entries (waiting or in_progress), ordered by joinedAt asc
    const activeQueueRaw = await QueueEntry.find({
      businessId: req.user!.id,
      status: { $in: ["waiting", "in_progress"] }
    })
      .populate("customerId", "name phone email")
      .sort({ joinedAt: 1 });

    // Enrich active entries with dynamic wait estimates matching customer-facing estimator
    const activeQueue = await Promise.all(
      activeQueueRaw.map(async (entry) => {
        const estimate = await calculateTicketWaitEstimate(
          req.user!.id,
          entry.joinedAt || entry.date,
          entry.status,
          entry.serviceStartedAt
        );
        return {
          ...entry.toObject(),
          peopleAhead: estimate.peopleAhead,
          currentEstimatedWait: estimate.currentEstimatedWait,
          estimatedServiceStartTime: estimate.estimatedServiceStartTime
        };
      })
    );

    // 2. Fetch recently processed entries (completed or cancelled), most recent on top, max 10
    const processedQueue = await QueueEntry.find({
      businessId: req.user!.id,
      status: { $in: ["completed", "cancelled"] }
    })
      .populate("customerId", "name phone email")
      .sort({ updatedAt: -1, joinedAt: -1 })
      .limit(10);

    return res.json([...activeQueue, ...processedQueue]);
  } catch (error) {
    return next(error);
  }
};

// Update Queue Status - delegates to QueueService
export const updateQueueStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const entry = await transitionTicketStatusService(
      id,
      req.user!.id,
      status,
      req.app.get("io")
    );

    return res.json(entry);
  } catch (error: any) {
    if (!error.status && !error.statusCode) {
      return next(error);
    }
    const statusCode = error.status || error.statusCode || 500;
    const code = statusCode === 400 ? "BAD_REQUEST" :
                 statusCode === 404 ? "RESOURCE_NOT_FOUND" :
                 statusCode === 409 ? "CONFLICT" : "INTERNAL_SERVER_ERROR";
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Server error updating ticket status",
      error: {
        code,
        message: error.message || "Server error updating ticket status",
        details: error.details || [],
        requestId: req.requestId
      },
      requestId: req.requestId
    });
  }
};

// Get Operational Analytics & Insights
export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const range = (req.query.range as string) || "7d";
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const analytics = await getBusinessAnalyticsService(
      req.user!.id,
      range,
      startDate,
      endDate
    );

    return res.json(analytics);
  } catch (error: any) {
    return next(error);
  }
};

// Verify Customer Ticket (By scanned QR token or manual ticket ID)
export const verifyQueueTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token, ticketId } = req.body;
    const io = req.app.get("io");
    const result = await verifyTicketService(req.user!.id, { token, ticketId }, io);
    return res.json(result);
  } catch (error: any) {
    if (!error.status && !error.statusCode) {
      return next(error);
    }
    const statusCode = error.status || error.statusCode || 500;
    const code = error.code || (statusCode === 400 ? "BAD_REQUEST" :
                 statusCode === 403 ? "FORBIDDEN" :
                 statusCode === 404 ? "RESOURCE_NOT_FOUND" :
                 statusCode === 409 ? "CONFLICT" : "INTERNAL_SERVER_ERROR");
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to verify ticket",
      error: {
        code,
        message: error.message || "Failed to verify ticket",
        details: error.details || [],
        requestId: req.requestId
      },
      requestId: req.requestId
    });
  }
};

// Create Business Announcement Update
export const createBusinessUpdate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, title, message, validForDays } = req.body;
    if (!type || !["alert", "offer", "info"].includes(type)) {
      return sendValidationError(res, req, "type", "type must be alert, offer, or info");
    }
    if (!title || typeof title !== "string" || !title.trim()) {
      return sendValidationError(res, req, "title", "title is required");
    }
    if (title.trim().length > 60) {
      return sendValidationError(res, req, "title", "title must be at most 60 characters");
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return sendValidationError(res, req, "message", "message is required");
    }
    if (message.trim().length > 200) {
      return sendValidationError(res, req, "message", "message must be at most 200 characters");
    }
    if (type === "offer" && validForDays !== undefined) {
      const days = Number(validForDays);
      if (isNaN(days) || days < 1 || days > 30) {
        return sendValidationError(res, req, "validForDays", "validForDays must be between 1 and 30");
      }
    }

    const update = await createBusinessUpdateService(req.user!.id, {
      type,
      title,
      message,
      validForDays: validForDays !== undefined ? Number(validForDays) : undefined
    });

    return res.status(201).json({
      success: true,
      message: "Update created successfully",
      update
    });
  } catch (error: any) {
    return next(error);
  }
};

// Get Own Business Updates
export const getBusinessUpdates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updates = await getBusinessUpdatesService(req.user!.id);
    return res.json(updates);
  } catch (error: any) {
    return next(error);
  }
};

// Delete Own Business Update
export const deleteBusinessUpdate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deleted = await deleteBusinessUpdateService(req.user!.id, id);
    if (!deleted) {
      return sendNotFoundError(res, req, "Update not found or unauthorized");
    }
    return res.json({
      success: true,
      message: "Update deleted successfully"
    });
  } catch (error: any) {
    return next(error);
  }
};


