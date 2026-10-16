import mongoose from "mongoose";
import QueueEntry from "../models/QueueEntry";
import User from "../models/User";
import {
  generateTicketShareTokenService,
  revokeTicketShareTokenService,
  getSharedTicketService
} from "../services/queueService";

describe("Secure Shareable Queue Tickets — Unit Tests", () => {
  const businessId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const strangerId = new mongoose.Types.ObjectId();
  let testTicket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    testTicket = {
      _id: new mongoose.Types.ObjectId(),
      businessId,
      customerId,
      customerName: "Alice Secret",
      date: new Date(),
      joinedAt: new Date(Date.now() - 10 * 60000),
      status: "waiting",
      selectedServices: [{ name: "VIP Service", durationMin: 20, cost: 50 }],
      totalEstimatedTime: 20,
      shareToken: undefined,
      shareTokenRevoked: false,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      })
    };
  });

  describe("Token Generation & Scoped Authorization", () => {
    it("should reject token generation from unauthorized stranger (403)", async () => {
      jest.spyOn(QueueEntry, "findById").mockResolvedValue(testTicket as any);

      await expect(
        generateTicketShareTokenService(testTicket._id.toString(), strangerId.toString())
      ).rejects.toMatchObject({
        status: 403,
        message: expect.stringContaining("not authorized")
      });
    });

    it("should generate a 48-char cryptographically unguessable hex token for ticket owner", async () => {
      jest.spyOn(QueueEntry, "findById").mockResolvedValue(testTicket as any);

      const result = await generateTicketShareTokenService(
        testTicket._id.toString(),
        customerId.toString()
      );

      expect(result.shareToken).toBeDefined();
      expect(result.shareToken).toHaveLength(48); // 24 bytes hex = 48 chars
      expect(result.shareUrl).toBe(`/shared/${result.shareToken}`);
      expect(testTicket.shareTokenRevoked).toBe(false);
      expect(testTicket.save).toHaveBeenCalled();
    });

    it("should reuse existing unrevoked token instead of creating duplicate tokens", async () => {
      testTicket.shareToken = "existing_valid_token_12345678901234567890123456789012";
      testTicket.shareTokenCreatedAt = new Date();
      jest.spyOn(QueueEntry, "findById").mockResolvedValue(testTicket as any);

      const result = await generateTicketShareTokenService(
        testTicket._id.toString(),
        businessId.toString()
      );

      expect(result.shareToken).toBe("existing_valid_token_12345678901234567890123456789012");
    });
  });

  describe("Token Revocation", () => {
    it("should reject revocation from unauthorized user (403)", async () => {
      jest.spyOn(QueueEntry, "findById").mockResolvedValue(testTicket as any);

      await expect(
        revokeTicketShareTokenService(testTicket._id.toString(), strangerId.toString())
      ).rejects.toMatchObject({
        status: 403
      });
    });

    it("should mark token as revoked, clear shareToken, and notify socket room", async () => {
      testTicket.shareToken = "active_token_to_revoke_123";
      jest.spyOn(QueueEntry, "findById").mockResolvedValue(testTicket as any);

      const mockIo = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      } as any;

      const result = await revokeTicketShareTokenService(
        testTicket._id.toString(),
        customerId.toString(),
        mockIo
      );

      expect(result.success).toBe(true);
      expect(testTicket.shareTokenRevoked).toBe(true);
      expect(testTicket.shareToken).toBeUndefined();
      expect(testTicket.save).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith("shared_ticket_active_token_to_revoke_123");
      expect(mockIo.emit).toHaveBeenCalledWith("ticket_share_revoked", expect.any(Object));
    });
  });

  describe("Public Guest Lookup & PII Redaction", () => {
    it("should throw 404 for invalid, empty, or revoked token", async () => {
      jest.spyOn(QueueEntry, "findOne").mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      } as any);

      await expect(getSharedTicketService("nonexistent_or_revoked")).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining("invalid, expired, or has been revoked")
      });
    });

    it("should return sanitized data without leaking ANY customer PII", async () => {
      testTicket.shareToken = "public_share_token_abcdef123456";
      testTicket.businessId = {
        _id: businessId,
        businessProfile: {
          shopName: "Urban Barber Lounge",
          address: "123 High Street"
        }
      };

      (jest.spyOn(QueueEntry, "findOne") as any).mockImplementation((query: any) => {
        if (query?.$or || query?.shareToken || query?.shareTokenHash) {
          return {
            populate: jest.fn().mockResolvedValue(testTicket)
          };
        }
        return Promise.resolve(null);
      });

      // Mock wait estimate dependencies
      (jest.spyOn(QueueEntry, "find") as any).mockImplementation((filter: any) => {
        if (filter?.status === "completed") {
          return {
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue([])
          } as any;
        }
        return {
          sort: jest.fn().mockResolvedValue([])
        } as any;
      });
      jest.spyOn(QueueEntry, "countDocuments").mockResolvedValue(2 as any);

      const result = await getSharedTicketService("public_share_token_abcdef123456");

      // Verify safe public fields are present
      expect(result.ticketNumber).toBe(testTicket._id.toString().slice(-4).toUpperCase());
      expect(result.status).toBe("waiting");
      expect(result.shopName).toBe("Urban Barber Lounge");
      expect(result.shopAddress).toBe("123 High Street");
      expect(result.selectedServices).toEqual([
        { name: "VIP Service", durationMin: 20, cost: 50 }
      ]);
      expect(result.currentEstimatedWait).toBeDefined();

      // STRICT PII PROTECTION: Ensure customer name, email, phone, customerId are NEVER leaked
      expect((result as any).customerId).toBeUndefined();
      expect((result as any).customerName).toBeUndefined();
      expect((result as any).email).toBeUndefined();
      expect((result as any).phone).toBeUndefined();
      expect((result as any).userId).toBeUndefined();
    });

    it("should throw 410 when share token has expired", async () => {
      testTicket.shareToken = "expired_share_token_123456";
      testTicket.shareTokenExpiresAt = new Date(Date.now() - 3600000); // 1 hour ago
      testTicket.businessId = {
        _id: businessId,
        businessProfile: { shopName: "Urban Barber Lounge" }
      };

      (jest.spyOn(QueueEntry, "findOne") as any).mockReturnValue({
        populate: jest.fn().mockResolvedValue(testTicket)
      } as any);

      await expect(getSharedTicketService("expired_share_token_123456")).rejects.toMatchObject({
        status: 410,
        message: expect.stringContaining("expired")
      });
    });
  });
});
