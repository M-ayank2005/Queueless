import {
  calculateTicketWaitEstimate,
  getStoreHistoricalSpeedFactor,
  evaluateQueueNotificationsService,
  transitionTicketStatusService,
  toggleFavoriteService,
  quickRebookService,
  VALID_TRANSITIONS
} from "../services/queueService";
import QueueEntry from "../models/QueueEntry";
import User from "../models/User";
import mongoose from "mongoose";

jest.mock("../models/QueueEntry");
jest.mock("../models/User");

describe("Queue Service Engine — Unit Tests", () => {
  const dummyBusinessId = new mongoose.Types.ObjectId();
  const now = new Date();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Queue State Machine Transitions", () => {
    it("should allow valid transitions", () => {
      expect(VALID_TRANSITIONS["waiting"]).toContain("in_progress");
      expect(VALID_TRANSITIONS["waiting"]).toContain("cancelled");
      expect(VALID_TRANSITIONS["in_progress"]).toContain("completed");
      expect(VALID_TRANSITIONS["in_progress"]).toContain("cancelled");
    });

    it("should disallow arbitrary or backward transitions", () => {
      expect(VALID_TRANSITIONS["waiting"]).not.toContain("completed");
      expect(VALID_TRANSITIONS["completed"]).toHaveLength(0);
      expect(VALID_TRANSITIONS["cancelled"]).toHaveLength(0);
    });
  });

  describe("Historical Speed Learning", () => {
    it("should return standard factor 1.0 when insufficient history exists", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([
          { actualServiceDurationMin: 25, selectedServices: [{ durationMin: 30 }] }
        ])
      };
      (QueueEntry.find as jest.Mock).mockReturnValue(mockQuery);

      const stats = await getStoreHistoricalSpeedFactor(dummyBusinessId);
      expect(stats.speedRatio).toBe(1.0);
      expect(stats.confidence).toBe("standard");
      expect(stats.confidenceLabel).toContain("Standard catalog estimate");
    });

    it("should calculate speed ratio and high confidence when sufficient completed tickets exist", async () => {
      const sixTickets = Array.from({ length: 6 }).map(() => ({
        actualServiceDurationMin: 24, // 24 mins actual
        selectedServices: [{ durationMin: 30 }] // 30 mins scheduled (0.80 speed ratio)
      }));

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(sixTickets)
      };
      (QueueEntry.find as jest.Mock).mockReturnValue(mockQuery);

      const stats = await getStoreHistoricalSpeedFactor(dummyBusinessId);
      expect(stats.speedRatio).toBe(0.8);
      expect(stats.confidence).toBe("high");
      expect(stats.confidenceLabel).toContain("Based on today's counter speed (6 served)");
    });
  });

  describe("Authoritative Wait Time & Smart Prediction Calculation", () => {
    it("should return 0 wait and 0 people ahead if ticket is completed", async () => {
      const result = await calculateTicketWaitEstimate(
        dummyBusinessId,
        now,
        "completed"
      );

      expect(result.peopleAhead).toBe(0);
      expect(result.currentEstimatedWait).toBe(0);
      expect(result.prediction.rangeDisplay).toBe("Completed");
    });

    it("should return 0 wait and 0 people ahead if ticket is in_progress", async () => {
      const result = await calculateTicketWaitEstimate(
        dummyBusinessId,
        now,
        "in_progress",
        now
      );

      expect(result.peopleAhead).toBe(0);
      expect(result.currentEstimatedWait).toBe(0);
      expect(result.prediction.rangeDisplay).toBe("At counter now");
    });

    it("should return 0 wait if no other customers are waiting or in progress", async () => {
      (QueueEntry.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock find for waitingAhead and for historical speed stats
      (QueueEntry.find as jest.Mock).mockImplementation((filter: any) => {
        if (filter.status === "completed") {
          return {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([])
          };
        }
        return {
          sort: jest.fn().mockResolvedValue([])
        };
      });

      const result = await calculateTicketWaitEstimate(
        dummyBusinessId,
        now,
        "waiting"
      );

      expect(result.peopleAhead).toBe(0);
      expect(result.currentEstimatedWait).toBe(0);
      expect(result.prediction.rangeDisplay).toBe("Next in line");
    });

    it("should accurately estimate wait time with in_progress customer and customers ahead", async () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      (QueueEntry.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: "in_progress",
        serviceStartedAt: tenMinsAgo,
        selectedServices: [{ name: "Haircut", durationMin: 30, cost: 25 }]
      });

      (QueueEntry.find as jest.Mock).mockImplementation((filter: any) => {
        if (filter.status === "completed") {
          return {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([])
          };
        }
        return {
          sort: jest.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              status: "waiting",
              selectedServices: [{ name: "Beard Trim", durationMin: 15, cost: 15 }]
            }
          ])
        };
      });

      const result = await calculateTicketWaitEstimate(
        dummyBusinessId,
        now,
        "waiting"
      );

      expect(result.peopleAhead).toBe(2);
      expect(result.inProgressRemainingMin).toBe(20);
      expect(result.waitingAheadMin).toBe(15);
      expect(result.currentEstimatedWait).toBe(35);
      expect(result.prediction.rangeDisplay).toContain("mins");
      expect(result.prediction.confidence).toBe("standard");
    });

    it("should enforce minimum 2-minute buffer if in_progress has exceeded duration", async () => {
      const fortyMinsAgo = new Date(Date.now() - 40 * 60 * 1000);
      (QueueEntry.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: "in_progress",
        serviceStartedAt: fortyMinsAgo,
        selectedServices: [{ name: "Haircut", durationMin: 30, cost: 25 }]
      });

      (QueueEntry.find as jest.Mock).mockImplementation((filter: any) => {
        if (filter.status === "completed") {
          return {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([])
          };
        }
        return {
          sort: jest.fn().mockResolvedValue([])
        };
      });

      const result = await calculateTicketWaitEstimate(
        dummyBusinessId,
        now,
        "waiting"
      );

      expect(result.peopleAhead).toBe(1);
      expect(result.inProgressRemainingMin).toBe(2);
      expect(result.currentEstimatedWait).toBe(2);
      expect(result.prediction.rangeDisplay).toBe("under 5 mins");
    });
  });

  describe("Turn-Approaching Notifications & Deduplication", () => {
    let mockEmitter: { emit: jest.Mock };
    let mockIo: any;

    beforeEach(() => {
      mockEmitter = { emit: jest.fn() };
      mockIo = {
        to: jest.fn(() => mockEmitter),
        emit: jest.fn()
      };
    });

    it("should trigger TURN_APPROACHING notification when customer is within threshold", async () => {
      const mockTicket: any = {
        _id: new mongoose.Types.ObjectId(),
        businessId: {
          businessProfile: { shopName: "Elite Barber" }
        },
        customerId: new mongoose.Types.ObjectId(),
        status: "waiting",
        joinedAt: now,
        notificationLedger: {},
        save: jest.fn().mockResolvedValue(true)
      };

      (QueueEntry.find as jest.Mock).mockImplementation((filter: any) => {
        if (filter.status === "waiting" && !filter.joinedAt) {
          return {
            sort: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([mockTicket])
            })
          };
        }
        if (filter.status === "completed") {
          return {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([])
          };
        }
        // For calculateTicketWaitEstimate waitingAhead query
        return {
          sort: jest.fn().mockResolvedValue([])
        };
      });

      (QueueEntry.findOne as jest.Mock).mockResolvedValue(null);

      const dispatched = await evaluateQueueNotificationsService(dummyBusinessId, mockIo, 2);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].type).toBe("TURN_APPROACHING");
      expect(dispatched[0].shopName).toBe("Elite Barber");
      expect(mockTicket.notificationLedger.turnApproachingSentAt).toBeDefined();
      expect(mockTicket.save).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith(`queue_${mockTicket._id}`);
      expect(mockIo.to).toHaveBeenCalledWith(`user_${mockTicket.customerId}`);
      expect(mockEmitter.emit).toHaveBeenCalledWith("customer_notification", expect.objectContaining({
        type: "TURN_APPROACHING",
        ticketId: mockTicket._id.toString()
      }));
    });

    it("should enforce deduplication and NOT resend TURN_APPROACHING if already dispatched", async () => {
      const alreadySentTicket: any = {
        _id: new mongoose.Types.ObjectId(),
        businessId: {
          businessProfile: { shopName: "Elite Barber" }
        },
        customerId: new mongoose.Types.ObjectId(),
        status: "waiting",
        joinedAt: now,
        notificationLedger: {
          turnApproachingSentAt: new Date(Date.now() - 60000)
        },
        save: jest.fn().mockResolvedValue(true)
      };

      (QueueEntry.find as jest.Mock).mockImplementation((filter: any) => {
        if (filter.status === "waiting" && !filter.joinedAt) {
          return {
            sort: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([alreadySentTicket])
            })
          };
        }
        return {
          sort: jest.fn().mockResolvedValue([])
        };
      });

      (QueueEntry.findOne as jest.Mock).mockResolvedValue(null);

      const dispatched = await evaluateQueueNotificationsService(dummyBusinessId, mockIo, 2);

      expect(dispatched).toHaveLength(0);
      expect(alreadySentTicket.save).not.toHaveBeenCalled();
      expect(mockEmitter.emit).not.toHaveBeenCalledWith("customer_notification", expect.anything());
    });

    it("should trigger YOUR_TURN notification when transitioning status to in_progress", async () => {
      const ticketId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const mockTicket: any = {
        _id: ticketId,
        businessId: dummyBusinessId,
        customerId,
        status: "waiting",
        notificationLedger: {},
        save: jest.fn().mockResolvedValue(true)
      };

      (QueueEntry.findOne as jest.Mock).mockResolvedValue(mockTicket);
      (QueueEntry.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...mockTicket,
        status: "in_progress",
        notificationLedger: { yourTurnSentAt: new Date() }
      });
      (User.findById as jest.Mock).mockResolvedValue({
        businessProfile: { shopName: "Elite Barber" }
      });

      (QueueEntry.find as jest.Mock).mockImplementation((filter: any) => {
        if (filter.status === "waiting" && !filter.joinedAt) {
          return {
            sort: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue([])
            })
          };
        }
        return {
          sort: jest.fn().mockResolvedValue([])
        };
      });

      const updated = await transitionTicketStatusService(
        ticketId.toString(),
        dummyBusinessId.toString(),
        "in_progress",
        mockIo
      );

      expect(updated.status).toBe("in_progress");
      expect(QueueEntry.findOneAndUpdate).toHaveBeenCalled();
      expect(mockEmitter.emit).toHaveBeenCalledWith("customer_notification", expect.objectContaining({
        type: "YOUR_TURN",
        title: "It's Your Turn! 🎯"
      }));
    });
  });

  describe("Favourites & Quick Rebooking Engine", () => {
    const customerId = new mongoose.Types.ObjectId();
    const businessId = new mongoose.Types.ObjectId();

    describe("toggleFavoriteService", () => {
      it("should add store to customer favorites if not already present", async () => {
        (User.findOne as jest.Mock).mockResolvedValue({
          _id: businessId,
          role: "business",
          businessProfile: { shopName: "Elite Barber" }
        });

        (User.findById as jest.Mock).mockResolvedValue({
          _id: customerId,
          role: "customer",
          favoriteBusinesses: []
        });

        (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(true);

        const result = await toggleFavoriteService(customerId.toString(), businessId.toString());

        expect(result.isFavorite).toBe(true);
        expect(result.message).toBe("Added to favorites");
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          customerId.toString(),
          expect.objectContaining({
            $addToSet: { favoriteBusinesses: new mongoose.Types.ObjectId(businessId.toString()) }
          })
        );
      });

      it("should remove store from customer favorites if already present", async () => {
        (User.findOne as jest.Mock).mockResolvedValue({
          _id: businessId,
          role: "business",
          businessProfile: { shopName: "Elite Barber" }
        });

        (User.findById as jest.Mock).mockResolvedValue({
          _id: customerId,
          role: "customer",
          favoriteBusinesses: [businessId]
        });

        (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(true);

        const result = await toggleFavoriteService(customerId.toString(), businessId.toString());

        expect(result.isFavorite).toBe(false);
        expect(result.message).toBe("Removed from favorites");
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
          customerId.toString(),
          expect.objectContaining({
            $pull: { favoriteBusinesses: new mongoose.Types.ObjectId(businessId.toString()) }
          })
        );
      });

      it("should throw 404 if business does not exist", async () => {
        (User.findOne as jest.Mock).mockResolvedValue(null);

        await expect(
          toggleFavoriteService(customerId.toString(), businessId.toString())
        ).rejects.toMatchObject({ status: 404, message: "Business store not found" });
      });
    });

    describe("quickRebookService", () => {
      it("should reject rebooking if store is closed", async () => {
        (User.findById as jest.Mock).mockResolvedValue({
          _id: businessId,
          role: "business",
          businessProfile: {
            shopName: "Elite Barber",
            workingHours: {
              openTime: "09:00",
              closeTime: "17:00",
              closedDays: [0, 1, 2, 3, 4, 5, 6] // permanently closed in test
            },
            services: [{ name: "Haircut", durationMin: 30, cost: 25 }]
          }
        });

        await expect(
          quickRebookService(
            customerId.toString(),
            "John Doe",
            { businessId: businessId.toString() }
          )
        ).rejects.toMatchObject({ status: 400 });
      });

      it("should successfully quick-rebook based on past ticket", async () => {
        const pastTicketId = new mongoose.Types.ObjectId();
        const pastTicket = {
          _id: pastTicketId,
          businessId,
          customerId,
          selectedServices: [{ name: "Haircut", durationMin: 30, cost: 25 }]
        };

        (QueueEntry.findOne as jest.Mock).mockImplementation((query: any) => {
          if (query._id && query._id.toString() === pastTicketId.toString()) {
            return Promise.resolve(pastTicket);
          }
          if (query.businessId && query.status) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        });

        (User.findById as jest.Mock).mockResolvedValue({
          _id: businessId,
          role: "business",
          businessProfile: {
            shopName: "Elite Barber",
            workingHours: {
              openTime: "00:00",
              closeTime: "23:59",
              closedDays: []
            },
            services: [{ name: "Haircut", durationMin: 30, cost: 25 }]
          }
        });

        (QueueEntry.find as jest.Mock).mockImplementation((filter: any) => {
          if (filter.status === "completed") {
            return {
              sort: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              select: jest.fn().mockResolvedValue([])
            };
          }
          if (filter.status === "waiting" && !filter.joinedAt) {
            return {
              sort: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue([])
              })
            };
          }
          return {
            sort: jest.fn().mockResolvedValue([])
          };
        });

        const mockSave = jest.fn().mockResolvedValue(true);
        (QueueEntry as any).mockImplementation((doc: any) => ({
          ...doc,
          _id: new mongoose.Types.ObjectId(),
          toObject: () => ({ ...doc, _id: new mongoose.Types.ObjectId() }),
          save: mockSave
        }));

        const result = await quickRebookService(
          customerId.toString(),
          "John Doe",
          { pastTicketId: pastTicketId.toString() }
        );

        expect(result).toBeDefined();
        expect(result.status).toBe("waiting");
      });
    });
  });
});
