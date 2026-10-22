import mongoose, { Types } from "mongoose";
import Notification from "../models/Notification";
import Update from "../models/Update";
import User from "../models/User";
import QueueEntry from "../models/QueueEntry";
import {
  createNotification,
  coalesceQueueUpdatedNotification,
  getCustomerNotificationsService,
  getUnreadNotificationCountService,
  markNotificationsReadService,
  getCustomerUpdatesService,
  createBusinessUpdateService,
  getBusinessUpdatesService,
  deleteBusinessUpdateService,
  registerPushTokenService,
  removePushTokenService,
} from "../services/notificationService";

describe("Notifications & Updates Feed Subsystem", () => {
  const customerAId = new Types.ObjectId();
  const customerBId = new Types.ObjectId();
  const businessAId = new Types.ObjectId();
  const businessBId = new Types.ObjectId();
  const queueEntryId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("A1 & A2: Notification creation & deduplication", () => {
    it("should create a notification with valid fields", async () => {
      const mockNotif = {
        _id: new Types.ObjectId(),
        userId: customerAId,
        type: "joined",
        title: "Joined queue",
        message: "You are successfully added to the queue at Smile Dental Care.",
        dedupeKey: `joined:${queueEntryId}`,
        readAt: null,
      };
      jest.spyOn(Notification, "create").mockResolvedValue(mockNotif as any);

      const notif = await createNotification({
        userId: customerAId,
        type: "joined",
        title: mockNotif.title,
        message: mockNotif.message,
        queueId: queueEntryId,
        businessId: businessAId,
        dedupeKey: `joined:${queueEntryId}`,
      });

      expect(notif).toBeDefined();
      expect(notif?.title).toBe("Joined queue");
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "joined",
          dedupeKey: `joined:${queueEntryId}`,
        })
      );
    });

    it("should handle duplicate key collision gracefully without throwing", async () => {
      jest.spyOn(Notification, "create").mockRejectedValue({ code: 11000 });

      const notif = await createNotification({
        userId: customerAId,
        type: "joined",
        title: "Joined queue",
        message: "You are successfully added to the queue.",
        dedupeKey: `joined:${queueEntryId}`,
      });

      expect(notif).toBeNull();
    });

    it("should coalesce queue_updated notification in place", async () => {
      const existingNotif = {
        _id: new Types.ObjectId(),
        userId: customerAId,
        type: "queue_updated",
        meta: { position: 3, waitMin: 15, shopName: "City Bank" },
        message: "Old message",
        save: jest.fn().mockResolvedValue({
          meta: { position: 2, waitMin: 10, shopName: "City Bank" },
          message: "Your queue has moved at City Bank.",
        }),
      };

      jest.spyOn(Notification, "findOne").mockResolvedValue(existingNotif as any);

      const updated = await coalesceQueueUpdatedNotification({
        userId: customerAId,
        queueId: queueEntryId,
        businessId: businessAId,
        position: 2,
        waitMin: 10,
        shopName: "City Bank",
      });

      expect(existingNotif.save).toHaveBeenCalled();
      expect(existingNotif.meta.position).toBe(2);
      expect(existingNotif.message).toBe("Your queue has moved at City Bank.");
    });
  });

  describe("A3: Notification Pagination, Unread Counts & Marking as Read", () => {
    it("should return paginated notifications and accurate unreadCount", async () => {
      const mockItems = [
        { _id: new Types.ObjectId(), title: "Notif 1", readAt: null },
        { _id: new Types.ObjectId(), title: "Notif 2", readAt: new Date() },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      };
      jest.spyOn(Notification, "find").mockReturnValue(mockQuery as any);
      jest.spyOn(Notification, "countDocuments").mockResolvedValue(1);

      const result = await getCustomerNotificationsService(customerAId.toString(), 20);

      expect(result.items).toHaveLength(2);
      expect(result.unreadCount).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should mark specific notification IDs as read", async () => {
      const notifId = new Types.ObjectId();
      jest.spyOn(Notification, "updateMany").mockResolvedValue({ modifiedCount: 1 } as any);

      const res = await markNotificationsReadService(customerAId.toString(), [notifId.toString()]);
      expect(res.updated).toBe(1);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerAId,
          _id: { $in: [notifId] },
          readAt: null,
        }),
        expect.objectContaining({ $set: { readAt: expect.any(Date) } })
      );
    });

    it("should mark all user notifications read when no IDs provided", async () => {
      jest.spyOn(Notification, "updateMany").mockResolvedValue({ modifiedCount: 4 } as any);

      const res = await markNotificationsReadService(customerAId.toString());
      expect(res.updated).toBe(4);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerAId,
          readAt: null,
        }),
        expect.objectContaining({ $set: { readAt: expect.any(Date) } })
      );
    });

    it("cannot mark another customer's notifications (IDOR guard)", async () => {
      jest.spyOn(Notification, "updateMany").mockResolvedValue({ modifiedCount: 0 } as any);

      const foreignNotifId = new Types.ObjectId();
      // customer B tries to mark customer A's notification
      const res = await markNotificationsReadService(customerBId.toString(), [foreignNotifId.toString()]);
      expect(res.updated).toBe(0);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerBId, // strictly customer B's id
          _id: { $in: [foreignNotifId] },
        }),
        expect.any(Object)
      );
    });
  });

  describe("A4: Updates Model & Visibility Rule", () => {
    it("should validate and create a business announcement update", async () => {
      const mockUpdate = {
        _id: new Types.ObjectId(),
        businessId: businessAId,
        type: "alert",
        title: "Holiday Notice",
        message: "Closed on Sunday due to public holiday.",
      };
      jest.spyOn(Update, "create").mockResolvedValue(mockUpdate as any);

      const created = await createBusinessUpdateService(businessAId.toString(), {
        type: "alert",
        title: "Holiday Notice",
        message: "Closed on Sunday due to public holiday.",
      });

      expect(created).toBeDefined();
      expect(created.title).toBe("Holiday Notice");
      expect(Update.create).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: businessAId,
          type: "alert",
          title: "Holiday Notice",
        })
      );
    });

    it("should reject invalid title or message lengths", async () => {
      await expect(
        createBusinessUpdateService(businessAId.toString(), {
          type: "alert",
          title: "A".repeat(61), // > 60 chars
          message: "Valid message",
        })
      ).rejects.toThrow("Title is required and must not exceed 60 characters");

      await expect(
        createBusinessUpdateService(businessAId.toString(), {
          type: "alert",
          title: "Valid Title",
          message: "M".repeat(201), // > 200 chars
        })
      ).rejects.toThrow("Message is required and must not exceed 200 characters");
    });

    it("should enforce validTill and validForDays 1-30 for offers", async () => {
      await expect(
        createBusinessUpdateService(businessAId.toString(), {
          type: "offer",
          title: "Special Offer",
          message: "Get 20% off",
          validForDays: 35, // > 30
        })
      ).rejects.toThrow("validForDays must be between 1 and 30");

      jest.spyOn(Update, "create").mockResolvedValue({ _id: new Types.ObjectId() } as any);
      await createBusinessUpdateService(businessAId.toString(), {
        type: "offer",
        title: "Special Offer",
        message: "Get 20% off",
        validForDays: 7,
      });

      expect(Update.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "offer",
          validTill: expect.any(Date),
        })
      );
    });

    it("should enforce visibility rule: customer sees updates from favorites or visited in last 30 days", async () => {
      // Customer favorited businessAId, visited businessBId
      jest.spyOn(User, "findById").mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            favoriteBusinesses: [businessAId],
          }),
        }),
      } as any);

      jest.spyOn(QueueEntry, "distinct").mockResolvedValue([businessBId] as any);

      const mockUpdates = [
        {
          _id: new Types.ObjectId(),
          type: "alert",
          title: "Notice from Fav",
          message: "Hello",
          businessId: { _id: businessAId, businessProfile: { shopName: "Fav Store" } },
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUpdates),
      };
      jest.spyOn(Update, "find").mockReturnValue(mockQuery as any);

      const feed = await getCustomerUpdatesService(customerAId.toString());

      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].shopName).toBe("Fav Store");
      expect(Update.find).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: { $in: [businessAId, businessBId] },
        })
      );
    });

    it("should return empty feed if customer has no favorites and no recent visits", async () => {
      jest.spyOn(User, "findById").mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            favoriteBusinesses: [],
          }),
        }),
      } as any);

      jest.spyOn(QueueEntry, "distinct").mockResolvedValue([] as any);

      const feed = await getCustomerUpdatesService(customerAId.toString());
      expect(feed.items).toEqual([]);
      expect(feed.hasMore).toBe(false);
    });

    it("should strictly check ownership when business deletes an update", async () => {
      jest.spyOn(Update, "findOneAndDelete").mockResolvedValue({ _id: new Types.ObjectId() } as any);

      const updateId = new Types.ObjectId();
      await deleteBusinessUpdateService(businessAId.toString(), updateId.toString());

      expect(Update.findOneAndDelete).toHaveBeenCalledWith({
        _id: updateId,
        businessId: businessAId,
      });
    });
  });

  describe("Part C: Push Token Registration & Management", () => {
    it("should register, dedupe and cap push tokens at 5", async () => {
      const mockUser = {
        _id: customerAId,
        pushTokens: [
          { token: "tok-1", platform: "android" },
          { token: "tok-2", platform: "android" },
          { token: "tok-3", platform: "android" },
          { token: "tok-4", platform: "android" },
          { token: "tok-5", platform: "android" },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, "findById").mockResolvedValue(mockUser as any);

      const tokens = await registerPushTokenService(customerAId.toString(), "tok-new", "ios");

      expect(mockUser.save).toHaveBeenCalled();
      expect(tokens).toHaveLength(5);
      expect(tokens![0].token).toBe("tok-new");
      expect(tokens![0].platform).toBe("ios");
    });

    it("should remove push token on logout", async () => {
      jest.spyOn(User, "findByIdAndUpdate").mockResolvedValue({} as any);

      await removePushTokenService(customerAId.toString(), "tok-1");
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(customerAId.toString(), {
        $pull: { pushTokens: { token: "tok-1" } },
      });
    });
  });
});
