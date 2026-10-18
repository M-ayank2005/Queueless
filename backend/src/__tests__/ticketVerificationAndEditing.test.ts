import mongoose, { Types } from "mongoose";
import QueueEntry from "../models/QueueEntry";
import User from "../models/User";
import {
  joinQueueService,
  verifyTicketService,
  editCustomerTicketService,
  revokeTicketVerificationTokenService
} from "../services/queueService";

describe("Ticket Verification, Service Quantities & Safe Active Booking Edits", () => {
  const storeAId = new Types.ObjectId();
  const storeBId = new Types.ObjectId();
  const customerId = new Types.ObjectId();
  const strangerCustomerId = new Types.ObjectId();

  const storeACatalog = [
    { name: "Haircut", durationMin: 20, cost: 25 },
    { name: "Beard Trim", durationMin: 15, cost: 15 },
    { name: "Hair Wash", durationMin: 10, cost: 10 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (jest.spyOn(User, "findById") as any).mockImplementation((id: any) => {
      const idStr = id?.toString();
      if (idStr === storeAId.toString()) {
        return Promise.resolve({
          _id: storeAId,
          role: "business",
          businessProfile: {
            shopName: "Store A Barbershop",
            address: "123 Main St",
            services: storeACatalog
          }
        } as any);
      }
      if (idStr === storeBId.toString()) {
        return Promise.resolve({
          _id: storeBId,
          role: "business",
          businessProfile: {
            shopName: "Store B Salon",
            address: "456 Oak St",
            services: [{ name: "Styling", durationMin: 30, cost: 40 }]
          }
        } as any);
      }
      return Promise.resolve(null);
    });

    // Mock QueueEntry.find query builder
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

    jest.spyOn(QueueEntry, "findOne").mockResolvedValue(null as any);
    jest.spyOn(QueueEntry, "countDocuments").mockResolvedValue(0 as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Service Quantities & Forged Client Prices", () => {
    it("should accept valid integer quantities and calculate correct total times", async () => {
      jest.spyOn(QueueEntry, "findOne").mockResolvedValue(null);

      let savedDoc: any = null;
      jest.spyOn(QueueEntry.prototype, "save").mockImplementation(function (this: any) {
        savedDoc = this;
        return Promise.resolve(this);
      });

      const requested = [
        { name: "Haircut", quantity: 3 }, // 3 x 20m = 60m
        { name: "Beard Trim", quantity: 1 } // 1 x 15m = 15m
      ];

      const res = await joinQueueService(
        customerId.toString(),
        "John Doe",
        storeAId.toString(),
        requested
      );

      expect(savedDoc).toBeDefined();
      expect(savedDoc.selectedServices).toHaveLength(2);
      expect(savedDoc.selectedServices[0].quantity).toBe(3);
      expect(savedDoc.selectedServices[0].cost).toBe(25);
      expect(savedDoc.selectedServices[1].quantity).toBe(1);
      expect(savedDoc.verificationToken).toBeDefined();
      expect(savedDoc.verificationToken.length).toBeGreaterThanOrEqual(16);
      expect(res.verificationToken).toBeDefined();
    });

    it("should strictly reject non-integer, zero, negative, or excessive quantities", async () => {
      jest.spyOn(QueueEntry, "findOne").mockResolvedValue(null);

      // Zero quantity
      await expect(
        joinQueueService(customerId.toString(), "Customer", storeAId.toString(), [
          { name: "Haircut", quantity: 0 }
        ])
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("positive integer between 1 and 50")
      });

      // Negative quantity
      await expect(
        joinQueueService(customerId.toString(), "Customer", storeAId.toString(), [
          { name: "Haircut", quantity: -2 }
        ])
      ).rejects.toMatchObject({
        status: 400
      });

      // Float quantity
      await expect(
        joinQueueService(customerId.toString(), "Customer", storeAId.toString(), [
          { name: "Haircut", quantity: 2.5 }
        ])
      ).rejects.toMatchObject({
        status: 400
      });

      // Excessive quantity (>50)
      await expect(
        joinQueueService(customerId.toString(), "Customer", storeAId.toString(), [
          { name: "Haircut", quantity: 99 }
        ])
      ).rejects.toMatchObject({
        status: 400
      });
    });

    it("should overwrite forged client-supplied prices and durations with catalog values", async () => {
      jest.spyOn(QueueEntry, "findOne").mockResolvedValue(null);

      let savedDoc: any = null;
      jest.spyOn(QueueEntry.prototype, "save").mockImplementation(function (this: any) {
        savedDoc = this;
        return Promise.resolve(this);
      });

      // Client attempts to supply $1 price and 1 min duration
      const forgedRequest = [
        { name: "Haircut", quantity: 2, cost: 1, durationMin: 1 }
      ];

      await joinQueueService(
        customerId.toString(),
        "Hacker",
        storeAId.toString(),
        forgedRequest
      );

      expect(savedDoc.selectedServices[0].cost).toBe(25); // Original catalog cost
      expect(savedDoc.selectedServices[0].durationMin).toBe(20); // Original catalog duration
    });
  });

  describe("Repeat Scans & Duplicate Active Ticket Rejection", () => {
    it("should reject joining with 409 and return existing active ticket details when repeat scan occurs", async () => {
      const activeTicketId = new Types.ObjectId();
      const existingTicket = {
        _id: activeTicketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }],
        joinedAt: new Date()
      };

      jest.spyOn(QueueEntry, "findOne").mockResolvedValue(existingTicket as any);

      try {
        await joinQueueService(
          customerId.toString(),
          "Customer",
          storeAId.toString(),
          [{ name: "Haircut", quantity: 1 }]
        );
        fail("Should have thrown 409 Conflict");
      } catch (err: any) {
        expect(err.status).toBe(409);
        expect(err.activeTicketId).toEqual(activeTicketId);
        expect(err.activeTicket).toBeDefined();
        expect(err.activeTicket._id).toEqual(activeTicketId);
        expect(err.message).toContain("already have an active ticket");
      }
    });
  });

  describe("Unique Verification Token & QR Verification Engine", () => {
    it("should successfully verify ticket when token and owning business match", async () => {
      const ticketId = new Types.ObjectId();
      const token = "abcdef1234567890abcdef12";

      const mockTicket: any = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        verificationToken: token,
        verificationTokenRevoked: false,
        joinedAt: new Date(),
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }],
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockTicket)
      } as any));

      const res = await verifyTicketService(storeAId.toString(), {
        ticketId: ticketId.toString(),
        token
      });

      expect(res.verified).toBe(true);
      expect(mockTicket.verifiedAt).toBeDefined();
      expect(mockTicket.save).toHaveBeenCalled();
    });

    it("should accept formatted QR payloads such as 'ql-ticket:<id>:<token>'", async () => {
      const ticketId = new Types.ObjectId();
      const token = "9876543210fedcba98765432";

      const mockTicket: any = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        verificationToken: token,
        verificationTokenRevoked: false,
        joinedAt: new Date(),
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }],
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockTicket)
      } as any));

      const res = await verifyTicketService(storeAId.toString(), {
        token: `ql-ticket:${ticketId.toString()}:${token}`
      });

      expect(res.verified).toBe(true);
      expect(mockTicket.verifiedAt).toBeDefined();
    });

    it("should support manual ticket-ID verification for active tickets of the store", async () => {
      const ticketId = new Types.ObjectId();

      const mockTicket: any = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        verificationToken: "sometoken",
        verificationTokenRevoked: false,
        joinedAt: new Date(),
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }],
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockTicket)
      } as any));

      const res = await verifyTicketService(storeAId.toString(), {
        ticketId: ticketId.toString()
      });

      expect(res.verified).toBe(true);
      expect(mockTicket.verifiedAt).toBeDefined();
    });

    it("should DENY verification with 403 when ticket belongs to another business", async () => {
      const ticketId = new Types.ObjectId();
      const token = "tok123";

      const mockTicket = {
        _id: ticketId,
        businessId: storeBId, // Belongs to Store B!
        customerId,
        status: "waiting",
        verificationToken: token,
        verificationTokenRevoked: false,
        save: jest.fn(),
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockTicket)
      } as any));

      // Store A tries to verify Store B's ticket
      await expect(
        verifyTicketService(storeAId.toString(), {
          ticketId: ticketId.toString(),
          token
        })
      ).rejects.toMatchObject({
        status: 403,
        message: expect.stringContaining("belongs to another store")
      });
    });

    it("should reject verification when token does not match ticket", async () => {
      const ticketId = new Types.ObjectId();

      const mockTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        verificationToken: "correct_token",
        verificationTokenRevoked: false,
        save: jest.fn(),
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockTicket)
      } as any));

      await expect(
        verifyTicketService(storeAId.toString(), {
          ticketId: ticketId.toString(),
          token: "wrong_forged_token"
        })
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("Invalid verification token")
      });
    });

    it("should reject verification when token has been revoked", async () => {
      const ticketId = new Types.ObjectId();
      const token = "revoked_token";

      const mockTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        verificationToken: token,
        verificationTokenRevoked: true, // Revoked!
        save: jest.fn(),
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockTicket)
      } as any));

      await expect(
        verifyTicketService(storeAId.toString(), {
          ticketId: ticketId.toString(),
          token
        })
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("revoked")
      });
    });

    it("should reject verification for completed or cancelled tickets (incompatible state)", async () => {
      const ticketId = new Types.ObjectId();
      const token = "some_token";

      // Completed ticket
      const completedTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "completed",
        verificationToken: token,
        verificationTokenRevoked: false,
        save: jest.fn(),
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(completedTicket)
      } as any));

      await expect(
        verifyTicketService(storeAId.toString(), {
          ticketId: ticketId.toString(),
          token
        })
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("completed")
      });

      // Cancelled ticket
      const cancelledTicket = {
        ...completedTicket,
        status: "cancelled"
      };

      jest.spyOn(QueueEntry, "findById").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(cancelledTicket)
      } as any));

      await expect(
        verifyTicketService(storeAId.toString(), {
          ticketId: ticketId.toString(),
          token
        })
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("cancelled")
      });
    });
  });

  describe("Safe Active Booking Edits", () => {
    it("should safely edit services on an active waiting ticket while preserving joinedAt", async () => {
      const ticketId = new Types.ObjectId();
      const originalJoinedAt = new Date(Date.now() - 1000 * 60 * 15); // 15 mins ago

      const existingTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        joinedAt: originalJoinedAt,
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }]
      };

      jest.spyOn(QueueEntry, "findById").mockResolvedValue(existingTicket as any);

      const updatedTicket = {
        ...existingTicket,
        selectedServices: [
          { name: "Haircut", durationMin: 20, cost: 25, quantity: 2 },
          { name: "Hair Wash", durationMin: 10, cost: 10, quantity: 1 }
        ],
        toObject: function () {
          return { ...this };
        }
      };

      jest.spyOn(QueueEntry, "findOneAndUpdate").mockResolvedValue(updatedTicket as any);

      const res = await editCustomerTicketService(
        ticketId.toString(),
        customerId.toString(),
        [
          { name: "Haircut", quantity: 2 },
          { name: "Hair Wash", quantity: 1 }
        ]
      );

      expect(res.selectedServices).toHaveLength(2);
      expect(res.selectedServices[0].quantity).toBe(2);
      expect(res.selectedServices[1].quantity).toBe(1);
      expect(QueueEntry.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: ticketId.toString(), status: "waiting" },
        expect.any(Object),
        { new: true }
      );
    });

    it("should reject editing if ticket is in_progress, completed, or cancelled", async () => {
      const ticketId = new Types.ObjectId();

      const inProgressTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "in_progress",
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }]
      };

      jest.spyOn(QueueEntry, "findById").mockResolvedValue(inProgressTicket as any);

      await expect(
        editCustomerTicketService(ticketId.toString(), customerId.toString(), [
          { name: "Haircut", quantity: 2 }
        ])
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("in_progress")
      });
    });

    it("should reject editing from unauthorized stranger", async () => {
      const ticketId = new Types.ObjectId();

      const existingTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }]
      };

      jest.spyOn(QueueEntry, "findById").mockResolvedValue(existingTicket as any);

      await expect(
        editCustomerTicketService(ticketId.toString(), strangerCustomerId.toString(), [
          { name: "Haircut", quantity: 2 }
        ])
      ).rejects.toMatchObject({
        status: 403,
        message: expect.stringContaining("not authorized")
      });
    });

    it("should handle concurrent edit modification race conditions with 409", async () => {
      const ticketId = new Types.ObjectId();

      const existingTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        status: "waiting",
        selectedServices: [{ name: "Haircut", durationMin: 20, cost: 25, quantity: 1 }]
      };

      jest.spyOn(QueueEntry, "findById").mockResolvedValue(existingTicket as any);
      // findOneAndUpdate returns null because another process transitioned status or updated it
      jest.spyOn(QueueEntry, "findOneAndUpdate").mockResolvedValue(null);

      await expect(
        editCustomerTicketService(ticketId.toString(), customerId.toString(), [
          { name: "Haircut", quantity: 2 }
        ])
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining("concurrently modified")
      });
    });

    it("should support token revocation and regeneration", async () => {
      const ticketId = new Types.ObjectId();

      const mockTicket = {
        _id: ticketId,
        businessId: storeAId,
        customerId,
        verificationToken: "old_token",
        verificationTokenHash: "old_hash",
        verificationTokenRevoked: false,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(QueueEntry, "findById").mockResolvedValue(mockTicket as any);

      const res = await revokeTicketVerificationTokenService(
        ticketId.toString(),
        customerId.toString(),
        true
      );

      expect(res.success).toBe(true);
      expect(res.verificationToken).toBeDefined();
      expect(res.verificationToken).not.toBe("old_token");
      expect(mockTicket.verificationTokenRevoked).toBe(false);
      expect(mockTicket.save).toHaveBeenCalled();
    });
  });
});
