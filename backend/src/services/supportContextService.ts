import mongoose from "mongoose";
import User from "../models/User";
import QueueEntry from "../models/QueueEntry";
import { logger } from "../utils/logger";

export interface SanitizedTicketDTO {
  ticketId: string;
  ticketRef: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  businessName: string;
  joinedAt: string;
  services: Array<{
    name: string;
    quantity: number;
    durationMin: number;
  }>;
  totalEstimatedDurationMin: number;
  isVerified: boolean;
}

export interface SanitizedBusinessContextDTO {
  shopName: string;
  address?: string;
  workingHours?: {
    openTime: string;
    closeTime: string;
    closedDays: number[];
    timezone?: string;
  };
  catalogServices: Array<{
    name: string;
    durationMin: number;
    cost: number;
  }>;
  activeQueueSummary: {
    totalActive: number;
    waitingCount: number;
    inProgressCount: number;
    nextUpTickets: Array<{
      ticketRef: string;
      customerName: string;
      status: string;
      serviceNames: string[];
    }>;
  };
}

export interface SanitizedSupportContext {
  role: "customer" | "business";
  userName: string;
  customerTickets?: SanitizedTicketDTO[];
  specificTicket?: SanitizedTicketDTO | null;
  businessContext?: SanitizedBusinessContextDTO;
}

/**
 * Strict Personal-Context Builder for AI Support.
 *
 * Enforces:
 * 1. Derives identity solely from verified JWT payload (userId).
 * 2. Strictly scopes DB queries by customerId or businessId.
 * 3. Never retrieves or exposes data from other accounts.
 * 4. Strips passwords, password hashes, tokens, verification secrets, and sensitive credentials.
 */
export const buildPersonalSupportContext = async (
  userId: string,
  userRole: "customer" | "business",
  specificTicketId?: string
): Promise<SanitizedSupportContext> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user identifier for support context");
  }

  const user = await User.findById(userId).select("name email role businessProfile");
  if (!user) {
    throw new Error("Authenticated user record not found");
  }

  const context: SanitizedSupportContext = {
    role: user.role,
    userName: user.name || "QueueLess User"
  };

  if (user.role === "customer") {
    // 1. Fetch active tickets strictly belonging to this customer
    const activeEntries = await QueueEntry.find({
      customerId: user._id,
      status: { $in: ["waiting", "in_progress"] }
    })
      .populate("businessId", "businessProfile.shopName businessProfile.address")
      .sort({ joinedAt: -1 })
      .limit(5);

    context.customerTickets = activeEntries.map((entry) => {
      const biz: any = entry.businessId;
      return {
        ticketId: entry._id.toString(),
        ticketRef: `#${entry._id.toString().slice(-6).toUpperCase()}`,
        status: entry.status,
        businessName: biz?.businessProfile?.shopName || "QueueLess Store",
        joinedAt: entry.joinedAt ? entry.joinedAt.toISOString() : entry.date.toISOString(),
        services: (entry.selectedServices || []).map((s) => ({
          name: s.name,
          quantity: s.quantity || 1,
          durationMin: s.durationMin
        })),
        totalEstimatedDurationMin: entry.totalEstimatedTime,
        isVerified: Boolean(entry.verifiedAt)
      };
    });

    // 2. If a specific ticket ID was requested, verify ownership strictly
    if (specificTicketId && mongoose.Types.ObjectId.isValid(specificTicketId)) {
      const specificEntry = await QueueEntry.findOne({
        _id: specificTicketId,
        customerId: user._id // Hard ownership check in DB query
      }).populate("businessId", "businessProfile.shopName businessProfile.address");

      if (specificEntry) {
        const biz: any = specificEntry.businessId;
        context.specificTicket = {
          ticketId: specificEntry._id.toString(),
          ticketRef: `#${specificEntry._id.toString().slice(-6).toUpperCase()}`,
          status: specificEntry.status,
          businessName: biz?.businessProfile?.shopName || "QueueLess Store",
          joinedAt: specificEntry.joinedAt ? specificEntry.joinedAt.toISOString() : specificEntry.date.toISOString(),
          services: (specificEntry.selectedServices || []).map((s) => ({
            name: s.name,
            quantity: s.quantity || 1,
            durationMin: s.durationMin
          })),
          totalEstimatedDurationMin: specificEntry.totalEstimatedTime,
          isVerified: Boolean(specificEntry.verifiedAt)
        };
      } else {
        // If ticket doesn't belong to this customer, return null (never reveal if another user's ticket exists)
        context.specificTicket = null;
        logger.warn(`[SupportContext] Customer ${userId} queried ticket ${specificTicketId} which is not owned by them`);
      }
    }
  } else if (user.role === "business") {
    // Business Role Context - Strictly scoped to this business's store
    const shop = user.businessProfile;
    const [waitingCount, inProgressCount, nextUpRaw] = await Promise.all([
      QueueEntry.countDocuments({ businessId: user._id, status: "waiting" }),
      QueueEntry.countDocuments({ businessId: user._id, status: "in_progress" }),
      QueueEntry.find({ businessId: user._id, status: { $in: ["waiting", "in_progress"] } })
        .sort({ joinedAt: 1 })
        .limit(3)
        .select("customerName status selectedServices")
    ]);

    context.businessContext = {
      shopName: shop?.shopName || user.name || "My Business",
      address: shop?.address,
      workingHours: shop?.workingHours,
      catalogServices: (shop?.services || []).map((s) => ({
        name: s.name,
        durationMin: s.durationMin,
        cost: s.cost
      })),
      activeQueueSummary: {
        totalActive: waitingCount + inProgressCount,
        waitingCount,
        inProgressCount,
        nextUpTickets: nextUpRaw.map((t) => ({
          ticketRef: `#${t._id.toString().slice(-6).toUpperCase()}`,
          customerName: t.customerName,
          status: t.status,
          serviceNames: (t.selectedServices || []).map((s) => `${s.name}${s.quantity && s.quantity > 1 ? ` (x${s.quantity})` : ""}`)
        }))
      }
    };
  }

  return context;
};
