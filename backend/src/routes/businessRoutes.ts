import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware";
import { 
  getBusinessProfile, 
  updateServices, 
  getQueue, 
  updateQueueStatus, 
  updateSettings,
  getAnalytics,
  verifyQueueTicket,
  createBusinessUpdate,
  getBusinessUpdates,
  deleteBusinessUpdate
} from "../controllers/businessController";
import { businessUpdateRateLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Enforce authentication AND business role on all business endpoints
router.use(protect, requireRole("business"));

router.get("/me", getBusinessProfile);
router.put("/services", updateServices);
router.put("/settings", updateSettings);
router.get("/queue", getQueue);
router.post("/queue/verify", verifyQueueTicket);
router.put("/queue/:id/status", updateQueueStatus);
router.get("/analytics", getAnalytics);

// Business Updates / Announcements (Rate limited to 10/hour per business)
router.post("/updates", businessUpdateRateLimiter, createBusinessUpdate);
router.get("/updates", getBusinessUpdates);
router.delete("/updates/:id", deleteBusinessUpdate);

export default router;
