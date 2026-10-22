import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import QueueEntry, { IQueueEntry } from "../models/QueueEntry";
import User, { IService, IUser } from "../models/User";
import { Server } from "socket.io";
import {
  createNotification,
  coalesceQueueUpdatedNotification,
} from "./notificationService";
import { logger } from "../utils/logger";

export interface PredictionMetadata {
  speedRatio: number; // e.g. 1.0 (catalog) or 0.85 (faster) or 1.15 (running slower)
  confidence: "standard" | "medium" | "high";
  confidenceLabel: string;
  minWaitMin: number;
  maxWaitMin: number;
  rangeDisplay: string;
  sampleSize: number;
}

export interface WaitEstimateResult {
  peopleAhead: number;
  currentEstimatedWait: number; // in minutes (adjusted point estimate)
  estimatedServiceStartTime: string; // ISO string
  inProgressRemainingMin: number;
  waitingAheadMin: number;
  prediction: PredictionMetadata;
  calculatedAt: string;
}

export interface QueueNotificationPayload {
  type: "TURN_APPROACHING" | "YOUR_TURN";
  ticketId: string;
  businessId: string;
  shopName: string;
  peopleAhead: number;
  estimatedWaitMin: number;
  title: string;
  message: string;
  timestamp: string;
}

export interface QueueAlertInfo {
  active: boolean;
  type: "TURN_APPROACHING" | "YOUR_TURN";
  title: string;
  message: string;
}

// Valid queue status transitions state machine
export const VALID_TRANSITIONS: Record<string, string[]> = {
  waiting: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

/**
 * Computes business-specific counter pace and service speed ratio
 * based on actual completed service records.
 * Outliers (< 1 min or > 180 min) are safely excluded.
 */
export const getStoreHistoricalSpeedFactor = async (
  businessId: string | Types.ObjectId
): Promise<{
  speedRatio: number;
  sampleSize: number;
  confidence: "standard" | "medium" | "high";
  confidenceLabel: string;
}> => {
  try {
    const recentCompleted = await QueueEntry.find({
      businessId,
      status: "completed",
      actualServiceDurationMin: { $gte: 1, $lte: 180 }
    })
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(30)
      .select("actualServiceDurationMin selectedServices");

    if (!recentCompleted || recentCompleted.length < 3) {
      return {
        speedRatio: 1.0,
        sampleSize: recentCompleted ? recentCompleted.length : 0,
        confidence: "standard",
        confidenceLabel: "Standard catalog estimate"
      };
    }

    let totalActual = 0;
    let totalScheduled = 0;

    for (const ticket of recentCompleted) {
      const scheduled = (ticket.selectedServices || []).reduce(
        (sum, s) => sum + (s.durationMin || 0) * (s.quantity || 1),
        0
      );
      if (scheduled > 0 && ticket.actualServiceDurationMin) {
        totalActual += ticket.actualServiceDurationMin;
        totalScheduled += scheduled;
      }
    }

    if (totalScheduled === 0) {
      return {
        speedRatio: 1.0,
        sampleSize: recentCompleted.length,
        confidence: "standard",
        confidenceLabel: "Standard catalog estimate"
      };
    }

    const rawRatio = totalActual / totalScheduled;
    // Bound ratio between [0.65, 1.45] to avoid extreme outliers
    const speedRatio = Math.max(0.65, Math.min(1.45, Number(rawRatio.toFixed(2))));
    const sampleSize = recentCompleted.length;

    let confidence: "standard" | "medium" | "high" = "medium";
    let confidenceLabel = `Adjusted for recent service pace (${sampleSize} served)`;

    if (sampleSize >= 6) {
      confidence = "high";
      confidenceLabel = `Based on today's counter speed (${sampleSize} served)`;
    }

    return {
      speedRatio,
      sampleSize,
      confidence,
      confidenceLabel
    };
  } catch {
    return {
      speedRatio: 1.0,
      sampleSize: 0,
      confidence: "standard",
      confidenceLabel: "Standard catalog estimate"
    };
  }
};

/**
 * Authoritative Wait-Time Estimator with Smart Prediction Model
 * Combines in-progress elapsed work, waiting queue depth, and historical counter pace.
 */
export const calculateTicketWaitEstimate = async (
  businessId: string | Types.ObjectId,
  targetJoinedAt: Date,
  targetStatus: string,
  targetServiceStartedAt?: Date
): Promise<WaitEstimateResult> => {
  const now = new Date();

  // If already completed or cancelled, wait is 0
  if (targetStatus === "completed" || targetStatus === "cancelled") {
    return {
      peopleAhead: 0,
      currentEstimatedWait: 0,
      estimatedServiceStartTime: "",
      inProgressRemainingMin: 0,
      waitingAheadMin: 0,
      prediction: {
        speedRatio: 1.0,
        confidence: "standard",
        confidenceLabel: targetStatus === "completed" ? "Service completed" : "Ticket cancelled",
        minWaitMin: 0,
        maxWaitMin: 0,
        rangeDisplay: targetStatus === "completed" ? "Completed" : "Cancelled",
        sampleSize: 0
      },
      calculatedAt: now.toISOString()
    };
  }

  // If already in progress, customer is at the counter right now
  if (targetStatus === "in_progress") {
    return {
      peopleAhead: 0,
      currentEstimatedWait: 0,
      estimatedServiceStartTime: (targetServiceStartedAt || now).toISOString(),
      inProgressRemainingMin: 0,
      waitingAheadMin: 0,
      prediction: {
        speedRatio: 1.0,
        confidence: "high",
        confidenceLabel: "Now serving at counter",
        minWaitMin: 0,
        maxWaitMin: 0,
        rangeDisplay: "At counter now",
        sampleSize: 0
      },
      calculatedAt: now.toISOString()
    };
  }

  // 1. Check if another customer is currently being served ('in_progress')
  const inProgressEntry = await QueueEntry.findOne({
    businessId,
    status: "in_progress"
  });

  let inProgressRemainingMin = 0;
  if (inProgressEntry) {
    const totalDuration = (inProgressEntry.selectedServices || []).reduce(
      (acc, s) => acc + (s.durationMin || 0) * (s.quantity || 1),
      0
    );
    const startedAt = inProgressEntry.serviceStartedAt || inProgressEntry.updatedAt || inProgressEntry.joinedAt;
    const elapsedMin = Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 60000));
    // Remaining time cannot be negative; if running over duration, provide a realistic 2-minute buffer
    inProgressRemainingMin = Math.max(2, totalDuration - elapsedMin);
  }

  // 2. Fetch all other 'waiting' entries created before target ticket
  const waitingAheadEntries = await QueueEntry.find({
    businessId,
    status: "waiting",
    joinedAt: { $lt: targetJoinedAt }
  }).sort({ joinedAt: 1 });

  const waitingAheadMin = waitingAheadEntries.reduce((acc, entry) => {
    const entryDuration = (entry.selectedServices || []).reduce(
      (sAcc, s) => sAcc + (s.durationMin || 0) * (s.quantity || 1),
      0
    );
    return acc + entryDuration;
  }, 0);

  const peopleAhead = (inProgressEntry ? 1 : 0) + waitingAheadEntries.length;
  const rawNominalWait = inProgressRemainingMin + waitingAheadMin;

  // 3. Apply historical counter pace learning factor
  const speedStats = await getStoreHistoricalSpeedFactor(businessId);
  const adjustedWait = Math.round(rawNominalWait * speedStats.speedRatio);

  let currentEstimatedWait = adjustedWait;
  let minWaitMin = 0;
  let maxWaitMin = 0;
  let rangeDisplay = "0 mins";

  if (peopleAhead === 0) {
    currentEstimatedWait = 0;
    rangeDisplay = "Next in line";
  } else {
    currentEstimatedWait = Math.max(1, adjustedWait);
    const spread = Math.max(2, Math.round(currentEstimatedWait * 0.15));
    minWaitMin = Math.max(1, currentEstimatedWait - spread);
    maxWaitMin = currentEstimatedWait + spread + (peopleAhead >= 3 ? 3 : 1);

    if (maxWaitMin <= 5) {
      rangeDisplay = "under 5 mins";
    } else {
      rangeDisplay = `${minWaitMin}–${maxWaitMin} mins`;
    }
  }

  const estimatedServiceStartTime = new Date(now.getTime() + currentEstimatedWait * 60000).toISOString();

  return {
    peopleAhead,
    currentEstimatedWait,
    estimatedServiceStartTime,
    inProgressRemainingMin,
    waitingAheadMin,
    prediction: {
      speedRatio: speedStats.speedRatio,
      confidence: speedStats.confidence,
      confidenceLabel: speedStats.confidenceLabel,
      minWaitMin,
      maxWaitMin,
      rangeDisplay,
      sampleSize: speedStats.sampleSize
    },
    calculatedAt: now.toISOString()
  };
};

