import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import app from "../app";
import { AppError, ValidationError, NotFoundError, ForbiddenError } from "../utils/errors";
import { errorHandler, notFoundHandler } from "../middleware/errorHandler";
import { requestIdMiddleware } from "../middleware/requestId";

describe("Centralized Backend Error Architecture & Formatting", () => {
  describe("Express App Error Handling", () => {
    it("should return structured 404 for unknown route with ROUTE_NOT_FOUND code and requestId", async () => {
      const res = await request(app).get("/api/non-existent-endpoint-12345");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Route not found");
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
      expect(res.body.requestId).toBeDefined();
      expect(res.body.error.requestId).toBe(res.body.requestId);
    });

    it("should return 400 MALFORMED_REQUEST_BODY when malformed JSON is posted", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{ broken json syntax: invalid, ");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("MALFORMED_REQUEST_BODY");
      expect(res.body.message).toContain("Malformed JSON");
      expect(res.body.requestId).toBeDefined();
    });

    it("should return 400 VALIDATION_ERROR with field details on registration with missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "invalid-email",
          phone: "123",
          password: "short"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toBeInstanceOf(Array);
      expect(res.body.error.details.length).toBeGreaterThan(0);
      expect(res.body.requestId).toBeDefined();
    });

    it("should return 401 UNAUTHORIZED when accessing protected queue without token", async () => {
      const res = await request(app).get("/api/queue/my-queues");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.requestId).toBeDefined();
    });
  });

  describe("Unit Tests for Error Handler & Custom AppErrors", () => {
    let mockApp: express.Application;

    beforeAll(() => {
      mockApp = express();
      mockApp.use(requestIdMiddleware);
      mockApp.use(express.json());

      mockApp.get("/test/custom-validation", (req, res, next) => {
        next(new ValidationError("Field validation failed", [
          { field: "email", message: "Email format is invalid" },
          { field: "password", message: "Password is too weak" }
        ]));
      });

      mockApp.get("/test/not-found", (req, res, next) => {
        next(new NotFoundError("Ticket with specified ID was not found"));
      });

      mockApp.get("/test/forbidden", (req, res, next) => {
        next(new ForbiddenError("Merchant portal is only accessible to verified business accounts"));
      });

      mockApp.get("/test/mongoose-cast-error", (req, res, next) => {
        const castErr: any = new Error("Cast to ObjectId failed");
        castErr.name = "CastError";
        castErr.path = "ticketId";
        castErr.value = "invalid_id_format";
        castErr.kind = "ObjectId";
        next(castErr);
      });

      mockApp.get("/test/mongo-duplicate-key", (req, res, next) => {
        const dupErr: any = new Error("E11000 duplicate key error");
        dupErr.code = 11000;
        dupErr.keyValue = { email: "user@example.com" };
        next(dupErr);
      });

      mockApp.get("/test/jwt-expired", (req, res, next) => {
        const jwtErr: any = new Error("jwt expired");
        jwtErr.name = "TokenExpiredError";
        next(jwtErr);
      });

      mockApp.get("/test/unexpected-crash", (req, res, next) => {
        // Simulates unhandled database connection crash with internal details
        const crashErr = new Error("FATAL MongoServerError: Authentication failed on mongodb://admin:secretPass@internal-db:27017");
        next(crashErr);
      });

      mockApp.use(notFoundHandler);
      mockApp.use(errorHandler);
    });

    it("should correctly serialize ValidationError with status 400 and details", async () => {
      const res = await request(mockApp).get("/test/custom-validation");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toHaveLength(2);
      expect(res.body.error.details[0].field).toBe("email");
      expect(res.body.requestId).toBeDefined();
    });

    it("should correctly serialize NotFoundError with status 404", async () => {
      const res = await request(mockApp).get("/test/not-found");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
      expect(res.body.error.message).toContain("Ticket with specified ID was not found");
    });

    it("should correctly serialize ForbiddenError with status 403", async () => {
      const res = await request(mockApp).get("/test/forbidden");
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toContain("Merchant portal is only accessible");
    });

    it("should map Mongoose CastError to 400 INVALID_IDENTIFIER", async () => {
      const res = await request(mockApp).get("/test/mongoose-cast-error");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_IDENTIFIER");
      expect(res.body.error.details[0].field).toBe("ticketId");
      expect(res.body.error.message).toContain("Invalid format for resource identifier");
    });

    it("should map Mongo 11000 duplicate key to 409 DUPLICATE_KEY_CONFLICT", async () => {
      const res = await request(mockApp).get("/test/mongo-duplicate-key");
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("DUPLICATE_KEY_CONFLICT");
      expect(res.body.error.details[0].field).toBe("email");
      expect(res.body.message).toContain("already exists");
    });

    it("should map TokenExpiredError to 401 TOKEN_EXPIRED", async () => {
      const res = await request(mockApp).get("/test/jwt-expired");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("TOKEN_EXPIRED");
      expect(res.body.message).toContain("expired");
    });

    it("should NEVER leak internal credentials, stack traces, or queries on unexpected 500 crashes", async () => {
      const res = await request(mockApp).get("/test/unexpected-crash");
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(res.body.message).toBe("An unexpected internal server error occurred");
      expect(res.body.error.message).toBe("An unexpected internal server error occurred");

      // Verify no sensitive tokens or hostnames leaked
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain("secretPass");
      expect(bodyStr).not.toContain("internal-db");
      expect(bodyStr).not.toContain("stack");
      expect(res.body.requestId).toBeDefined();
    });
  });
});
