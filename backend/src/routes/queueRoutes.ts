import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware";
import { 
  getStoreByQr, 
  joinQueue, 
  getMyQueueStatus, 
  getMyQueues, 
  getQueueHistory,
  cancelQueue,
  toggleFavorite,
  getFavorites,
  quickRebookQueue,
  generateTicketShareToken,
  revokeTicketShareToken,
  getSharedTicket
} from "../controllers/queueController";
import { queueMutationRateLimiter, sharedTicketRateLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Public: Get Store Information by QR Code
router.get("/store/:qrCode", getStoreByQr);

// Public: Guest-accessible sanitized shared ticket tracking (Zero PII leaked, rate-limited)
router.get("/shared/:shareToken", sharedTicketRateLimiter, getSharedTicket);

// Protected: Customer-specific queue routes
router.get("/my-queues", protect, requireRole("customer"), getMyQueues);
router.get("/history", protect, requireRole("customer"), getQueueHistory);
router.post("/join", protect, requireRole("customer"), queueMutationRateLimiter, joinQueue);
router.post("/cancel", protect, requireRole("customer"), queueMutationRateLimiter, cancelQueue);

// Protected: Customer favorites & 1-click quick rebooking
router.get("/favorites", protect, requireRole("customer"), getFavorites);
router.post("/favorites/toggle", protect, requireRole("customer"), toggleFavorite);
router.post("/quick-rebook", protect, requireRole("customer"), queueMutationRateLimiter, quickRebookQueue);

// Protected: Ticket status tracking (authenticated customer or owning business)
router.get("/status/:id", protect, getMyQueueStatus);

// Protected: Ticket share link generation and revocation
router.post("/:id/share", protect, generateTicketShareToken);
router.delete("/:id/share", protect, revokeTicketShareToken);

export default router;