/**
 * Join Queue Service
 */
export const joinQueueService = async (
  customerId: string,
  customerName: string,
  businessId: string,
  requestedServices: any[],
  io?: Server
) => {
  const businessUser = await User.findById(businessId);
  if (!businessUser || !businessUser.businessProfile || businessUser.role !== "business") {
    throw { status: 404, message: "Business not found or invalid" };
  }

  const existingActiveTicket = await QueueEntry.findOne({
    businessId,
    customerId,
    status: { $in: ["waiting", "in_progress"] }
  });

  if (existingActiveTicket) {
    throw {
      status: 409,
      message: "You already have an active ticket at this store. Please wait for your turn or view your active ticket.",
      activeTicketId: existingActiveTicket._id,
      activeTicket: {
        _id: existingActiveTicket._id,
        status: existingActiveTicket.status,
        selectedServices: existingActiveTicket.selectedServices,
        joinedAt: existingActiveTicket.joinedAt
      }
    };
  }

  if (!Array.isArray(requestedServices) || requestedServices.length === 0) {
    throw { status: 400, message: "At least one service must be selected" };
  }

  const catalog = businessUser.businessProfile.services || [];
  const verifiedServices: any[] = [];

  for (const item of requestedServices) {
    if (!item || typeof item !== "object" || typeof item.name !== "string" || !item.name.trim()) {
      throw { status: 400, message: "Invalid service item format" };
    }

    const rawQty = item.quantity !== undefined ? item.quantity : 1;
    if (typeof rawQty !== "number" || !Number.isInteger(rawQty) || rawQty < 1 || rawQty > 50) {
      throw {
        status: 400,
        message: `Invalid quantity for service '${item.name}'. Quantity must be a positive integer between 1 and 50.`
      };
    }

    const trimmedName = item.name.trim().toLowerCase();
    const matched = catalog.find(
      c => c.name.trim().toLowerCase() === trimmedName
    );

    if (!matched) {
      throw {
        status: 400,
        message: `Service '${item.name.trim()}' is not offered by this store`
      };
    }

    verifiedServices.push({
      name: matched.name,
      durationMin: matched.durationMin,
      cost: matched.cost,
      quantity: rawQty
    });
  }

  const now = new Date();
  const initialEstimate = await calculateTicketWaitEstimate(businessId, now, "waiting");

  const verificationToken = crypto.randomBytes(16).toString("hex");
  const verificationTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

  const newEntry = new QueueEntry({
    businessId,
    customerId,
    customerName: customerName || "Customer",
    date: now,
    joinedAt: now,
    selectedServices: verifiedServices,
    totalEstimatedTime: initialEstimate.currentEstimatedWait,
    status: "waiting",
    verificationToken,
    verificationTokenHash,
    verificationTokenRevoked: false
  });

  try {
    await newEntry.save();
  } catch (err: any) {
    if (err && (err.code === 11000 || err.name === "MongoServerError")) {
      throw {
        status: 409,
        message: "You already have an active ticket at this store. Please wait for your turn or view your active ticket."
      };
    }
    throw err;
  }

  if (io) {
    io.to(`business_${businessId}`).emit("queue_updated", {
      type: "JOIN",
      entry: newEntry,
      estimate: initialEstimate
    });
  }

  // Create joined notification for customer
  const shopName = businessUser.businessProfile?.shopName || "the store";
  createNotification({
    userId: customerId,
    type: "joined",
    title: "Joined queue",
    message: `You are successfully added to the queue at ${shopName}.`,
    queueId: newEntry._id,
    businessId,
    meta: {
      shopName,
      position: initialEstimate.peopleAhead + 1,
      waitMin: initialEstimate.currentEstimatedWait,
    },
    dedupeKey: `joined:${newEntry._id}`,
    io,
  }).catch(() => {});

  // Trigger notification if customer joined directly within threshold
  await evaluateQueueNotificationsService(businessId, io);

  return {
    ...newEntry.toObject(),
    peopleAhead: initialEstimate.peopleAhead,
    currentEstimatedWait: initialEstimate.currentEstimatedWait,
    estimatedServiceStartTime: initialEstimate.estimatedServiceStartTime,
    prediction: initialEstimate.prediction,
    estimateMeta: {
      inProgressRemainingMin: initialEstimate.inProgressRemainingMin,
      waitingAheadMin: initialEstimate.waitingAheadMin,
      calculatedAt: initialEstimate.calculatedAt
    }
  };
};

/**
 * Get Ticket Status Service
 */
