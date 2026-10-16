import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { protect, requireRole, getJwtSecret } from "../middleware/authMiddleware";

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

  it("should allow request with valid JWT token", async () => {
    const token = jwt.sign({ id: "user123", role: "customer", name: "Alice" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await request(testApp)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("id", "user123");
  });

  it("should return 403 Forbidden when a customer tries to access business-only route", async () => {
    const customerToken = jwt.sign({ id: "cust1", role: "customer" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await request(testApp)
      .get("/business-only")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("requires 'business' role");
  });

  it("should allow business account to access business-only route", async () => {
    const businessToken = jwt.sign({ id: "biz1", role: "business" }, getJwtSecret(), { expiresIn: "1h" });
    const res = await request(testApp)
      .get("/business-only")
      .set("Authorization", `Bearer ${businessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Welcome merchant");
  });
});
