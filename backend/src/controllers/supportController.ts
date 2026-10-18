import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { buildPersonalSupportContext } from "../services/supportContextService";
import {
  executeSupportChat,
  getSupportContactEmail,
  isSupportAiEnabled
} from "../services/geminiSupportService";
import { CURRENT_LEGAL_VERSIONS } from "../models/User";

const sendValidationError = (res: Response, req: AuthRequest, field: string, message: string) => {
  return res.status(400).json({
    success: false,
    message,
    error: {
      code: "VALIDATION_ERROR",
      message,
      details: [{ field, message }],
      requestId: req.requestId
    },
    requestId: req.requestId
  });
};

/**
 * Public metadata endpoint for Help & Support and legal document versions.
 */
export const getSupportMeta = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({
      success: true,
      aiSupportEnabled: isSupportAiEnabled(),
      contactEmail: getSupportContactEmail(),
      legalVersions: CURRENT_LEGAL_VERSIONS,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Authenticated & User-Isolated Support Chat Endpoint
 * POST /api/support/chat
 */
export const handleSupportChat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access personalized support",
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access personalized support",
          details: [],
          requestId: req.requestId
        },
        requestId: req.requestId
      });
    }

    const { message, history, ticketId } = req.body;

    // 1. Validate user message
    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return sendValidationError(res, req, "message", "Support inquiry message must be at least 2 characters long");
    }

    if (message.trim().length > 1000) {
      return sendValidationError(res, req, "message", "Message exceeds the maximum limit of 1000 characters");
    }

    // 2. Validate history structure if provided
    let cleanHistory: any[] = [];
    if (history !== undefined) {
      if (!Array.isArray(history)) {
        return sendValidationError(res, req, "history", "Conversation history must be an array");
      }
      if (history.length > 20) {
        return sendValidationError(res, req, "history", "Conversation history exceeds maximum allowed limit");
      }

      cleanHistory = history
        .filter((h) => h && typeof h === "object" && typeof h.content === "string")
        .map((h) => ({
          role: h.role === "assistant" || h.role === "model" ? "model" : "user",
          content: String(h.content).slice(0, 1000)
        }));
    }

    // 3. Validate ticketId if provided (must not be an arbitrary object / injection)
    let sanitizedTicketId: string | undefined;
    if (ticketId) {
      if (typeof ticketId !== "string" || !/^[0-9a-fA-F]{24}$/.test(ticketId)) {
        return sendValidationError(res, req, "ticketId", "Invalid ticket identifier format");
      }
      sanitizedTicketId = ticketId;
    }

    // 4. Construct restricted personal context with strict server-side authorization
    const personalContext = await buildPersonalSupportContext(
      req.user.id,
      req.user.role,
      sanitizedTicketId
    );

    // 5. Execute chat with Gemini provider or fallback
    const result = await executeSupportChat({
      message: message.trim(),
      history: cleanHistory,
      context: personalContext,
      requestId: req.requestId
    });

    return res.json({
      success: true,
      reply: result.reply,
      provider: result.provider,
      escalation: {
        email: result.suggestedEscalationEmail
      },
      contextSummary: {
        role: req.user.role,
        hasActiveTickets: (personalContext.customerTickets?.length || 0) > 0,
        referencedTicket: personalContext.specificTicket ? personalContext.specificTicket.ticketRef : null
      },
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
};