export const getTicketStatusService = async (ticketId: string, requesterUserId: string) => {
  const entry = await QueueEntry.findById(ticketId).populate(
    "businessId",
    "businessProfile.shopName businessProfile.address businessProfile.workingHours"
  );

  if (!entry) {
    throw { status: 404, message: "Queue entry not found" };
  }

  const customerIdStr = entry.customerId.toString();
  const businessIdObj: any = entry.businessId;
  const businessIdStr = businessIdObj._id ? businessIdObj._id.toString() : businessIdObj.toString();

  if (requesterUserId !== customerIdStr && requesterUserId !== businessIdStr) {
    throw { status: 403, message: "Forbidden: You are not authorized to view this ticket" };
  }

  const estimate = await calculateTicketWaitEstimate(
    businessIdStr,
    entry.joinedAt || entry.date,
    entry.status,
    entry.serviceStartedAt
  );

  const hasTurnApproaching = estimate.peopleAhead <= 2 && entry.status === "waiting";
  const isYourTurn = entry.status === "in_progress";
  const alert: QueueAlertInfo | null = isYourTurn
    ? {
        active: true,
        type: "YOUR_TURN",
        title: "It's Your Turn! 🎯",
        message: "The counter is ready for you! Please proceed to the service desk now."
      }
    : hasTurnApproaching
    ? {
        active: true,
        type: "TURN_APPROACHING",
        title: estimate.peopleAhead === 0 ? "You're Next in Line! 🚀" : "Almost Your Turn! ⏳",
        message:
          estimate.peopleAhead === 0
            ? "You are next up! Please head towards the service counter."
            : `Only ${estimate.peopleAhead} ${
                estimate.peopleAhead === 1 ? "customer" : "customers"
              } ahead of you. Get ready!`
      }
    : null;

  return {
    ...entry.toObject(),
    peopleAhead: estimate.peopleAhead,
    currentEstimatedWait: estimate.currentEstimatedWait,
    estimatedServiceStartTime: estimate.estimatedServiceStartTime,
    prediction: estimate.prediction,
    alert,
    estimateMeta: {
      inProgressRemainingMin: estimate.inProgressRemainingMin,
      waitingAheadMin: estimate.waitingAheadMin,
      calculatedAt: estimate.calculatedAt
    }
  };
};

/**
 * Customer Active Queues Service
 */
export const getCustomerActiveQueuesService = async (customerId: string) => {
  const queues = await QueueEntry.find({
    customerId,
    status: { $in: ["waiting", "in_progress"] }
  })
    .populate("businessId", "businessProfile.shopName businessProfile.address")
    .sort({ joinedAt: -1 });

  return Promise.all(
    queues.map(async (q) => {
      const businessId = (q.businessId as any)._id || q.businessId;
      const estimate = await calculateTicketWaitEstimate(
        businessId,
        q.joinedAt || q.date,
        q.status,
        q.serviceStartedAt
      );

      const hasTurnApproaching = estimate.peopleAhead <= 2 && q.status === "waiting";
      const isYourTurn = q.status === "in_progress";
      const alert: QueueAlertInfo | null = isYourTurn
        ? {
            active: true,
            type: "YOUR_TURN",
            title: "It's Your Turn! 🎯",
            message: "The counter is ready for you! Please proceed to the service desk now."
          }
        : hasTurnApproaching
        ? {
            active: true,
            type: "TURN_APPROACHING",
            title: estimate.peopleAhead === 0 ? "You're Next in Line! 🚀" : "Almost Your Turn! ⏳",
            message:
              estimate.peopleAhead === 0
                ? "You are next up! Please head towards the service counter."
                : `Only ${estimate.peopleAhead} ${
                    estimate.peopleAhead === 1 ? "customer" : "customers"
                  } ahead of you. Get ready!`
          }
        : null;

      return {
        ...q.toObject(),
        peopleAhead: estimate.peopleAhead,
        currentEstimatedWait: estimate.currentEstimatedWait,
        estimatedServiceStartTime: estimate.estimatedServiceStartTime,
        prediction: estimate.prediction,
        alert
      };
    })
  );
};

/**
 * Deduplicated Turn-Approaching Notification Engine
 * Scans waiting customers for a business in order of joinedAt.
 * Dispatches a notification if peopleAhead <= threshold (default: 2) and records turnApproachingSentAt.
 */
export const evaluateQueueNotificationsService = async (
  businessId: string | Types.ObjectId,
  io?: Server,
  threshold: number = 2
): Promise<QueueNotificationPayload[]> => {
  const dispatched: QueueNotificationPayload[] = [];
  const businessIdStr = businessId.toString();

  // Find all waiting tickets for this business sorted by joinedAt
  const waitingEntries = await QueueEntry.find({
    businessId,
    status: "waiting"
  })
    .sort({ joinedAt: 1 })
    .populate("businessId", "businessProfile.shopName");

  for (const entry of waitingEntries) {
    const estimate = await calculateTicketWaitEstimate(
      businessIdStr,
      entry.joinedAt || entry.date,
      entry.status,
      entry.serviceStartedAt
    );

    // If customer is within notification threshold and hasn't been notified yet
    if (estimate.peopleAhead <= threshold && !entry.notificationLedger?.turnApproachingSentAt) {
      const now = new Date();
      if (!entry.notificationLedger) {
        entry.notificationLedger = {};
      }
      entry.notificationLedger.turnApproachingSentAt = now;
      await entry.save();

      const shopName =
        (entry.businessId as any)?.businessProfile?.shopName || "QueueLess Store";

      const payload: QueueNotificationPayload = {
        type: "TURN_APPROACHING",
        ticketId: entry._id.toString(),
        businessId: businessIdStr,
        shopName,
        peopleAhead: estimate.peopleAhead,
        estimatedWaitMin: estimate.currentEstimatedWait,
        title: estimate.peopleAhead === 0 ? "You're Next in Line! 🚀" : "Almost Your Turn! ⏳",
        message:
          estimate.peopleAhead === 0
            ? `You are next up at ${shopName}! Please proceed towards the service counter.`
            : `Only ${estimate.peopleAhead} ${
                estimate.peopleAhead === 1 ? "customer" : "customers"
              } ahead of you at ${shopName}. Get ready!`,
        timestamp: now.toISOString()
      };

      dispatched.push(payload);

      // Create turn_near feed & push notification
      createNotification({
        userId: entry.customerId,
        type: "turn_near",
        title: "Your turn is near",
        message: `Please arrive at ${shopName} and check in at reception.`,
        queueId: entry._id,
        businessId: entry.businessId,
        meta: {
          shopName,
          position: estimate.peopleAhead + 1,
          waitMin: estimate.currentEstimatedWait,
        },
        dedupeKey: `turn_near:${entry._id}`,
        io,
      }).catch(() => {});

      if (io) {
        io.to(`queue_${entry._id}`).emit("customer_notification", payload);
        io.to(`user_${entry.customerId}`).emit("customer_notification", payload);
      }
    }
  }

  return dispatched;
};

