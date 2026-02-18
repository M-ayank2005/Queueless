import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { IUser, IBusinessProfile } from "../models/User";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest } from "../middleware/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role, businessName, address } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let businessProfile: IBusinessProfile | undefined;
    if (role === "business") {
      businessProfile = {
        shopName: businessName,
        address: address,
        uniqueQrCode: uuidv4(),
        services: [],
        workingHours: {
            openTime: "09:00",
            closeTime: "17:00",
            closedDays: []
        }
      };
    }

    const newUser = new User({
      name,
      email,
      phone,
      passwordHash,
      role,
      businessProfile
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({ 
      user: { 
        id: newUser._id, 
        name: newUser.name, 
        role: newUser.role, 
        businessProfile: newUser.businessProfile 
      }, 
      token 
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        businessProfile: user.businessProfile
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update User Profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            
            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                user.passwordHash = await bcrypt.hash(req.body.password, salt);
            }
            
            const updatedUser = await user.save();
            
            // Generate new token if needed, or just return user
            const token = jwt.sign({ id: updatedUser._id, role: updatedUser.role }, JWT_SECRET, { expiresIn: "1d" });

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                businessProfile: updatedUser.businessProfile,
                token 
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
}
