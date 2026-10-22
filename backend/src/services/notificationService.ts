import mongoose from "mongoose";
import { Server } from "socket.io";
import Notification, { INotification, NotificationType, INotificationMeta } from "../models/Notification";
import Update from "../models/Update";
import QueueEntry from "../models/QueueEntry";
import User from "../models/User";
import { logger } from "../utils/logger";

interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  queueId?: string | mongoose.Types.ObjectId;
  businessId?: string | mongoose.Types.ObjectId;
  meta?: INotificationMeta;
  dedupeKey: string;
  io?: Server;
}

/**
 * Send Expo push notifications to registered user devices.
 * Non-blocking, fail-safe.
 */
export const sendPushNotification = async (
  userId: string | mongoose.Types.ObjectId,
  type: "turn_near" | "your_turn",
  shopName: string,
  waitMin?: number,
  queueId?: string | mongoose.Types.ObjectId
) => {
  try {
    const user = await User.findById(userId).select("pushTokens");
    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      return;
    }

    const n = Math.max(1, Math.round(waitMin || 1));
    const body =
      type === "your_turn"
        ? `Your turn at ${shopName} is up next. Please head to the counter.`
        : `Your turn at ${shopName} is coming up! Please arrive in ${n} minutes.`;

    const messages = user.pushTokens.map((pt) => ({
      to: pt.token,
      sound: "default",
      title: "QueueLess",
      body,
      channelId: "queue-alerts",
      data: {
        queueId: queueId ? queueId.toString() : undefined,
        type,
      },
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (response.ok) {
      const result = await response.json();
      const tickets = result.data || [];
      const tokensToRemove: string[] = [];

      tickets.forEach((t: any, idx: number) => {
        if (t.status === "error" && t.details?.error === "DeviceNotRegistered") {
          tokensToRemove.push(user.pushTokens![idx].token);
        }
      });

      if (tokensToRemove.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { pushTokens: { token: { $in: tokensToRemove } } },
        });
      }
    }
  } catch (err: any) {
    logger.warn(`Failed to send push notification to user ${userId}: ${err.message}`);
  }
};

/**
 * Create a new notification with deduplication.
 * Non-blocking, fails gracefully without breaking queue transitions.
 */
export const createNotification = async (
  params: CreateNotificationParams
): Promise<INotification | null> => {
  try {
    const { userId, type, title, message, queueId, businessId, meta, dedupeKey, io } = params;

    // Try to create notification
    let notification: INotification;
    try {
      notification = await Notification.create({
        userId,
        type,
        title,
        message,
        queueId,
        businessId,
        meta,
        dedupeKey,
        readAt: null,
      });
    } catch (err: any) {
      // If duplicate key error on (userId, dedupeKey), ignore and return null
      if (err.code === 11000) {
        return null;
      }
      throw err;
    }

    // Socket notification emission to personal room
    if (io) {
      io.to(`user_${userId}`).emit("notification:new", notification);
    }

    // Real push notification for turn_near & your_turn
    if (type === "turn_near" || type === "your_turn") {
      const shopName = meta?.shopName || "the store";
      sendPushNotification(userId, type, shopName, meta?.waitMin, queueId).catch(() => {});
    }

    return notification;
  } catch (err: any) {
    logger.warn(`Failed to create notification: ${err.message}`, { dedupeKey: params.dedupeKey });
    return null;
  }
};

/**
 * Upsert / coalesce queue_updated notification to prevent spam.
 * If an unread queue_updated notification exists for this ticket, updates it in place.
 */
export const coalesceQueueUpdatedNotification = async (params: {
  userId: string | mongoose.Types.ObjectId;
  queueId: string | mongoose.Types.ObjectId;
  businessId: string | mongoose.Types.ObjectId;
  position: number;
  waitMin: number;
  shopName: string;
  io?: Server;
}): Promise<INotification | null> => {
  try {
    const { userId, queueId, businessId, position, waitMin, shopName, io } = params;
    const dedupeKey = `queue_updated:${queueId}`;
    const title = "Queue updated";
    const message = `Your queue has moved at ${shopName}.`;
    const meta = { position, waitMin, shopName };

    // Find existing unread notification for this ticket
    const existing = await Notification.findOne({
      userId,
      dedupeKey,
      readAt: null,
    });

    let notification: INotification | null = null;

    if (existing) {
      existing.meta = meta;
      existing.message = message;
      existing.createdAt = new Date(); // refresh timestamp so it moves to top of unread
      notification = await existing.save();
    } else {
      // Upsert by dedupeKey if previous one was read or missing
      notification = await Notification.findOneAndUpdate(
        { userId, dedupeKey },
        {
          $set: {
            type: "queue_updated",
            title,
            message,
            queueId,
            businessId,
            meta,
            readAt: null,
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    if (io && notification) {
      io.to(`user_${userId}`).emit("notification:new", notification);
    }

    return notification;
  } catch (err: any) {
    logger.warn(`Failed to coalesce queue_updated notification: ${err.message}`);
    return null;
  }
};

/**
 * Get customer notifications with cursor pagination and unreadCount.
 */
export const getCustomerNotificationsService = async (
  userId: string,
  limit: number = 20,
  cursor?: string
) => {
  const parsedLimit = Math.min(50, Math.max(1, limit));
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const records = await Notification.find(query)
    .sort({ _id: -1 })
    .limit(parsedLimit + 1)
    .populate("businessId", "businessProfile.shopName")
    .lean();

  const hasMore = records.length > parsedLimit;
  const items = hasMore ? records.slice(0, parsedLimit) : records;
  const nextCursor = items.length > 0 ? items[items.length - 1]._id.toString() : null;
  const unreadCount = await Notification.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    readAt: null,
  });

  return {
    items,
    nextCursor: hasMore ? nextCursor : null,
    hasMore,
    unreadCount,
  };
};

/**
 * Get unread notification count for a customer.
 */
export const getUnreadNotificationCountService = async (userId: string) => {
  const unreadCount = await Notification.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    readAt: null,
  });
  return { unreadCount };
};

