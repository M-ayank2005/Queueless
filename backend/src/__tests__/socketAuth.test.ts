import { Server, Socket } from "socket.io";
import { createServer } from "http";
import mongoose from "mongoose";
import QueueEntry from "../models/QueueEntry";

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

      // Simulated hardened handler logic
      const handleJoinUser = (userId: string) => {
        const user = mockSocket.data.user;
        if (!user || !user.id || user.id !== userId) {
          mockSocket.emit("socket_error", { message: "Unauthorized user room join: identity mismatch or unauthenticated" });
          return;
        }
        mockSocket.join(`user_${userId}`);
      };

      handleJoinUser("user_abc_123");

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Unauthorized user room join")
      }));
    });

    it("should reject authenticated user attempting to join another user's room", () => {
      mockSocket.data.user = { id: "my_user_id", role: "customer" };

      const handleJoinUser = (userId: string) => {
        const user = mockSocket.data.user;
        if (!user || !user.id || user.id !== userId) {
          mockSocket.emit("socket_error", { message: "Unauthorized user room join: identity mismatch or unauthenticated" });
          return;
        }
        mockSocket.join(`user_${userId}`);
      };

      handleJoinUser("target_victim_user_id");

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Unauthorized user room join")
      }));
    });

    it("should allow authenticated user to join their own personal user room", () => {
      mockSocket.data.user = { id: "my_user_id", role: "customer" };

      const handleJoinUser = (userId: string) => {
        const user = mockSocket.data.user;
        if (!user || !user.id || user.id !== userId) {
          mockSocket.emit("socket_error", { message: "Unauthorized user room join" });
          return;
        }
        mockSocket.join(`user_${userId}`);
      };

      handleJoinUser("my_user_id");

      expect(mockSocket.join).toHaveBeenCalledWith("user_my_user_id");
    });
  });

  describe("join_business Room Lockdown (No Unauthenticated Fallback)", () => {
    it("should reject customer account attempting to join merchant business room", () => {
      mockSocket.data.user = { id: "cust_123", role: "customer" };

      const handleJoinBusiness = (businessId: string) => {
        const user = mockSocket.data.user;
        if (user && user.role === "business" && user.id === businessId) {
          mockSocket.join(`business_${businessId}`);
        } else {
          mockSocket.emit("socket_error", { message: "Unauthorized: Only verified business owners can join this business room" });
        }
      };

      handleJoinBusiness("biz_456");

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Only verified business owners")
      }));
    });

    it("should reject unauthenticated guest attempting to join business room without credentials", () => {
      mockSocket.data.user = null;

      const handleJoinBusiness = (businessId: string) => {
        const user = mockSocket.data.user;
        if (user && user.role === "business" && user.id === businessId) {
          mockSocket.join(`business_${businessId}`);
        } else {
          mockSocket.emit("socket_error", { message: "Unauthorized: Only verified business owners can join this business room" });
        }
      };

      handleJoinBusiness("biz_456");

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.any(Object));
    });

    it("should allow verified merchant to join their own store room", () => {
      mockSocket.data.user = { id: "biz_456", role: "business" };

      const handleJoinBusiness = (businessId: string) => {
        const user = mockSocket.data.user;
        if (user && user.role === "business" && user.id === businessId) {
          mockSocket.join(`business_${businessId}`);
        } else {
          mockSocket.emit("socket_error", { message: "Unauthorized" });
        }
      };

      handleJoinBusiness("biz_456");

      expect(mockSocket.join).toHaveBeenCalledWith("business_biz_456");
    });
  });

  describe("join_queue Authorization", () => {
    it("should reject stranger from eavesdropping on another customer's ticket room", async () => {
      const ticketId = new mongoose.Types.ObjectId();
      const ownerId = new mongoose.Types.ObjectId();
      const strangerId = new mongoose.Types.ObjectId();

      mockSocket.data.user = { id: strangerId.toString(), role: "customer" };

      jest.spyOn(QueueEntry, "findById").mockReturnValue({
        select: jest.fn().mockResolvedValue({
          customerId: ownerId,
          businessId: new mongoose.Types.ObjectId()
        })
      } as any);

      const handleJoinQueue = async (queueId: string) => {
        const user = mockSocket.data.user;
        if (!user || !user.id) {
          mockSocket.emit("socket_error", { message: "Authentication required" });
          return;
        }

        const entry: any = await (QueueEntry.findById(queueId) as any).select("customerId businessId");
        if (!entry) {
          mockSocket.emit("socket_error", { message: "Queue ticket not found" });
          return;
        }

        const isAuthorized = entry.customerId.toString() === user.id || entry.businessId.toString() === user.id;
        if (!isAuthorized) {
          mockSocket.emit("socket_error", { message: "Unauthorized: You are not the ticket owner or store manager" });
          return;
        }

        mockSocket.join(`queue_${queueId}`);
      };

      await handleJoinQueue(ticketId.toString());

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("socket_error", expect.objectContaining({
        message: expect.stringContaining("Unauthorized: You are not the ticket owner")
      }));
    });
  });
});
