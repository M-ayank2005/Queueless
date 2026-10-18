import express from "express";
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  deleteProfile,
  updateConsent
} from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";
import { authRateLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Public auth endpoints with brute-force rate limiting
router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);

// Protected user profile lifecycle
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteProfile);
router.post("/consent", protect, updateConsent);

export default router;