/**
 * Mark notifications as read.
 */
export const markNotificationsReadService = async (userId: string, ids?: string[]) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  if (ids && Array.isArray(ids) && ids.length > 0) {
    const validIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const result = await Notification.updateMany(
      { userId: userObjectId, _id: { $in: validIds }, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return { updated: result.modifiedCount };
  } else {
    const result = await Notification.updateMany(
      { userId: userObjectId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return { updated: result.modifiedCount };
  }
};

/**
 * Get customer updates based on visibility rule:
 * Customer sees updates from businesses in their favoriteBusinesses OR
 * where they have had a queue entry within the last 30 days.
 */
export const getCustomerUpdatesService = async (
  userId: string,
  type?: string,
  limit: number = 20,
  cursor?: string
) => {
  // 1. Get user's favorite businesses
  const user = await User.findById(userId).select("favoriteBusinesses").lean();
  const favIds = (user?.favoriteBusinesses || []).map((id: any) => id.toString());

  // 2. Get businesses visited in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recentEntries = await QueueEntry.distinct("businessId", {
    customerId: new mongoose.Types.ObjectId(userId),
    createdAt: { $gte: thirtyDaysAgo },
  });
  const recentIds = recentEntries.map((id: any) => id.toString());

  // 3. Union business IDs
  const allowedIds = Array.from(new Set([...favIds, ...recentIds])).filter(Boolean);
  if (allowedIds.length === 0) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const query: any = {
    businessId: { $in: allowedIds.map((id) => new mongoose.Types.ObjectId(id)) },
    expiresAt: { $gt: new Date() },
  };

  if (type && ["alert", "offer", "info"].includes(type)) {
    query.type = type;
  }

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const parsedLimit = Math.min(50, Math.max(1, limit));
  const records = await Update.find(query)
    .sort({ _id: -1 })
    .limit(parsedLimit + 1)
    .populate("businessId", "businessProfile.shopName")
    .lean();

  const hasMore = records.length > parsedLimit;
  const slice = hasMore ? records.slice(0, parsedLimit) : records;
  const nextCursor = slice.length > 0 ? slice[slice.length - 1]._id.toString() : null;

  const items = slice.map((u: any) => ({
    _id: u._id,
    type: u.type,
    title: u.title,
    message: u.message,
    validTill: u.validTill,
    createdAt: u.createdAt,
    shopName: u.businessId?.businessProfile?.shopName || "Store",
    businessId: u.businessId?._id || u.businessId,
  }));

  return {
    items,
    nextCursor: hasMore ? nextCursor : null,
    hasMore,
  };
};

/**
 * Business: Create an announcement update (max 10/hr enforced at route level).
 */
export const createBusinessUpdateService = async (
  businessId: string,
  data: { type: "alert" | "offer" | "info"; title: string; message: string; validForDays?: number }
) => {
  const title = (data.title || "").trim();
  const message = (data.message || "").trim();

  if (!title || title.length > 60) {
    throw new Error("Title is required and must not exceed 60 characters");
  }
  if (!message || message.length > 200) {
    throw new Error("Message is required and must not exceed 200 characters");
  }
  if (!["alert", "offer", "info"].includes(data.type)) {
    throw new Error("Type must be alert, offer, or info");
  }

  let validTill: Date | undefined;
  let expiresAt: Date;

  if (data.type === "offer") {
    const days = Number(data.validForDays) || 7;
    if (days < 1 || days > 30) {
      throw new Error("validForDays must be between 1 and 30");
    }
    validTill = new Date(Date.now() + days * 24 * 3600 * 1000);
    expiresAt = new Date(validTill);
    expiresAt.setHours(23, 59, 59, 999);
  } else {
    expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  }

  const update = await Update.create({
    businessId: new mongoose.Types.ObjectId(businessId),
    type: data.type,
    title,
    message,
    validTill,
    expiresAt,
  });

  return update;
};

/**
 * Business: Get own updates (newest first).
 */
export const getBusinessUpdatesService = async (businessId: string) => {
  return Update.find({ businessId: new mongoose.Types.ObjectId(businessId) })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Business: Delete own update.
 */
export const deleteBusinessUpdateService = async (businessId: string, updateId: string) => {
  if (!mongoose.Types.ObjectId.isValid(updateId)) {
    return null;
  }
  return Update.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(updateId),
    businessId: new mongoose.Types.ObjectId(businessId),
  });
};

/**
 * Register push token for user (deduped, max 5).
 */
export const registerPushTokenService = async (
  userId: string,
  token: string,
  platform: "ios" | "android" = "android"
) => {
  if (!token || typeof token !== "string") {
    throw new Error("Valid push token is required");
  }

  const user = await User.findById(userId);
  if (!user) return null;

  user.pushTokens = user.pushTokens || [];
  user.pushTokens = user.pushTokens.filter((pt) => pt.token !== token);
  user.pushTokens.unshift({
    token,
    platform: platform === "ios" ? "ios" : "android",
    updatedAt: new Date(),
  });

  if (user.pushTokens.length > 5) {
    user.pushTokens = user.pushTokens.slice(0, 5);
  }

  await user.save();
  return user.pushTokens;
};

/**
 * Remove push token for user on logout or opt-out.
 */
export const removePushTokenService = async (userId: string, token?: string) => {
  if (token) {
    await User.findByIdAndUpdate(userId, {
      $pull: { pushTokens: { token } },
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      $set: { pushTokens: [] },
    });
  }
  return { success: true };
};
