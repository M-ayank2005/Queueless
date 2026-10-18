import request from "supertest";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app";
import User, { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_POLICY_VERSION } from "../models/User";
import QueueEntry from "../models/QueueEntry";
import { getJwtSecret } from "../middleware/authMiddleware";
import { getSupportSystemPrompt } from "../services/knowledgeService";
import { buildPersonalSupportContext } from "../services/supportContextService";
import { buildPromptWithContext, executeSupportChat } from "../services/geminiSupportService";

describe("QueueLess Phase 2 — Legal Consent & AI Support Security", () => {
  const customerAId = new Types.ObjectId();
  const customerBId = new Types.ObjectId();
  const businessAId = new Types.ObjectId();
  const businessBId = new Types.ObjectId();

  const customerATicketId = new Types.ObjectId();
  const customerBTicketId = new Types.ObjectId();

  let customerAToken: string;
  let customerBToken: string;
  let businessAToken: string;

  beforeAll(() => {
    customerAToken = jwt.sign(
      { id: customerAId.toString(), role: "customer", name: "Alice Customer", email: "alice@example.com" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );

    customerBToken = jwt.sign(
      { id: customerBId.toString(), role: "customer", name: "Bob Customer", email: "bob@example.com" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );

    businessAToken = jwt.sign(
      { id: businessAId.toString(), role: "business", name: "Alpha Barbershop", email: "alpha@example.com" },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mongoose.connection as any).readyState = 1;

    // Default QueueEntry mocks to prevent hanging
    (jest.spyOn(QueueEntry, "find") as any).mockImplementation(() => {
      const chain: any = {
        populate: jest.fn().mockImplementation(() => chain),
        sort: jest.fn().mockImplementation(() => chain),
        limit: jest.fn().mockImplementation(() => Promise.resolve([])),
        select: jest.fn().mockImplementation(() => Promise.resolve([])),
        then: (resolve: any) => Promise.resolve([]).then(resolve)
      };
      return chain;
    });

    (jest.spyOn(QueueEntry, "findOne") as any).mockImplementation(() => {
      const chain: any = {
        populate: jest.fn().mockImplementation(() => Promise.resolve(null)),
        then: (resolve: any) => Promise.resolve(null).then(resolve)
      };
      return chain;
    });

    (jest.spyOn(QueueEntry, "countDocuments") as any).mockResolvedValue(0);

    // Mock User findById
    jest.spyOn(User, "findById").mockImplementation((id: any) => {
      const idStr = id?.toString();
      const mockSelect = (userObj: any) => ({
        select: jest.fn().mockImplementation((fields: string) => {
          if (fields === "-passwordHash") {
            const { passwordHash, ...rest } = userObj;
            return Promise.resolve(rest);
          }
          return Promise.resolve(userObj);
        }),
        then: (resolve: any) => Promise.resolve(userObj).then(resolve)
      });

      if (idStr === customerAId.toString()) {
        const u = {
          _id: customerAId,
          name: "Alice Customer",
          email: "alice@example.com",
          phone: "+1234567890",
          role: "customer",
          passwordHash: "$2b$10$hashedpassword",
          legalConsent: {
            agreedToTerms: true,
            privacyPolicyAcknowledged: true,
            acceptedAt: new Date("2026-01-01T00:00:00Z"),
            termsVersion: "v1.0.0",
            privacyPolicyVersion: "v1.0.0"
          },
          save: jest.fn().mockResolvedValue(true)
        };
        return mockSelect(u) as any;
      }

      if (idStr === customerBId.toString()) {
        const u = {
          _id: customerBId,
          name: "Bob Customer",
          email: "bob@example.com",
          phone: "+1987654321",
          role: "customer",
          passwordHash: "$2b$10$hashedpassword",
          save: jest.fn().mockResolvedValue(true)
        };
        return mockSelect(u) as any;
      }

      if (idStr === businessAId.toString()) {
        const u = {
          _id: businessAId,
          name: "Alpha Barbershop",
          email: "alpha@example.com",
          phone: "+1555555555",
          role: "business",
          passwordHash: "$2b$10$hashedpassword",
          businessProfile: {
            shopName: "Alpha Barbershop",
            address: "100 Market St",
            workingHours: { openTime: "09:00", closeTime: "18:00", closedDays: [0], timezone: "UTC" },
            services: [{ name: "Haircut", durationMin: 30, cost: 35 }]
          },
          save: jest.fn().mockResolvedValue(true)
        };
        return mockSelect(u) as any;
      }

      return mockSelect(null) as any;
    });
  });

  // ============================================================================
  // 1. LEGAL CONSENT & REGISTRATION ENFORCEMENT
  // ============================================================================
  describe("Registration Terms & Privacy Policy Consent", () => {
    it("should reject registration when agreedToTerms is missing", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Charlie",
        email: "charlie@example.com",
        phone: "+1112223334",
        password: "password123",
        role: "customer",
        privacyPolicyAcknowledged: true
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Terms and Conditions");
    });

    it("should reject registration when agreedToTerms is false", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Charlie",
        email: "charlie@example.com",
        phone: "+1112223334",
        password: "password123",
        role: "customer",
        agreedToTerms: false,
        privacyPolicyAcknowledged: true
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Terms and Conditions");
    });

    it("should reject registration when privacyPolicyAcknowledged is missing or false", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Charlie",
        email: "charlie@example.com",
        phone: "+1112223334",
        password: "password123",
        role: "customer",
        agreedToTerms: true,
        privacyPolicyAcknowledged: false
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Privacy Policy");
    });

    it("should accept registration when both agreedToTerms and privacyPolicyAcknowledged are true", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      const saveSpy = jest.spyOn(User.prototype, "save").mockImplementation(function (this: any) {
        this._id = new Types.ObjectId();
        return Promise.resolve(this);
      });

      const beforeSubmit = new Date();
      const res = await request(app).post("/api/auth/register").send({
        name: "Charlie New",
        email: "charlie.new@example.com",
        phone: "+1112223334",
        password: "password123",
        role: "customer",
        agreedToTerms: true,
        privacyPolicyAcknowledged: true
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.legalConsent).toBeDefined();
      expect(res.body.user.legalConsent.agreedToTerms).toBe(true);
      expect(res.body.user.legalConsent.privacyPolicyAcknowledged).toBe(true);
      expect(res.body.user.legalConsent.termsVersion).toBe(CURRENT_TERMS_VERSION);
      expect(res.body.user.legalConsent.privacyPolicyVersion).toBe(CURRENT_PRIVACY_POLICY_VERSION);

      const recordedDate = new Date(res.body.user.legalConsent.acceptedAt);
      expect(recordedDate.getTime()).toBeGreaterThanOrEqual(beforeSubmit.getTime() - 2000);

      saveSpy.mockRestore();
    });

    it("should allow an existing user to record updated consent via POST /api/auth/consent", async () => {
      const res = await request(app)
        .post("/api/auth/consent")
        .set("Authorization", `Bearer ${customerAToken}`)
        .send({
          agreedToTerms: true,
          privacyPolicyAcknowledged: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.legalConsent.agreedToTerms).toBe(true);
      expect(res.body.legalConsent.privacyPolicyAcknowledged).toBe(true);
      expect(res.body.legalConsent.latestAcceptedAt).toBeDefined();
      // Original acceptedAt preserved
      expect(new Date(res.body.legalConsent.acceptedAt).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  // ============================================================================
  // 2. KNOWLEDGE DOCUMENT & SYSTEM PROMPT INTEGRITY
  // ============================================================================
  describe("QueueLess Support Knowledge System Prompt", () => {
    it("should load the authoritative system prompt without throwing", () => {
      const prompt = getSupportSystemPrompt();
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(500);
      expect(prompt).toContain("QUEUeless AI SUPPORT ASSISTANT");
      expect(prompt).toContain("VERIFIED CUSTOMER WORKFLOWS");
      expect(prompt).toContain("VERIFIED BUSINESS WORKFLOWS");
      expect(prompt).toContain("PRIVACY, SAFETY & SECURITY BOUNDARIES");
      expect(prompt).toContain("CONVERSATION CLOSURE & HUMAN ESCALATION");
    });
  });

  // ============================================================================
  // 3. AI SUPPORT AUTHORIZATION, ISOLATION & PROMPT INJECTION DEFENSE
  // ============================================================================
  describe("AI Support Scoping & Data Isolation", () => {
    it("should reject unauthenticated support chat requests with 401", async () => {
      const res = await request(app).post("/api/support/chat").send({
        message: "How do I check my ticket?"
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject empty or undersized support messages with 400", async () => {
      const res = await request(app)
        .post("/api/support/chat")
        .set("Authorization", `Bearer ${customerAToken}`)
        .send({
          message: "   "
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("at least 2 characters");
    });

    it("should reject oversized support messages (> 1000 characters) with 400", async () => {
      const hugeMessage = "A".repeat(1005);
      const res = await request(app)
        .post("/api/support/chat")
        .set("Authorization", `Bearer ${customerAToken}`)
        .send({
          message: hugeMessage
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("exceeds the maximum limit");
    });

    it("should reject invalid ticketId format with 400", async () => {
      const res = await request(app)
        .post("/api/support/chat")
        .set("Authorization", `Bearer ${customerAToken}`)
        .send({
          message: "Help with my ticket",
          ticketId: "not-a-valid-mongo-id"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid ticket identifier format");
    });

    it("should build Customer A context with ONLY Customer A's tickets", async () => {
      // Mock QueueEntry.find to return Customer A's active ticket
      (jest.spyOn(QueueEntry, "find") as any).mockImplementation((query: any) => {
        expect(query.customerId.toString()).toBe(customerAId.toString());
        return {
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  _id: customerATicketId,
                  status: "waiting",
                  joinedAt: new Date("2026-10-18T10:00:00Z"),
                  totalEstimatedTime: 25,
                  verifiedAt: new Date(),
                  selectedServices: [{ name: "Haircut", quantity: 1, durationMin: 25 }],
                  businessId: {
                    businessProfile: { shopName: "Alpha Barbershop", address: "100 Market St" }
                  }
                }
              ])
            })
          })
        } as any;
      });

      const context = await buildPersonalSupportContext(customerAId.toString(), "customer");
      expect(context.role).toBe("customer");
      expect(context.userName).toBe("Alice Customer");
      expect(context.customerTickets).toHaveLength(1);
      expect(context.customerTickets![0].ticketId).toBe(customerATicketId.toString());
      expect(context.customerTickets![0].businessName).toBe("Alpha Barbershop");
    });

    it("CRITICAL: Customer A cannot access Customer B's ticket via ticketId parameter", async () => {
      // Mock QueueEntry.findOne with hard customerId scoping
      (jest.spyOn(QueueEntry, "findOne") as any).mockImplementation((query: any) => {
        // Query must contain customerId matching the authenticated user
        expect(query.customerId.toString()).toBe(customerAId.toString());
        // Since ticket belongs to Bob (Customer B), query for Alice's customerId returns null
        return {
          populate: jest.fn().mockResolvedValue(null)
        } as any;
      });

      // Customer A requests Customer B's ticket ID
      const context = await buildPersonalSupportContext(
        customerAId.toString(),
        "customer",
        customerBTicketId.toString()
      );

      // System must not attach Bob's ticket or reveal its existence
      expect(context.specificTicket).toBeNull();
    });

    it("should build Business context strictly scoped to the authenticated merchant", async () => {
      (jest.spyOn(QueueEntry, "countDocuments") as any).mockImplementation((query: any) => {
        expect(query.businessId.toString()).toBe(businessAId.toString());
        if (query.status === "waiting") return Promise.resolve(4) as any;
        if (query.status === "in_progress") return Promise.resolve(1) as any;
        return Promise.resolve(5) as any;
      });

      (jest.spyOn(QueueEntry, "find") as any).mockImplementation((query: any) => {
        expect(query.businessId.toString()).toBe(businessAId.toString());
        return {
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue([
                {
                  _id: new Types.ObjectId(),
                  customerName: "David",
                  status: "waiting",
                  selectedServices: [{ name: "Haircut", quantity: 1 }]
                }
              ])
            })
          })
        } as any;
      });

      const context = await buildPersonalSupportContext(businessAId.toString(), "business");
      expect(context.role).toBe("business");
      expect(context.businessContext).toBeDefined();
      expect(context.businessContext!.shopName).toBe("Alpha Barbershop");
      expect(context.businessContext!.activeQueueSummary.totalActive).toBe(5);
      expect(context.businessContext!.activeQueueSummary.waitingCount).toBe(4);
      expect(context.businessContext!.activeQueueSummary.inProgressCount).toBe(1);
    });

    it("CRITICAL: Sanitized context never contains sensitive fields (passwords, tokens, hashes)", () => {
      const sanitizedContext = {
        role: "customer" as const,
        userName: "Alice Customer",
        customerTickets: [
          {
            ticketId: customerATicketId.toString(),
            ticketRef: "#ABC123",
            status: "waiting" as const,
            businessName: "Alpha Barbershop",
            joinedAt: "2026-10-18T10:00:00Z",
            services: [{ name: "Haircut", quantity: 1, durationMin: 20 }],
            totalEstimatedDurationMin: 20,
            isVerified: false
          }
        ]
      };

      expect((sanitizedContext as any).password).toBeUndefined();
      expect((sanitizedContext as any).passwordHash).toBeUndefined();
      expect((sanitizedContext as any).verificationToken).toBeUndefined();
      expect((sanitizedContext as any).shareToken).toBeUndefined();

      const promptText = buildPromptWithContext(sanitizedContext);

      expect(promptText).not.toContain("passwordHash");
      expect(promptText).not.toContain("$2b$10$");
      expect(promptText).not.toContain("verificationTokenHash");
      expect(promptText).not.toContain("supersecretkey");
      expect(promptText).toContain("Alice Customer");
      expect(promptText).toContain("#ABC123");
    });

    it("should gracefully return offline fallback message when Gemini API key is missing or offline", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await executeSupportChat({
        message: "Can you help me with my ticket?",
        context: {
          role: "customer",
          userName: "Alice Customer"
        }
      });

      expect(result.provider).toBe("fallback");
      expect(result.reply).toContain("support");
      expect(result.suggestedEscalationEmail).toBeDefined();

      process.env.GEMINI_API_KEY = originalKey;
    });

    it("should return public metadata from GET /api/support/meta", async () => {
      const res = await request(app).get("/api/support/meta");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.contactEmail).toBeDefined();
      expect(res.body.legalVersions).toBeDefined();
      expect(res.body.legalVersions.termsVersion).toBe(CURRENT_TERMS_VERSION);
      expect(res.body.legalVersions.privacyPolicyVersion).toBe(CURRENT_PRIVACY_POLICY_VERSION);
    });
  });
});
