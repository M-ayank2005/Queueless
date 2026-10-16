import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import { setServerDraining } from "../controllers/healthController";

describe("Health & Operational Telemetry Endpoints", () => {
  beforeEach(() => {
    setServerDraining(false);
  });

  afterAll(() => {
    setServerDraining(false);
  });

  it("GET / should return 200 with service name", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("QueueLess Backend is running");
  });

  it("GET /health should return 200 with backward-compatible telemetry summary", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("live", true);
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("database");
    expect(res.body).toHaveProperty("uptime");
  });

  it("GET /health/live should return 200 with liveness status and uptime", async () => {
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      status: "alive",
      uptime: expect.any(Number),
      timestamp: expect.any(String),
    }));
  });

  it("GET /health/ready should report 503 when server is marked draining", async () => {
    setServerDraining(true);
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual(expect.objectContaining({
      status: "not_ready",
      draining: true,
    }));
  });

  it("GET /health/ready should report status based on database connection state", async () => {
    setServerDraining(false);
    const res = await request(app).get("/health/ready");
    // If DB is disconnected during unit tests, 503 is expected; if connected, 200 is expected.
    if (mongoose.connection.readyState === 1) {
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.draining).toBe(false);
      expect(res.body.database.status).toBe("connected");
      expect(res.body.memory).toHaveProperty("heapUsedMb");
      expect(res.body.memory).toHaveProperty("rssMb");
    } else {
      expect(res.status).toBe(503);
      expect(res.body.status).toBe("not_ready");
      expect(res.body.database.readyState).not.toBe(1);
    }
  });

  it("GET /nonexistent-route should return 404 with structured JSON and requestId", async () => {
    const res = await request(app).get("/api/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("requestId");
  });
});

describe("Security Headers & Request Correlation Tracing", () => {
  it("should preserve client-supplied X-Request-Id header", async () => {
    const customTrace = "trace-client-abc-12345";
    const res = await request(app)
      .get("/health/live")
      .set("X-Request-Id", customTrace);

    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBe(customTrace);
  });

  it("should automatically generate an X-Request-Id header when none is provided", async () => {
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.headers["x-request-id"]).toMatch(/^req_\d+_[a-f0-9]+/);
  });

  it("should inject standard production security headers and disable X-Powered-By", async () => {
    const res = await request(app).get("/health/live");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-xss-protection"]).toBe("1; mode=block");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
