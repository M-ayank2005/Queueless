import { Request, Response } from "express";
import User from "../models/User";
import QueueEntry, { IQueueEntry } from "../models/QueueEntry";
import { AuthRequest } from "../middleware/authMiddleware";

// Get Store Info by QR Code (Public)
export const getStoreByQr = async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.params;
    const store = await User.findOne({ "businessProfile.uniqueQrCode": qrCode, role: "business" })
      .select("name businessProfile.shopName businessProfile.address businessProfile.services");
      
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Join Queue
export const joinQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, selectedServices } = req.body; 
    
    // 1. Check if Business exists and is OPEN
    const businessUser = await User.findById(businessId);
    if (!businessUser || !businessUser.businessProfile) {
         return res.status(404).json({ message: "Business not found" });
    }

    const { workingHours } = businessUser.businessProfile;
    if (workingHours) {
        const now = new Date();
        const currentDay = now.getDay(); // 0-6
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes from midnight

        // Check Closed Days
        if (workingHours.closedDays && workingHours.closedDays.includes(currentDay)) {
            return res.status(400).json({ message: "Shop is closed today" });
        }

        // Check Time
        const [openH, openM] = workingHours.openTime.split(":").map(Number);
        const [closeH, closeM] = workingHours.closeTime.split(":").map(Number);
        const openMin = openH * 60 + openM;
        const closeMin = closeH * 60 + closeM;

        if (currentTime < openMin || currentTime > closeMin) {
             return res.status(400).json({ message: `Shop is closed. Open from ${workingHours.openTime} to ${workingHours.closeTime}` });
        }
    }

    // Calculate total duration for this user
    const userDuration = selectedServices.reduce((acc: number, curr: any) => acc + curr.durationMin, 0);

    // Get current queue for this business to calculate estimated wait time
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const activeQueue = await QueueEntry.find({
      businessId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["waiting", "in_progress"] }
    });

    // Calculate wait time: Sum of durations of all people ahead
    let waitTime = activeQueue.reduce((acc, entry) => {
        const entryDuration = entry.selectedServices.reduce((sAcc, s) => sAcc + s.durationMin, 0);
        return acc + entryDuration;
    }, 0);

    const newEntry = new QueueEntry({
      businessId,
      customerId: req.user.id,
      customerName: req.user.name || "Customer", 
      date: new Date(),
      selectedServices,
      totalEstimatedTime: waitTime,
      status: "waiting"
    });

    await newEntry.save();
    
    // Emit socket event to Business
    const io = req.app.get("io");
    if(io) {
        io.to(`business_${businessId}`).emit("queue_updated", { type: "JOIN", entry: newEntry });
    }
    
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get My Queue Status (Customer)
export const getMyQueueStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // QueueEntry ID
        const entry = await QueueEntry.findById(id).populate("businessId", "businessProfile.shopName");
        
        if (!entry) return res.status(404).json({ message: "Queue entry not found" });

        // Recalculate wait time dynamically
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        // Find all active entries for this business created BEFORE this entry
        const peopleAhead = await QueueEntry.find({
            businessId: entry.businessId,
            date: { $gte: startOfDay },
            status: { $in: ["waiting", "in_progress"] },
            joinedAt: { $lt: entry.joinedAt }
        });

        const updatedWaitTime = peopleAhead.reduce((acc, p) => {
             const d = p.selectedServices.reduce((s, i) => s + i.durationMin, 0);
             return acc + d;
        }, 0);

        res.json({
            ...entry.toObject(),
            peopleAhead: peopleAhead.length,
            currentEstimatedWait: updatedWaitTime
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
}

// Get My Queues (Customer)
export const getMyQueues = async (req: AuthRequest, res: Response) => {
    try {
        const queues = await QueueEntry.find({ 
            customerId: req.user.id,
            status: { $in: ['waiting', 'in_progress'] } // Active only
        })
        .populate('businessId', 'businessProfile.shopName businessProfile.address')
        .sort({ joinedAt: -1 });

        // Calculate dynamic wait times for each
        const result = await Promise.all(queues.map(async (q) => {
            const position = await QueueEntry.countDocuments({
                businessId: q.businessId._id,
                date: q.date,
                status: { $in: ['waiting', 'in_progress'] },
                joinedAt: { $lt: q.joinedAt }
            });
            
            return {
                ...q.toObject(),
                peopleAhead: position,
                currentEstimatedWait: (position + 1) * 10 // Mock 10 mins per person for now
            };
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Get Queue History
export const getQueueHistory = async (req: AuthRequest, res: Response) => {
    try {
        const history = await QueueEntry.find({
            customerId: req.user.id,
            status: { $in: ["completed", "cancelled"] }
        })
        .sort({ date: -1 }) // Newest first
        .limit(20)
        .populate("businessId", "businessProfile.shopName"); // Changed to businessProfile.shopName to match existing schema
        
        res.json(history);
    } catch (error) {
         res.status(500).json({ message: "Server error", error });
    }
};
