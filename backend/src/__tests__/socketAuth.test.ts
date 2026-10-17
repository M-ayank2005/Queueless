import mongoose from "mongoose";
import QueueEntry from "../models/QueueEntry";
import { registerSocketHandlers } from "../index";

describe("Socket.IO Room Authorization & Security", () => {
  let mockSocket: any;
  let eventHandlers: Record<string, Function>;

  beforeEach(() => {
    eventHandlers = {};
    mockSocket = {
      id: "test_socket_id",
      data: { user: null },
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn().mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      })
    };
  });

  describe("join_user Room Lockdown", () => {
    it("should reject unauthenticated socket attempting to join user room", () => {
      mockSocket.data.user = null;
      registerSocketHandlers(mockSocket);

      eventHandlers["join_user"]("user_abc_123");

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Unauthorized user room join")
      }));
    });

    it("should reject authenticated user attempting to join another user's room", () => {
      mockSocket.data.user = { id: "my_user_id", role: "customer" };
      registerSocketHandlers(mockSocket);

      eventHandlers["join_user"]("target_victim_user_id");

      expect(mockSocket.join).not.toHaveBeenCalledWith("user_target_victim_user_id");
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Unauthorized user room join")
      }));
    });

    it("should allow authenticated user to join their own personal user room", () => {
      mockSocket.data.user = { id: "my_user_id", role: "customer" };
      registerSocketHandlers(mockSocket);

      eventHandlers["join_user"]("my_user_id");

      expect(mockSocket.join).toHaveBeenCalledWith("user_my_user_id");
    });
  });

  describe("join_business Room Lockdown (No Unauthenticated Fallback)", () => {
    it("should reject customer account attempting to join merchant business room", () => {
      mockSocket.data.user = { id: "cust_123", role: "customer" };
      registerSocketHandlers(mockSocket);

      eventHandlers["join_business"]("biz_456");

      expect(mockSocket.join).not.toHaveBeenCalledWith("business_biz_456");
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Only verified business owners")
      }));
    });

    it("should reject unauthenticated guest attempting to join business room without credentials", () => {
      mockSocket.data.user = null;
      registerSocketHandlers(mockSocket);

      eventHandlers["join_business"]("biz_456");

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Only verified business owners")
      }));
    });

    it("should allow verified merchant to join their own store room", () => {
      mockSocket.data.user = { id: "biz_456", role: "business" };
      registerSocketHandlers(mockSocket);

      eventHandlers["join_business"]("biz_456");

      expect(mockSocket.join).toHaveBeenCalledWith("business_biz_456");
    });
  });

  describe("join_queue Authorization", () => {
    it("should reject stranger from eavesdropping on another customer's ticket room", async () => {
      const ticketId = new mongoose.Types.ObjectId();
      const ownerId = new mongoose.Types.ObjectId();
      const strangerId = new mongoose.Types.ObjectId();

      mockSocket.data.user = { id: strangerId.toString(), role: "customer" };
      registerSocketHandlers(mockSocket);

      jest.spyOn(QueueEntry, "findById").mockReturnValue({
        select: jest.fn().mockResolvedValue({
          customerId: ownerId,
          businessId: new mongoose.Types.ObjectId()
        })
      } as any);

      await eventHandlers["join_queue"](ticketId.toString());

      expect(mockSocket.join).not.toHaveBeenCalledWith(`queue_${ticketId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Unauthorized: You are not the ticket owner")
      }));
    });

    it("should allow ticket owner to join ticket room", async () => {
      const ticketId = new mongoose.Types.ObjectId();
      const ownerId = new mongoose.Types.ObjectId();

      mockSocket.data.user = { id: ownerId.toString(), role: "customer" };
      registerSocketHandlers(mockSocket);

      jest.spyOn(QueueEntry, "findById").mockReturnValue({
        select: jest.fn().mockResolvedValue({
          customerId: ownerId,
          businessId: new mongoose.Types.ObjectId()
        })
      } as any);

      await eventHandlers["join_queue"](ticketId.toString());

      expect(mockSocket.join).toHaveBeenCalledWith(`queue_${ticketId}`);
    });
  });

  describe("join_shared_ticket Authorization", () => {
    it("should reject joining shared ticket room when token is missing or empty", async () => {
      mockSocket.data.user = null;
      registerSocketHandlers(mockSocket);

      await eventHandlers["join_shared_ticket"]("");

      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: "Valid share token is required"
      }));
    });

    it("should reject joining shared ticket room when token does not exist or was revoked", async () => {
      registerSocketHandlers(mockSocket);

      jest.spyOn(QueueEntry, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      } as any);

      await eventHandlers["join_shared_ticket"]("nonexistent_or_revoked_token");

      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("not found or link has been revoked")
      }));
    });

    it("should reject joining shared ticket room when token has expired", async () => {
      registerSocketHandlers(mockSocket);

      jest.spyOn(QueueEntry, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          shareTokenExpiresAt: new Date(Date.now() - 60000)
        })
      } as any);

      await eventHandlers["join_shared_ticket"]("expired_token_123");

      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("link has expired")
      }));
    });

    it("should allow guest to join shared ticket room with valid active token", async () => {
      registerSocketHandlers(mockSocket);
      const crypto = require("crypto");
      const cleanToken = "active_valid_share_token_hex_1234";
      const hash = crypto.createHash("sha256").update(cleanToken).digest("hex");

      jest.spyOn(QueueEntry, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          shareTokenHash: hash,
          shareTokenExpiresAt: new Date(Date.now() + 3600000)
        })
      } as any);

      await eventHandlers["join_shared_ticket"](cleanToken);

      expect(mockSocket.join).toHaveBeenCalledWith(`shared_ticket_${hash}`);
    });
  });
});
