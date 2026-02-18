import express from "express";
import { protect } from "../middleware/authMiddleware";
import { getBusinessProfile, updateServices, getQueue, updateQueueStatus, updateSettings } from "../controllers/businessController";

const router = express.Router();

router.get("/me", protect, getBusinessProfile);
router.put("/services", protect, updateServices);
router.put("/settings", protect, updateSettings);
router.get("/queue", protect, getQueue);
router.put("/queue/:id/status", protect, updateQueueStatus);

export default router;
