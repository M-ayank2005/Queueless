import { Request, Response } from "express";
import User, { IService, IUser } from "../models/User";
import QueueEntry from "../models/QueueEntry";
import { AuthRequest } from "../middleware/authMiddleware";

// Get Business Profile (Services, QR)
export const getBusinessProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "business") {
      return res.status(404).json({ message: "Business not found" });
    }
    res.json(user.businessProfile);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update Services
export const updateServices = async (req: AuthRequest, res: Response) => {
  try {
    const { services } = req.body; // Array of { name, durationMin, cost }
    
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "business") {
      return res.status(404).json({ message: "Business not found" });
    }

    if (user.businessProfile) {
        user.businessProfile.services = services;
        await user.save(); 
    }

    res.json(user.businessProfile);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update Business Settings (Hours, Address, Name)
export const updateSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { shopName, address, workingHours } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "business") {
            return res.status(404).json({ message: "Business not found" });
        }

        if (user.businessProfile) {
            if(shopName) user.businessProfile.shopName = shopName;
            if(address) user.businessProfile.address = address;
            if(workingHours) user.businessProfile.workingHours = workingHours;
            await user.save();
        }

        res.json(user.businessProfile);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Get Today's Queue
export const getQueue = async (req: AuthRequest, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const queue = await QueueEntry.find({
      businessId: req.user.id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' } // Show everything except cancelled? Or show all. Let's show waiting/in-progress/completed
    }).populate("customerId", "name phone email").sort({ joinedAt: 1 });

    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Update Queue Status (e.g., Mark as Done)
export const updateQueueStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // waiting, in_progress, completed, cancelled

        const entry = await QueueEntry.findOne({ _id: id, businessId: req.user.id });
        if (!entry) {
            return res.status(404).json({ message: "Queue entry not found" });
        }

        if (status === "completed" || status === "cancelled") {
             entry.status = status;
             // If completed, we could set actualEndTime here
        } else {
            entry.status = status;
        }
        
        await entry.save();

        const io = req.app.get("io");
        if(io) {
            // Notify Business Dashboard (to refresh list)
            io.to(`business_${entry.businessId}`).emit("queue_updated", { type: "STATUS_CHANGE", entry });
            
            // Notify Specific Customer (for their status page)
            io.to(`queue_${id}`).emit("status_updated", entry);
        }

        res.json(entry);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
}
