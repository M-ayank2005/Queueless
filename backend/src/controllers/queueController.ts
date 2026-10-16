import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
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
  getSharedTicketService
} from "../services/queueService";

// Re-export timezone-aware open hours helper
export { isStoreOpenNow };

// Get Store Info by QR Code (Public with optional auth enrichment)
export const getStoreByQr = async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.params;
    const store = await User.findOne({ "businessProfile.uniqueQrCode": qrCode, role: "business" })
      .select("name businessProfile.shopName businessProfile.address businessProfile.services businessProfile.workingHours");

    if (!store || !store.businessProfile) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const workingHours = store.businessProfile.workingHours;
    const openStatus = workingHours ? isStoreOpenNow(workingHours) : { isOpen: true };

    let isFavorite = false;
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
        }
      } catch {}
    }

    return res.json({
      _id: store._id,
      name: store.name,
      businessProfile: store.businessProfile,
      isOpen: openStatus.isOpen,
      closedReason: openStatus.reason,
      isFavorite
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error retrieving store details" });
  }
};

// Join Queue (Customer) - delegates to QueueService
export const joinQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, selectedServices } = req.body;

    if (!businessId) {
      return res.status(400).json({ success: false, message: "businessId is required" });
    }

    if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
      return res.status(400).json({ success: false, message: "At least one service must be selected" });
    }

    // Verify operating hours before joining
    const businessUser = await User.findById(businessId);
    if (!businessUser || !businessUser.businessProfile || businessUser.role !== "business") {
      return res.status(404).json({ success: false, message: "Business not found or invalid" });
    }

    if (businessUser.businessProfile.workingHours) {
      const openCheck = isStoreOpenNow(businessUser.businessProfile.workingHours);
      if (!openCheck.isOpen) {
        return res.status(400).json({ success: false, message: openCheck.reason || "Store is closed" });
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
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error while joining queue",
      activeTicketId: error.activeTicketId
    });
  }
};

// Get Ticket Status (Customer / Business) - delegates to QueueService
export const getMyQueueStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getTicketStatusService(id, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error retrieving ticket status"
    });
  }
};

// Get My Active Queues (Customer) - delegates to QueueService
export const getMyQueues = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getCustomerActiveQueuesService(req.user!.id);
    return res.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error retrieving active queues"
    });
  }
};

// Cancel Queue Ticket (Customer self-service) - delegates to QueueService
export const cancelQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { queueId } = req.body;
    if (!queueId) {
      return res.status(400).json({ success: false, message: "queueId is required" });
    }

    const entry = await cancelCustomerTicketService(queueId, req.user!.id, req.app.get("io"));
    return res.json({ success: true, message: "Queue entry cancelled successfully", entry });
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error cancelling ticket"
    });
  }
};

// Get Queue History (Customer) with Cursor Pagination Support
export const getQueueHistory = async (req: AuthRequest, res: Response) => {
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
    return res.status(500).json({ success: false, message: "Internal server error retrieving history" });
  }
};

// Toggle Store in Customer Favorites
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ success: false, message: "businessId is required" });
    }

    const result = await toggleFavoriteService(req.user!.id, businessId);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || "Failed to toggle favorite" });
  }
};

// Get Customer Favorited Stores with Live Telemetry
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const favorites = await getCustomerFavoritesService(req.user!.id);
    return res.json(favorites);
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || "Failed to fetch favorites" });
  }
};

// 1-Click Quick Rebook Queue Entry
export const quickRebookQueue = async (req: AuthRequest, res: Response) => {
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
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Quick rebook failed",
      activeTicketId: error.activeTicketId
    });
  }
};

// Generate / Retrieve Shareable Link (Protected: Customer or Business)
export const generateTicketShareToken = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await generateTicketShareTokenService(id, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || "Failed to generate share link" });
  }
};

// Revoke Shareable Link (Protected: Customer or Business)
export const revokeTicketShareToken = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const io = req.app.get("io");
    const result = await revokeTicketShareTokenService(id, req.user!.id, io);
    return res.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || "Failed to revoke share link" });
  }
};

// Public Guest-Accessible Shared Ticket Status Lookup (Sanitized, No PII)
export const getSharedTicket = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;
    const result = await getSharedTicketService(shareToken);
    return res.json(result);
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || "Shared ticket not found" });
  }
};
