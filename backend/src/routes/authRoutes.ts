import express from "express";
import { register, login, updateProfile } from "../controllers/authController";
import { getBusinessProfile } from "../controllers/businessController";
import { protect } from "../middleware/authMiddleware";
import User from "../models/User";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Profile Management
router.get("/profile", protect, async (req: any, res) => {
    try {
        const user = await User.findById(req.user.id).select("-passwordHash");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            businessProfile: user.businessProfile
        });
    } catch(e) {
        res.status(500).json({ message: "Server Error" });
    }
});

router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, async (req: any, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: "Account deleted" });
    } catch(error) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
