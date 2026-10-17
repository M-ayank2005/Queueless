import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import {
  protect,
  requireRole,
  getJwtSecret,
  verifyJwtToken,
  socketAuthMiddleware
} from "../middleware/authMiddleware";

import mongoose from "mongoose";
import User from "../models/User";

const testApp = express();
testApp.use(express.json());

// Dummy endpoints to test middleware in isolation
testApp.get("/protected", protect, (req: any, res) => {
  res.json({ success: true, user: req.user });
});

testApp.get("/business-only", protect, requireRole("business"), (req: any, res) => {
  res.json({ success: true, message: "Welcome merchant" });
});

testApp.get("/customer-only", protect, requireRole("customer"), (req: any, res) => {
  res.json({ success: true, message: "Welcome customer" });
});

describe("Auth Middleware & Role Guards", () => {
  const validCustomerId = new mongoose.Types.ObjectId();
  const validBusinessId = new mongoose.Types.ObjectId();
  const initialReadyState = mongoose.connection.readyState;

  beforeEach(() => {
    (mongoose.connection as any).readyState = 1;
    jest.spyOn(User, "findById").mockImplementation((id: any) => {
      const idStr = id?.toString();
      if (idStr === validCustomerId.toString()) {
        return {
          select: jest.fn().mockResolvedValue({
            _id: validCustomerId,
            role: "customer",
            name: "Alice",
            email: "alice@example.com"
          })
        } as any;
      }
      if (idStr === validBusinessId.toString()) {
        return {
          select: jest.fn().mockResolvedValue({
            _id: validBusinessId,
            role: "business",
            name: "Merchant Store",
            email: "merchant@example.com"
          })
        } as any;
      }
      return {
        select: jest.fn().mockResolvedValue(null)
      } as any;
    });
  });

  afterAll(() => {
    (mongoose.connection as any).readyState = initialReadyState;
  });

  it("should return 401 when no token is provided", async () => {
    const res = await request(testApp).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("no Bearer token provided");
  });

  it("should return 401 when malformed token is provided", async () => {
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", "Bearer invalid-garbage-token");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("token verification failed");
  });

  it("should allow request with valid JWT token and active user account", async () => {
    const token = jwt.sign(
      { id: validCustomerId.toString(), role: "customer", name: "Alice" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("id", validCustomerId.toString());
  });

  it("should return 403 Forbidden when a customer tries to access business-only route", async () => {
    const customerToken = jwt.sign(
      { id: validCustomerId.toString(), role: "customer" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/business-only")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("requires 'business' role");
  });

  it("should allow business account to access business-only route", async () => {
    const businessToken = jwt.sign(
      { id: validBusinessId.toString(), role: "business" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/business-only")
      .set("Authorization", `Bearer ${businessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Welcome merchant");
  });

  it("should reject token with invalid user ID format with 401", async () => {
    const invalidIdToken = jwt.sign(
      { id: "invalid-string-id", role: "customer" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${invalidIdToken}`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("invalid account identifier");
  });

  it("should fail closed with 503 when database is disconnected (readyState !== 1)", async () => {
    (mongoose.connection as any).readyState = 0;

    const token = jwt.sign(
      { id: validCustomerId.toString(), role: "customer" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("authentication database unreachable");
  });

  it("should fail closed with 503 when database query throws an error", async () => {
    jest.spyOn(User, "findById").mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("Mongo connection drop"))
    } as any);

    const token = jwt.sign(
      { id: validCustomerId.toString(), role: "customer" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("failed to verify account");
  });

  it("should return 401 when account no longer exists in database", async () => {
    const deletedUserId = new mongoose.Types.ObjectId();
    const token = jwt.sign(
      { id: deletedUserId.toString(), role: "customer" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("user account no longer exists");
  });

  it("should return 401 when account role in database mismatches token claim", async () => {
    // Return user with role='business', but token has role='customer'
    jest.spyOn(User, "findById").mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: validCustomerId,
        role: "business",
        name: "Alice Changed"
      })
    } as any);

    const token = jwt.sign(
      { id: validCustomerId.toString(), role: "customer" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("account role mismatch");
  });
});

describe("getJwtSecret Configuration & Fail-Safe Checks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should throw in production when JWT_SECRET is unset", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;

    expect(() => getJwtSecret()).toThrow("FATAL: JWT_SECRET must be configured in production.");
  });

  it("should throw in production when JWT_SECRET is shorter than 32 characters", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "short-insecure-secret";

    expect(() => getJwtSecret()).toThrow("FATAL: JWT_SECRET must be at least 32 characters long in production.");
  });

  it("should succeed in production when JWT_SECRET is sufficiently strong", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "a-very-strong-production-secret-value-32chars!";

    expect(getJwtSecret()).toBe("a-very-strong-production-secret-value-32chars!");
  });

  it("should return consistent fallback secret in development when JWT_SECRET is unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;

    expect(getJwtSecret()).toBe("dev_queueless_jwt_secret_key_change_in_prod");
  });
});

describe("Unified HTTP and Socket.IO JWT Verification Parity", () => {
  const validSecret = getJwtSecret();
  const validId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    (mongoose.connection as any).readyState = 1;
    jest.spyOn(User, "findById").mockImplementation((id: any) => {
      if (id?.toString() === validId.toString()) {
        return {
          select: jest.fn().mockResolvedValue({
            _id: validId,
            role: "customer",
            name: "Alice",
            email: "alice@example.com"
          })
        } as any;
      }
      return {
        select: jest.fn().mockResolvedValue(null)
      } as any;
    });
  });

  it("should verify valid token consistently across HTTP and Socket.IO", async () => {
    const token = jwt.sign(
      { id: validId.toString(), role: "customer", name: "Alice" },
      validSecret,
      { expiresIn: "1h" }
    );

    // HTTP test
    const httpRes = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(httpRes.status).toBe(200);
    expect(httpRes.body.user.id).toBe(validId.toString());

    // Socket.IO test with actual socketAuthMiddleware
    const mockSocket: any = {
      handshake: { auth: { token } },
      data: {}
    };
    let nextCalled = false;
    socketAuthMiddleware(mockSocket, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(mockSocket.data.user).toBeDefined();
    expect(mockSocket.data.user.id).toBe(validId.toString());
    expect(mockSocket.data.user.role).toBe("customer");
  });

  it("should reject expired token consistently across HTTP and Socket.IO", async () => {
    const expiredToken = jwt.sign(
      { id: "cust_expired", role: "customer" },
      validSecret,
      { expiresIn: "-1s" }
    );

    // HTTP test
    const httpRes = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(httpRes.status).toBe(401);
    expect(httpRes.body.message).toContain("expired");

    // Socket.IO test
    const mockSocket: any = {
      handshake: { auth: { token: expiredToken } },
      data: {}
    };
    let nextCalled = false;
    socketAuthMiddleware(mockSocket, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(mockSocket.data.user).toBeNull();
  });

  it("should reject incorrectly signed token consistently across HTTP and Socket.IO", async () => {
    const wrongToken = jwt.sign(
      { id: "cust_wrong", role: "customer" },
      "completely_different_signing_secret_12345",
      { expiresIn: "1h" }
    );

    // HTTP test
    const httpRes = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${wrongToken}`);
    expect(httpRes.status).toBe(401);
    expect(httpRes.body.message).toContain("verification failed");

    // Socket.IO test
    const mockSocket: any = {
      handshake: { auth: { token: wrongToken } },
      data: {}
    };
    let nextCalled = false;
    socketAuthMiddleware(mockSocket, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(mockSocket.data.user).toBeNull();
  });

  it("should reject invalid role claims in token across Socket.IO", () => {
    const adminToken = jwt.sign(
      { id: "admin_user", role: "superadmin" },
      validSecret,
      { expiresIn: "1h" }
    );

    const mockSocket: any = {
      handshake: { auth: { token: adminToken } },
      data: {}
    };
    let nextCalled = false;
    socketAuthMiddleware(mockSocket, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(mockSocket.data.user).toBeNull();
  });
});
