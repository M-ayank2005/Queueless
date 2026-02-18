import express from "express";
import { register, login, updateProfile } from "../controllers/authController";
import { getBusinessProfile } from "../controllers/businessController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Profile Management
router.get("/profile", protect, async (req: any, res) => {
    // If business, return business profile. If customer, return basic info?
    // Actually, getBusinessProfile is for business. 
    // Let's make a generic getProfile or re-use based on role?
    // For now, let's just return the user object sans password.
    try {
        const user = await req.user;
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            businessProfile: user.businessProfile
        });
    } catch(e) {
        res.status(500).json({message: "Server Error"});
    }
});

router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, async (req: any, res) => {
    try {
        await req.user.deleteOne();
        res.json({ message: "Account deleted" });
    } catch(error) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
