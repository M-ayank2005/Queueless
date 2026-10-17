import request from "supertest";
import app from "../app";
import { isStoreOpenNow } from "../controllers/queueController";

describe("Validation & Security Rules", () => {
  describe("Registration Input Validation", () => {
    it("should reject registration with missing name", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        phone: "+1234567890",
        password: "password123",
        role: "customer"
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Name must be at least 2 characters long");
    });

    it("should reject registration with invalid email format", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "not-an-email",
        phone: "+1234567890",
        password: "password123",
        role: "customer"
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("valid email address");
    });

    it("should reject registration with password shorter than 6 characters", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        phone: "+1234567890",
        password: "123",
        role: "customer"
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("at least 6 characters long");
    });

    it("should reject registration with invalid role", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        phone: "+1234567890",
        password: "password123",
        role: "admin"
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Role must be either 'customer' or 'business'");
    });

    it("should require businessName and address if role is business", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Merchant User",
        email: "merchant@example.com",
        phone: "+1234567890",
        password: "password123",
        role: "business"
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Business name is required");
    });
  });

  describe("Timezone-Aware Store Hours Check", () => {
    it("should report closed if current day is in closedDays", () => {
      // Create a fixed Sunday date (2026-10-18 is Sunday, day 0)
      const sundayDate = new Date("2026-10-18T12:00:00Z");
      const workingHours = {
        openTime: "09:00",
        closeTime: "18:00",
        closedDays: [0], // Sunday closed
        timezone: "UTC"
      };

      const result = isStoreOpenNow(workingHours, sundayDate);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("closed today");
    });

    it("should report open if within opening hours", () => {
      // 2026-10-16 is Friday (day 5), at 11:30 UTC
      const openTime = new Date("2026-10-16T11:30:00Z");
      const workingHours = {
        openTime: "09:00",
        closeTime: "18:00",
        closedDays: [0], // Only Sunday closed
        timezone: "UTC"
      };

      const result = isStoreOpenNow(workingHours, openTime);
      expect(result.isOpen).toBe(true);
    });

    it("should report closed if before opening time", () => {
      // 2026-10-16 at 07:00 UTC
      const earlyMorning = new Date("2026-10-16T07:00:00Z");
      const workingHours = {
        openTime: "09:00",
        closeTime: "18:00",
        closedDays: [],
        timezone: "UTC"
      };

      const result = isStoreOpenNow(workingHours, earlyMorning);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain("Shop is closed");
    });
  });

  describe("Unauthorized Protected Routes", () => {
    it("GET /api/business/queue should reject unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/business/queue");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("GET /api/queue/status/dummy-id should reject unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/queue/status/507f1f77bcf86cd799439011");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("CORS Preflight & Origin Whitelisting", () => {
    it("should allow OPTIONS preflight from production frontend origin", async () => {
      const res = await request(app)
        .options("/api/auth/login")
        .set("Origin", "https://queueless-gamma.vercel.app")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type,Authorization");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("https://queueless-gamma.vercel.app");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should allow OPTIONS preflight from preview Vercel branch deployments", async () => {
      const res = await request(app)
        .options("/api/auth/login")
        .set("Origin", "https://queueless-preview-branch.vercel.app")
        .set("Access-Control-Request-Method", "POST");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("https://queueless-preview-branch.vercel.app");
    });

    it("should allow local development origins", async () => {
      const res = await request(app)
        .options("/api/auth/login")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });

    it("should reject and not return Access-Control-Allow-Origin for unauthorized origins", async () => {
      const res = await request(app)
        .options("/api/auth/login")
        .set("Origin", "https://malicious-site.example.com")
        .set("Access-Control-Request-Method", "POST");

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });
});

