import express from "express";
import { handleSupportChat, getSupportMeta } from "../controllers/supportController";
import { protect } from "../middleware/authMiddleware";
import { supportRateLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Public metadata (AI status, contact email, legal versions)
router.get("/meta", getSupportMeta);

// Authenticated AI Support Chat with per-user rate limiting and personal context scoping
router.post("/chat", protect, supportRateLimiter, handleSupportChat);

export default router;