/**
 * Transition Ticket Status Service
 */
export const transitionTicketStatusService = async (
  ticketId: string,
  businessId: string,
  nextStatus: string,
  io?: Server
) => {
  const ALLOWED_STATUSES = ["waiting", "in_progress", "completed", "cancelled"];
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    throw { status: 400, message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` };
  }

  const entry = await QueueEntry.findOne({ _id: ticketId, businessId });
  if (!entry) {
    throw { status: 404, message: "Queue entry not found" };
  }

  const allowedNext = VALID_TRANSITIONS[entry.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw {
      status: 400,
      message: `Invalid queue status transition from '${entry.status}' to '${nextStatus}'. Allowed transitions: [${allowedNext.join(", ")}]`
    };
  }

  const now = new Date();

  // Prepare atomic update payload
  const updateFields: any = {
    status: nextStatus
  };

  let shouldDispatchYourTurn = false;
  if (nextStatus === "in_progress") {
    updateFields.serviceStartedAt = now;

    // Record turn notification timestamp in atomic update payload
    if (!entry.notificationLedger?.yourTurnSentAt) {
      updateFields["notificationLedger.yourTurnSentAt"] = now;
      shouldDispatchYourTurn = true;
    }
  } else if (nextStatus === "completed") {
    updateFields.completedAt = now;
    if (entry.serviceStartedAt) {
      updateFields.actualServiceDurationMin = Math.max(
        1,
        Math.round((now.getTime() - new Date(entry.serviceStartedAt).getTime()) / 60000)
      );
    }
  } else if (nextStatus === "cancelled") {
    updateFields.cancelledAt = now;
  }

  // Atomic state transition with status precondition to eliminate race conditions
  const updatedEntry = await QueueEntry.findOneAndUpdate(
    { _id: ticketId, businessId, status: entry.status },
    { $set: updateFields },
    { new: true }
  );

  if (!updatedEntry) {
    throw {
      status: 409,
      message: "Ticket status was concurrently modified by another request. Please refresh."
    };
  }

  // Dispatch YOUR_TURN notification ONLY after atomic database transition succeeds
  if (io && shouldDispatchYourTurn) {
    try {
      let shopName = "QueueLess Store";
      try {
        const busUser = await User.findById(updatedEntry.businessId);
        if (busUser?.businessProfile?.shopName) {
          shopName = busUser.businessProfile.shopName;
        }
      } catch {}

      const yourTurnPayload: QueueNotificationPayload = {
        type: "YOUR_TURN",
        ticketId: updatedEntry._id.toString(),
        businessId: updatedEntry.businessId.toString(),
        shopName,
        peopleAhead: 0,
        estimatedWaitMin: 0,
        title: "It's Your Turn! 🎯",
        message: `The counter is ready for you at ${shopName}! Please proceed to the service counter now.`,
        timestamp: now.toISOString()
      };

      io.to(`queue_${updatedEntry._id}`).emit("customer_notification", yourTurnPayload);
      io.to(`user_${updatedEntry.customerId}`).emit("customer_notification", yourTurnPayload);
    } catch {
      // Notification dispatch failure must not reverse or misreport a committed transition
    }
  }

  if (io) {
    io.to(`business_${updatedEntry.businessId}`).emit("queue_updated", {
      type: "STATUS_CHANGE",
      entry: updatedEntry
    });
    io.to(`queue_${updatedEntry._id}`).emit("status_updated", updatedEntry);

    const tokenLookup = updatedEntry.shareToken || updatedEntry.shareTokenHash;
    if (tokenLookup && !updatedEntry.shareTokenRevoked) {
      try {
        const sharedPayload = await getSharedTicketService(tokenLookup);
        if (updatedEntry.shareToken) {
          io.to(`shared_ticket_${updatedEntry.shareToken}`).emit("shared_ticket_updated", sharedPayload);
        }
        if (updatedEntry.shareTokenHash) {
          io.to(`shared_ticket_${updatedEntry.shareTokenHash}`).emit("shared_ticket_updated", sharedPayload);
        }
      } catch {
        // Silently catch if shared payload fails
      }
    }
  }

  // Advance queue & evaluate turn-approaching triggers for remaining waiting tickets
  await evaluateQueueNotificationsService(updatedEntry.businessId, io);

  // Feed notifications for state transitions
  try {
    let transitionShopName = "QueueLess Store";
    try {
      const busUser = await User.findById(updatedEntry.businessId);
      if (busUser?.businessProfile?.shopName) {
        transitionShopName = busUser.businessProfile.shopName;
      }
    } catch {}

    if (nextStatus === "in_progress") {
      createNotification({
        userId: updatedEntry.customerId,
        type: "your_turn",
        title: "It's your turn",
        message: `The counter at ${transitionShopName} is ready for you.`,
        queueId: updatedEntry._id,
        businessId: updatedEntry.businessId,
        meta: { shopName: transitionShopName, position: 0, waitMin: 0 },
        dedupeKey: `your_turn:${updatedEntry._id}`,
        io,
      }).catch(() => {});
    } else if (nextStatus === "completed") {
      createNotification({
        userId: updatedEntry.customerId,
        type: "completed",
        title: "Service completed",
        message: `Your visit at ${transitionShopName} is complete.`,
        queueId: updatedEntry._id,
        businessId: updatedEntry.businessId,
        meta: { shopName: transitionShopName },
        dedupeKey: `completed:${updatedEntry._id}`,
        io,
      }).catch(() => {});
    } else if (nextStatus === "cancelled") {
      createNotification({
        userId: updatedEntry.customerId,
        type: "cancelled",
        title: "Queue cancelled",
        message: `Your spot at ${transitionShopName} was cancelled.`,
        queueId: updatedEntry._id,
        businessId: updatedEntry.businessId,
        meta: { shopName: transitionShopName },
        dedupeKey: `cancelled:${updatedEntry._id}`,
        io,
      }).catch(() => {});
    }

    // Coalesce queue_updated notifications for remaining waiting tickets
    const remainingWaiting = await QueueEntry.find({
      businessId: updatedEntry.businessId,
      status: "waiting",
    }).sort({ joinedAt: 1 });

    for (const waitingTicket of remainingWaiting) {
      const est = await calculateTicketWaitEstimate(
        updatedEntry.businessId.toString(),
        waitingTicket.joinedAt || waitingTicket.date,
        waitingTicket.status,
        waitingTicket.serviceStartedAt
      );
      coalesceQueueUpdatedNotification({
        userId: waitingTicket.customerId,
        queueId: waitingTicket._id,
        businessId: updatedEntry.businessId,
        position: est.peopleAhead + 1,
        waitMin: est.currentEstimatedWait,
        shopName: transitionShopName,
        io,
      }).catch(() => {});
    }
  } catch {}

  return updatedEntry;
};

/**
 * Customer Self-Service Cancellation (Atomic)
 */
export const cancelCustomerTicketService = async (ticketId: string, customerId: string, io?: Server) => {
  const now = new Date();

  // Atomic state change with precondition: only cancel if waiting or in_progress
  const updatedEntry = await QueueEntry.findOneAndUpdate(
    {
      _id: ticketId,
      customerId,
      status: { $in: ["waiting", "in_progress"] }
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now
      }
    },
    { new: true }
  );

  if (!updatedEntry) {
    const existing = await QueueEntry.findOne({ _id: ticketId, customerId });
    if (!existing) {
      throw { status: 404, message: "Queue entry not found or unauthorized" };
    }
    throw { status: 400, message: `Cannot cancel a ticket with status '${existing.status}'` };
  }

  if (io) {
    io.to(`business_${updatedEntry.businessId}`).emit("queue_updated", { type: "CANCEL", entry: updatedEntry });
    io.to(`queue_${updatedEntry._id}`).emit("status_updated", updatedEntry);

    const tokenLookup = updatedEntry.shareToken || updatedEntry.shareTokenHash;
    if (tokenLookup && !updatedEntry.shareTokenRevoked) {
      try {
        const sharedPayload = await getSharedTicketService(tokenLookup);
        if (updatedEntry.shareToken) {
          io.to(`shared_ticket_${updatedEntry.shareToken}`).emit("shared_ticket_updated", sharedPayload);
        }
        if (updatedEntry.shareTokenHash) {
          io.to(`shared_ticket_${updatedEntry.shareTokenHash}`).emit("shared_ticket_updated", sharedPayload);
        }
      } catch {}
    }
  }

  // Customers behind cancelled ticket move up; trigger notifications if crossing threshold
  await evaluateQueueNotificationsService(updatedEntry.businessId, io);

  return updatedEntry;
};

/**
 * Customer History Service with Cursor Pagination Support
 */
export const getCustomerHistoryService = async (
  customerId: string,
  limit: number = 20,
  cursor?: string
) => {
  const parsedLimit = Math.min(50, Math.max(1, limit));
  const query: any = {
    customerId,
    status: { $in: ["completed", "cancelled"] }
  };

  if (cursor && Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new Types.ObjectId(cursor) };
  }

  const records = await QueueEntry.find(query)
    .sort({ _id: -1 })
    .limit(parsedLimit + 1)
    .populate("businessId", "businessProfile.shopName businessProfile.address");

  const hasMore = records.length > parsedLimit;
  const items = hasMore ? records.slice(0, parsedLimit) : records;
  const nextCursor = items.length > 0 ? items[items.length - 1]._id.toString() : null;

  return {
    items,
    nextCursor: hasMore ? nextCursor : null,
    hasMore
  };
};

/**
 * Working Hours Timezone-Aware Check
 */
export const isStoreOpenNow = (
  workingHours: { openTime: string; closeTime: string; closedDays: number[]; timezone?: string },
  date: Date = new Date()
): { isOpen: boolean; reason?: string } => {
  try {
    const tz = workingHours.timezone || "UTC";
    // Format date in business timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const weekdayPart = parts.find(p => p.type === "weekday")?.value;
    const hourPart = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const minutePart = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);

    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    };
    const currentDay = weekdayPart ? (weekdayMap[weekdayPart] ?? date.getDay()) : date.getDay();
    const currentTimeMin = hourPart * 60 + minutePart;

    // Check closed days
    if (workingHours.closedDays && workingHours.closedDays.includes(currentDay)) {
      return { isOpen: false, reason: "Shop is closed today" };
    }

    const [openH, openM] = (workingHours.openTime || "00:00").split(":").map(Number);
    const [closeH, closeM] = (workingHours.closeTime || "23:59").split(":").map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;

    if (currentTimeMin < openMin || currentTimeMin > closeMin) {
      return {
        isOpen: false,
        reason: `Shop is closed. Operating hours are ${workingHours.openTime} to ${workingHours.closeTime}`
      };
    }

    return { isOpen: true };
  } catch {
    const currentDay = date.getDay();
    if (workingHours.closedDays && workingHours.closedDays.includes(currentDay)) {
      return { isOpen: false, reason: "Shop is closed today" };
    }
    return { isOpen: true };
  }
};

/**
 * Customer Favorites Toggle Service
 */
export const toggleFavoriteService = async (customerId: string, businessId: string) => {
  if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(businessId)) {
    throw { status: 400, message: "Invalid customer or business ID" };
  }

  const business = await User.findOne({ _id: businessId, role: "business" });
  if (!business) {
    throw { status: 404, message: "Business store not found" };
  }

  const customer = await User.findById(customerId);
  if (!customer || customer.role !== "customer") {
    throw { status: 404, message: "Customer account not found" };
  }

  const favorites = customer.favoriteBusinesses || [];
  const exists = favorites.some(id => id.toString() === businessId.toString());

  if (exists) {
    await User.findByIdAndUpdate(customerId, {
      $pull: { favoriteBusinesses: new Types.ObjectId(businessId) }
    });
    return {
      isFavorite: false,
      businessId,
      shopName: business.businessProfile?.shopName || "Store",
      message: "Removed from favorites"
    };
  } else {
    await User.findByIdAndUpdate(customerId, {
      $addToSet: { favoriteBusinesses: new Types.ObjectId(businessId) }
    });
    return {
      isFavorite: true,
      businessId,
      shopName: business.businessProfile?.shopName || "Store",
      message: "Added to favorites"
    };
  }
};

/**
 * Customer Favorites List Service with Live Metrics
 */
export const getCustomerFavoritesService = async (customerId: string) => {
  const customer = await User.findById(customerId).populate({
    path: "favoriteBusinesses",
    select: "name businessProfile"
  });

  if (!customer) {
    throw { status: 404, message: "Customer not found" };
  }

  const rawBusinesses: any[] = customer.favoriteBusinesses || [];
  const now = new Date();

  return Promise.all(
    rawBusinesses
      .filter(b => b && b.businessProfile)
      .map(async (b) => {
        const workingHours = b.businessProfile.workingHours;
        const openStatus = workingHours
          ? isStoreOpenNow(workingHours, now)
          : { isOpen: true };

        const activeCount = await QueueEntry.countDocuments({
          businessId: b._id,
          status: { $in: ["waiting", "in_progress"] }
        });

        const estimate = await calculateTicketWaitEstimate(b._id, now, "waiting");
        const effectiveQrCode = b.businessProfile.uniqueQrCode || b._id.toString();

        return {
          _id: b._id,
          name: b.name,
          shopName: b.businessProfile.shopName || b.name || "QueueLess Store",
          address: b.businessProfile.address || "",
          uniqueQrCode: effectiveQrCode,
          qrCode: effectiveQrCode,
          businessProfile: {
            ...(typeof (b.businessProfile as any)?.toObject === "function"
              ? (b.businessProfile as any).toObject()
              : b.businessProfile),
            uniqueQrCode: effectiveQrCode
          },
          services: b.businessProfile.services || [],
          workingHours,
          isOpen: openStatus.isOpen,
          openReason: openStatus.reason,
          activeQueueCount: activeCount,
          estimatedWait: estimate.currentEstimatedWait,
          prediction: estimate.prediction
        };
      })
  );
};

/**
 * Rapid 1-Click Quick Rebooking Service
 */
export const quickRebookService = async (
  customerId: string,
  customerName: string,
  params: {
    businessId?: string;
    pastTicketId?: string;
    serviceNames?: string[];
  },
  io?: Server
) => {
  let targetBusinessId = params.businessId;
  let targetServiceNames = params.serviceNames || [];

  if (params.pastTicketId) {
    const past = await QueueEntry.findOne({
      _id: params.pastTicketId,
      customerId
    });

    if (!past) {
      throw { status: 404, message: "Past ticket not found or unauthorized" };
    }

    targetBusinessId = targetBusinessId || past.businessId.toString();
    if (targetServiceNames.length === 0 && past.selectedServices?.length) {
      targetServiceNames = past.selectedServices.map(s => s.name);
    }
  }

  if (!targetBusinessId) {
    throw { status: 400, message: "Business ID or valid past ticket ID required" };
  }

  const businessUser = await User.findById(targetBusinessId);
  if (!businessUser || !businessUser.businessProfile || businessUser.role !== "business") {
    throw { status: 404, message: "Business not found or invalid" };
  }

  // Check store hours
  if (businessUser.businessProfile.workingHours) {
    const openStatus = isStoreOpenNow(businessUser.businessProfile.workingHours);
    if (!openStatus.isOpen) {
      throw {
        status: 400,
        message: openStatus.reason || "Store is currently closed"
      };
    }
  }

  const catalog = businessUser.businessProfile.services || [];
  if (catalog.length === 0) {
    throw { status: 400, message: "Store currently has no active services" };
  }

  // Match requested services or fallback to first available catalog service
  let servicesToBook: IService[] = [];
  if (targetServiceNames.length > 0) {
    servicesToBook = catalog.filter(c =>
      targetServiceNames.some(
        name => name.toLowerCase().trim() === c.name.toLowerCase().trim()
      )
    );
  }

  if (servicesToBook.length === 0) {
    servicesToBook = [catalog[0]];
  }

  return joinQueueService(customerId, customerName, targetBusinessId, servicesToBook, io);
};

export interface SharedTicketPublicResponse {
  ticketNumber: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  shopName: string;
  shopAddress: string;
  joinedAt: Date | string;
  selectedServices: Array<{ name: string; durationMin: number; cost?: number }>;
  peopleAhead: number;
  currentEstimatedWait: number;
  estimatedServiceStartTime: string;
  prediction: PredictionMetadata;
  shareToken: string;
}

/**
 * Generate or retrieve secure unguessable share token for a queue ticket
 */
export const generateTicketShareTokenService = async (
  ticketId: string,
  requesterUserId: string
): Promise<{ shareToken: string; shareUrl: string; createdAt: Date; expiresAt: Date }> => {
  const entry = await QueueEntry.findById(ticketId);
  if (!entry) {
    throw { status: 404, message: "Ticket not found" };
  }

  const customerIdStr = entry.customerId.toString();
  const businessIdStr = entry.businessId.toString();

  if (requesterUserId !== customerIdStr && requesterUserId !== businessIdStr) {
    throw { status: 403, message: "Forbidden: You are not authorized to share this ticket" };
  }

  const now = new Date();
  const isExpired = entry.shareTokenExpiresAt && entry.shareTokenExpiresAt < now;

  // For backward compatibility: if a legacy plaintext token exists and is valid, return it
  if (entry.shareToken && !entry.shareTokenRevoked && !isExpired) {
    return {
      shareToken: entry.shareToken,
      shareUrl: `/shared/${entry.shareToken}`,
      createdAt: entry.shareTokenCreatedAt || now,
      expiresAt: entry.shareTokenExpiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  // Generate new cryptographically secure token and store ONLY its SHA-256 hash
  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiration policy

  entry.shareToken = undefined; // Do not persist plaintext token in new/updated records
  entry.shareTokenHash = tokenHash;
  entry.shareTokenCreatedAt = now;
  entry.shareTokenExpiresAt = expiresAt;
  entry.shareTokenRevoked = false;
  await entry.save();

  return {
    shareToken: rawToken,
    shareUrl: `/shared/${rawToken}`,
    createdAt: now,
    expiresAt
  };
};

/**
 * Revoke a previously generated ticket share token
 */
export const revokeTicketShareTokenService = async (
  ticketId: string,
  requesterUserId: string,
  io?: Server
): Promise<{ success: boolean; message: string }> => {
  const entry = await QueueEntry.findById(ticketId);
  if (!entry) {
    throw { status: 404, message: "Ticket not found" };
  }

  const customerIdStr = entry.customerId.toString();
  const businessIdStr = entry.businessId.toString();

  if (requesterUserId !== customerIdStr && requesterUserId !== businessIdStr) {
    throw { status: 403, message: "Forbidden: You are not authorized to modify this ticket" };
  }

  if (entry.shareToken || entry.shareTokenHash) {
    const oldToken = entry.shareToken;
    const oldHash = entry.shareTokenHash;

    entry.shareTokenRevoked = true;
    entry.shareToken = undefined;
    entry.shareTokenHash = undefined;
    entry.shareTokenExpiresAt = undefined;
    await entry.save();

    if (io) {
      const payload = {
        ticketNumber: entry._id.toString().slice(-4).toUpperCase(),
        message: "This share link has been revoked by the ticket holder."
      };
      if (oldToken) io.to(`shared_ticket_${oldToken}`).emit("ticket_share_revoked", payload);
      if (oldHash) io.to(`shared_ticket_${oldHash}`).emit("ticket_share_revoked", payload);
    }
  }

  return {
    success: true,
    message: "Share link revoked successfully"
  };
};

/**
 * Public Guest-Accessible Ticket Status Lookup
 * Strictly sanitizes PII (never returns customer name, email, phone, or internal user IDs)
 * Enforces SHA-256 hash lookup and expiration check
 */
export const getSharedTicketService = async (
  shareToken: string
): Promise<SharedTicketPublicResponse> => {
  if (!shareToken || typeof shareToken !== "string" || shareToken.trim().length === 0) {
    throw { status: 400, message: "Invalid share token" };
  }

  const cleanToken = shareToken.trim();
  const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");

  const entry = await QueueEntry.findOne({
    $or: [
      { shareTokenHash: tokenHash },
      { shareTokenHash: cleanToken }, // supports internal lookup by hash
      { shareToken: cleanToken }      // backward compatibility for unmigrated legacy tokens
    ],
    shareTokenRevoked: { $ne: true }
  }).populate("businessId", "businessProfile.shopName businessProfile.address");

  if (!entry) {
    throw {
      status: 404,
      message: "This shared ticket link is invalid, expired, or has been revoked by the holder."
    };
  }

  // Enforce explicit expiration
  if (entry.shareTokenExpiresAt && entry.shareTokenExpiresAt < new Date()) {
    throw {
      status: 410,
      message: "This shared ticket link has expired. Please request an updated link from the ticket holder."
    };
  }

  // Timing-safe verification if token matched via hash
  if (entry.shareTokenHash && (entry.shareTokenHash === tokenHash || entry.shareTokenHash === cleanToken)) {
    const targetHash = entry.shareTokenHash === tokenHash ? tokenHash : cleanToken;
    const computedBuf = Buffer.from(targetHash, "hex");
    const storedBuf = Buffer.from(entry.shareTokenHash, "hex");
    if (computedBuf.length !== storedBuf.length || !crypto.timingSafeEqual(computedBuf, storedBuf)) {
      throw {
        status: 404,
        message: "This shared ticket link is invalid, expired, or has been revoked by the holder."
      };
    }
  }

  const businessIdStr =
    (entry.businessId as any)._id?.toString() || entry.businessId.toString();

  const estimate = await calculateTicketWaitEstimate(
    businessIdStr,
    entry.joinedAt || entry.date,
    entry.status,
    entry.serviceStartedAt
  );

  const shopName =
    (entry.businessId as any)?.businessProfile?.shopName || "QueueLess Store";
  const shopAddress =
    (entry.businessId as any)?.businessProfile?.address || "";

  return {
    ticketNumber: entry._id.toString().slice(-4).toUpperCase(),
    status: entry.status,
    shopName,
    shopAddress,
    joinedAt: entry.joinedAt || entry.date,
    selectedServices: (entry.selectedServices || []).map((s) => ({
      name: s.name,
      durationMin: s.durationMin,
      cost: s.cost,
      ...(s.quantity !== undefined ? { quantity: s.quantity } : {})
    })),
    peopleAhead: estimate.peopleAhead,
    currentEstimatedWait: estimate.currentEstimatedWait,
    estimatedServiceStartTime: estimate.estimatedServiceStartTime,
    prediction: estimate.prediction,
    shareToken: cleanToken
  };
};

/**
 * Edit Customer Active Ticket Services
 * Safely updates selected services and quantities on an existing 'waiting' ticket.
 * Recalculates wait times without altering queue position (joinedAt).
 * Rejects if ticket is in_progress, completed, cancelled, or concurrently modified.
 */
export const editCustomerTicketService = async (
  ticketId: string,
  requesterUserId: string,
  requestedServices: any[],
  io?: Server
) => {
  if (!Types.ObjectId.isValid(ticketId)) {
    throw { status: 400, message: "Invalid ticket ID" };
  }

  const ticket = await QueueEntry.findById(ticketId);
  if (!ticket) {
    throw { status: 404, message: "Queue entry not found" };
  }

  const isOwner = ticket.customerId.toString() === requesterUserId;
  const isBusiness = ticket.businessId.toString() === requesterUserId;
  if (!isOwner && !isBusiness) {
    throw { status: 403, message: "Forbidden: You are not authorized to edit this ticket" };
  }

  if (ticket.status !== "waiting") {
    throw {
      status: 400,
      message: `Cannot edit services for a ticket in '${ticket.status}' status. Only waiting tickets can be updated.`
    };
  }

  if (!Array.isArray(requestedServices) || requestedServices.length === 0) {
    throw { status: 400, message: "At least one service must be selected" };
  }

  const businessUser = await User.findById(ticket.businessId);
  if (!businessUser || !businessUser.businessProfile || businessUser.role !== "business") {
    throw { status: 404, message: "Store not found or invalid" };
  }

  const catalog = businessUser.businessProfile.services || [];
  const verifiedServices: any[] = [];

  for (const item of requestedServices) {
    if (!item || typeof item !== "object" || typeof item.name !== "string" || !item.name.trim()) {
      throw { status: 400, message: "Invalid service item format" };
    }

    const rawQty = item.quantity !== undefined ? item.quantity : 1;
    if (typeof rawQty !== "number" || !Number.isInteger(rawQty) || rawQty < 1 || rawQty > 50) {
      throw {
        status: 400,
        message: `Invalid quantity for service '${item.name}'. Quantity must be a positive integer between 1 and 50.`
      };
    }

    const trimmedName = item.name.trim().toLowerCase();
    const matched = catalog.find(
      c => c.name.trim().toLowerCase() === trimmedName
    );

    if (!matched) {
      throw {
        status: 400,
        message: `Service '${item.name.trim()}' is not offered by this store`
      };
    }

    verifiedServices.push({
      name: matched.name,
      durationMin: matched.durationMin,
      cost: matched.cost,
      quantity: rawQty
    });
  }

  // Atomic state update with status precondition to eliminate race conditions
  const updatedTicket = await QueueEntry.findOneAndUpdate(
    { _id: ticketId, status: "waiting" },
    { $set: { selectedServices: verifiedServices } },
    { new: true }
  );

  if (!updatedTicket) {
    throw {
      status: 409,
      message: "Ticket was concurrently modified or is no longer in waiting status. Please refresh."
    };
  }

  const estimate = await calculateTicketWaitEstimate(
    updatedTicket.businessId,
    updatedTicket.joinedAt || updatedTicket.date,
    updatedTicket.status,
    updatedTicket.serviceStartedAt
  );

  if (io) {
    io.to(`business_${updatedTicket.businessId}`).emit("queue_updated", {
      type: "EDIT",
      entry: updatedTicket,
      estimate
    });
    io.to(`queue_${updatedTicket._id}`).emit("status_updated", updatedTicket);
  }

  return {
    ...updatedTicket.toObject(),
    peopleAhead: estimate.peopleAhead,
    currentEstimatedWait: estimate.currentEstimatedWait,
    estimatedServiceStartTime: estimate.estimatedServiceStartTime,
    prediction: estimate.prediction,
    estimateMeta: {
      inProgressRemainingMin: estimate.inProgressRemainingMin,
      waitingAheadMin: estimate.waitingAheadMin,
      calculatedAt: estimate.calculatedAt
    }
  };
};

/**
 * Verify Ticket Service (Business Counter Verification)
 * Supports scanning QR verification token or manual ticket-ID entry.
 * Validates store ownership, token revocation, and state machine eligibility.
 */
export const verifyTicketService = async (
  businessId: string,
  params: { token?: string; ticketId?: string },
  io?: Server
) => {
  let { token, ticketId } = params;

  if ((!token || !token.trim()) && (!ticketId || !ticketId.trim())) {
    throw { status: 400, message: "Either ticket QR token or ticket ID must be provided" };
  }

  let cleanToken = token ? token.trim() : undefined;
  let cleanTicketId = ticketId ? ticketId.trim() : undefined;

  // Handle formatted QR payload e.g. "ql-ticket:<ticketId>:<token>" or JSON payload
  if (cleanToken) {
    if (cleanToken.startsWith("ql-ticket:")) {
      const parts = cleanToken.split(":");
      if (parts.length >= 3) {
        cleanTicketId = cleanTicketId || parts[1];
        cleanToken = parts[2];
      } else if (parts.length === 2) {
        cleanToken = parts[1];
      }
    } else if (cleanToken.startsWith("{") && cleanToken.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanToken);
        if (parsed.ticketId) cleanTicketId = cleanTicketId || parsed.ticketId;
        if (parsed.token) cleanToken = parsed.token;
      } catch {}
    }
  }

  let ticket: IQueueEntry | null = null;

  if (cleanTicketId) {
    if (Types.ObjectId.isValid(cleanTicketId)) {
      ticket = await QueueEntry.findById(cleanTicketId).populate("customerId", "name phone email");
    } else if (cleanTicketId.length <= 6) {
      // Suffix lookup within this business's active entries
      const activeEntries = await QueueEntry.find({
        businessId,
        status: { $in: ["waiting", "in_progress"] }
      }).populate("customerId", "name phone email");

      const match = activeEntries.find(
        e => e._id.toString().toUpperCase().endsWith(cleanTicketId!.toUpperCase())
      );
      if (match) {
        ticket = match;
      }
    }
  }

  if (!ticket && cleanToken) {
    const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");
    ticket = await QueueEntry.findOne({
      $or: [
        { verificationToken: cleanToken },
        { verificationTokenHash: tokenHash }
      ]
    }).populate("customerId", "name phone email");
  }

  if (!ticket) {
    throw { status: 404, message: "Ticket not found" };
  }

  // Cross-business scope check
  if (ticket.businessId.toString() !== businessId.toString()) {
    throw {
      status: 403,
      message: "Cross-business access denied: This ticket belongs to another store"
    };
  }

  // If token was provided, verify it matches
  if (cleanToken) {
    const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");
    const matchesPlain = ticket.verificationToken === cleanToken;
    const matchesHash = ticket.verificationTokenHash === tokenHash;
    if (!matchesPlain && !matchesHash) {
      throw {
        status: 400,
        message: "Invalid verification token for this ticket"
      };
    }
  }

  // Revocation check
  if (ticket.verificationTokenRevoked) {
    throw {
      status: 400,
      message: "This ticket's verification token has been revoked by the holder"
    };
  }

  // State machine eligibility check
  if (ticket.status === "completed") {
    throw {
      status: 400,
      message: "This ticket has already been completed"
    };
  }

  if (ticket.status === "cancelled") {
    throw {
      status: 400,
      message: "This ticket has been cancelled"
    };
  }

  const now = new Date();
  ticket.verifiedAt = now;
  ticket.verifiedBy = new Types.ObjectId(businessId);
  await ticket.save();

  // Create checked_in notification for customer
  try {
    const businessUser = await User.findById(businessId).select("businessProfile.shopName");
    const shopName = businessUser?.businessProfile?.shopName || "Store";
    const customerId = (ticket.customerId as any)?._id
      ? (ticket.customerId as any)._id.toString()
      : ticket.customerId.toString();

    createNotification({
      userId: customerId,
      type: "checked_in",
      title: "Checked in",
      message: `Your arrival at ${shopName} was verified.`,
      queueId: ticket._id.toString(),
      businessId: businessId.toString(),
      meta: { shopName },
      dedupeKey: `checked_in:${ticket._id}`,
      io
    }).catch(() => {});
  } catch (err: any) {
    logger.warn(`Failed to trigger checked_in notification: ${err.message}`);
  }

  const estimate = await calculateTicketWaitEstimate(
    businessId,
    ticket.joinedAt || ticket.date,
    ticket.status,
    ticket.serviceStartedAt
  );

  if (io) {
    io.to(`business_${businessId}`).emit("queue_updated", {
      type: "VERIFIED",
      entry: ticket
    });
    io.to(`queue_${ticket._id}`).emit("ticket_verified", {
      ticketId: ticket._id.toString(),
      verifiedAt: now.toISOString()
    });
  }

  return {
    verified: true,
    message: "Ticket verified successfully",
    entry: {
      ...ticket.toObject(),
      peopleAhead: estimate.peopleAhead,
      currentEstimatedWait: estimate.currentEstimatedWait,
      estimatedServiceStartTime: estimate.estimatedServiceStartTime,
      prediction: estimate.prediction
    }
  };
};

/**
 * Revoke or Regenerate Ticket Verification Token
 */
export const revokeTicketVerificationTokenService = async (
  ticketId: string,
  requesterUserId: string,
  regenerate: boolean = true
) => {
  if (!Types.ObjectId.isValid(ticketId)) {
    throw { status: 400, message: "Invalid ticket ID" };
  }

  const ticket = await QueueEntry.findById(ticketId);
  if (!ticket) {
    throw { status: 404, message: "Ticket not found" };
  }

  const isOwner = ticket.customerId.toString() === requesterUserId;
  const isBusiness = ticket.businessId.toString() === requesterUserId;
  if (!isOwner && !isBusiness) {
    throw { status: 403, message: "Forbidden: Not authorized" };
  }

  if (regenerate) {
    const newToken = crypto.randomBytes(16).toString("hex");
    const newHash = crypto.createHash("sha256").update(newToken).digest("hex");
    ticket.verificationToken = newToken;
    ticket.verificationTokenHash = newHash;
    ticket.verificationTokenRevoked = false;
    await ticket.save();
    return {
      success: true,
      message: "Verification token regenerated successfully",
      verificationToken: newToken
    };
  } else {
    ticket.verificationTokenRevoked = true;
    await ticket.save();
    return {
      success: true,
      message: "Verification token revoked successfully"
    };
  }
};

