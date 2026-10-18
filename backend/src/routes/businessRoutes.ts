import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware";
import { 
  getBusinessProfile, 
  updateServices, 
  getQueue, 
  updateQueueStatus, 
  updateSettings,
  getAnalytics,
  verifyQueueTicket
} from "../controllers/businessController";

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

export default router;
