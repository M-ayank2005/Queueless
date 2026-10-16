import mongoose from "mongoose";
import QueueEntry from "../models/QueueEntry";
import User from "../models/User";
import {
  transitionTicketStatusService,
  cancelCustomerTicketService,
  joinQueueService
} from "../services/queueService";

describe("Queue Concurrency & Race-Condition Hardening — Integration Tests", () => {
  const businessId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const ticketId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(User, "findById").mockResolvedValue({
      _id: businessId,
      role: "business",
      businessProfile: {
        shopName: "Barber Store",
        services: [{ name: "Standard Haircut", durationMin: 20, cost: 25 }]
      }
    } as any);

    (jest.spyOn(QueueEntry, "find") as any).mockImplementation(() => {
      const chain: any = {
        sort: jest.fn().mockImplementation(() => chain),
        limit: jest.fn().mockImplementation(() => chain),
        select: jest.fn().mockImplementation(() => Promise.resolve([])),
        populate: jest.fn().mockImplementation(() => Promise.resolve([])),
        then: (resolve: any, reject?: any) => Promise.resolve([]).then(resolve, reject)
      };
      return chain;
    });

    jest.spyOn(QueueEntry, "countDocuments").mockResolvedValue(0 as any);
  });

  describe("Simultaneous Concurrent Joins", () => {
    it("should atomically reject simultaneous duplicate joins with 409 Conflict when unique index catches race condition", async () => {
      // Suppose simultaneous check findOne sees no active ticket (race window)
      jest.spyOn(QueueEntry, "findOne").mockResolvedValue(null);

      // First call succeeds, second call throws MongoServerError E11000 duplicate key error
      let callCount = 0;
      jest.spyOn(QueueEntry.prototype, "save").mockImplementation(function (this: any) {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(this);
        }
        const duplicateError: any = new Error("E11000 duplicate key error collection");
        duplicateError.code = 11000;
        duplicateError.name = "MongoServerError";
        return Promise.reject(duplicateError);
      });

      const services = [{ name: "Standard Haircut", durationMin: 20, cost: 25 }];

      // Simultaneous executions
      const request1 = joinQueueService(customerId.toString(), "Alice", businessId.toString(), services);
      const request2 = joinQueueService(customerId.toString(), "Alice", businessId.toString(), services);

      const results = await Promise.allSettled([request1, request2]);

      const fulfilled = results.filter(r => r.status === "fulfilled");
      const rejected = results.filter(r => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      if (rejected[0].status === "rejected") {
        expect(rejected[0].reason).toMatchObject({
          status: 409,
          message: expect.stringContaining("already have an active ticket")
        });
      }
    });
  });

  describe("Competing Status Transitions", () => {
    it("should reject a competing status transition with 409 Conflict if ticket was already modified", async () => {
      // Ticket is initially in 'waiting'
      const mockTicket = {
        _id: ticketId,
        businessId,
        customerId,
        status: "waiting",
        notificationLedger: {}
      };

      jest.spyOn(QueueEntry, "findOne").mockResolvedValue(mockTicket as any);

      // Simultaneous findOneAndUpdate: Another thread already transitioned the ticket, so findOneAndUpdate returns null
      jest.spyOn(QueueEntry, "findOneAndUpdate").mockResolvedValue(null);

      await expect(
        transitionTicketStatusService(ticketId.toString(), businessId.toString(), "in_progress")
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining("concurrently modified")
      });
    });

    it("should successfully execute atomic status transition when precondition matches", async () => {
      const mockTicket = {
        _id: ticketId,
        businessId,
        customerId,
        status: "waiting",
        notificationLedger: {}
      };

      jest.spyOn(QueueEntry, "findOne").mockResolvedValue(mockTicket as any);
      jest.spyOn(QueueEntry, "findOneAndUpdate").mockResolvedValue({
        ...mockTicket,
        status: "in_progress",
        serviceStartedAt: new Date()
      } as any);

      const updated = await transitionTicketStatusService(
        ticketId.toString(),
        businessId.toString(),
        "in_progress"
      );

      expect(updated.status).toBe("in_progress");
      expect(QueueEntry.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: ticketId.toString(), businessId: businessId.toString(), status: "waiting" }),
        expect.anything(),
        expect.objectContaining({ new: true })
      );
    });
  });

  describe("Atomic Customer Cancellation", () => {
    it("should reject customer cancellation if ticket was concurrently moved out of waiting/in_progress", async () => {
      // findOneAndUpdate returns null because ticket status was already completed by the merchant
      jest.spyOn(QueueEntry, "findOneAndUpdate").mockResolvedValue(null);

      // Re-query reveals ticket is completed
      jest.spyOn(QueueEntry, "findOne").mockResolvedValue({
        _id: ticketId,
        customerId,
        status: "completed"
      } as any);

      await expect(
        cancelCustomerTicketService(ticketId.toString(), customerId.toString())
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("Cannot cancel a ticket with status 'completed'")
      });
    });

    it("should atomically cancel ticket when status is in waiting or in_progress", async () => {
      const mockTicket = {
        _id: ticketId,
        businessId,
        customerId,
        status: "waiting"
      };

      jest.spyOn(QueueEntry, "findOneAndUpdate").mockResolvedValue({
        ...mockTicket,
        status: "cancelled",
        cancelledAt: new Date()
      } as any);

      const cancelled = await cancelCustomerTicketService(ticketId.toString(), customerId.toString());

      expect(cancelled.status).toBe("cancelled");
      expect(QueueEntry.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: ticketId.toString(),
          customerId: customerId.toString(),
          status: { $in: ["waiting", "in_progress"] }
        }),
        expect.anything(),
        expect.objectContaining({ new: true })
      );
    });
  });
});
