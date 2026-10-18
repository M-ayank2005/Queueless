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
  getSharedTicket,
  editTicketServices,
  revokeTicketVerificationToken
} from "../controllers/queueController";
import { queueMutationRateLimiter, sharedTicketRateLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Public: Get Store Information by QR Code
router.get("/store/:qrCode", getStoreByQr);

// Public: Guest-accessible sanitized shared ticket tracking (Zero PII leaked, rate-limited)
router.get("/shared/:shareToken", sharedTicketRateLimiter, getSharedTicket);

// Protected: Queue routes accessible to all authenticated users
router.get("/my-queues", protect, getMyQueues);
router.get("/history", protect, getQueueHistory);
router.post("/join", protect, queueMutationRateLimiter, joinQueue);
router.post("/cancel", protect, queueMutationRateLimiter, cancelQueue);

// Protected: Favorites & 1-click quick rebooking
router.get("/favorites", protect, getFavorites);
router.post("/favorites/toggle", protect, toggleFavorite);
router.post("/quick-rebook", protect, queueMutationRateLimiter, quickRebookQueue);

// Protected: Ticket status tracking (authenticated customer or owning business)
router.get("/status/:id", protect, getMyQueueStatus);

// Protected: Edit services on active waiting ticket
router.put("/:id/services", protect, queueMutationRateLimiter, editTicketServices);

// Protected: Ticket share link generation and revocation
router.post("/:id/share", protect, generateTicketShareToken);
router.delete("/:id/share", protect, revokeTicketShareToken);

// Protected: Ticket verification token revocation/regeneration
router.post("/:id/verification/revoke", protect, revokeTicketVerificationToken);

export default router;
