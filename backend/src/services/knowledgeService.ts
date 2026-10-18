import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

let cachedSystemPrompt: string | null = null;

/**
 * Resolves and loads the authoritative QueueLess support system prompt.
 * Inspects multiple candidate paths to ensure reliable operation across:
 * - Development (ts-node / nodemon from backend root or monorepo root)
 * - Production (compiled JS in dist/ directory)
 * - Containerized / serverless environments (Render, Docker, etc.)
 */
export const loadSupportSystemPrompt = (): string => {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const candidatePaths = [
    // Standard relative from src/services or dist/services
    path.resolve(__dirname, "../../knowledge/queueless-support-system-prompt.txt"),
    path.resolve(__dirname, "../knowledge/queueless-support-system-prompt.txt"),
    path.resolve(__dirname, "./knowledge/queueless-support-system-prompt.txt"),
    // Relative to execution working directory
    path.resolve(process.cwd(), "knowledge/queueless-support-system-prompt.txt"),
    path.resolve(process.cwd(), "backend/knowledge/queueless-support-system-prompt.txt"),
    path.resolve(process.cwd(), "dist/knowledge/queueless-support-system-prompt.txt"),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, "utf-8").trim();
        if (content.length > 0) {
          cachedSystemPrompt = content;
          logger.info(`[KnowledgeService] Successfully loaded QueueLess AI knowledge prompt from: ${candidate}`);
          return cachedSystemPrompt;
        }
      }
    } catch (err) {
      logger.debug(`[KnowledgeService] Candidate path ${candidate} could not be read:`, { error: err });
    }
  }

  const errorMessage = `FATAL: QueueLess support knowledge document 'queueless-support-system-prompt.txt' could not be located in any candidate paths: [${candidatePaths.join(", ")}]. Ensure the knowledge folder is present in backend deployment artifacts.`;
  logger.error(errorMessage);
  throw new Error(errorMessage);
};

export const getSupportSystemPrompt = (): string => {
  return loadSupportSystemPrompt();
};

/**
 * Resets cached prompt (used in test suites).
 */
export const _resetKnowledgeCacheForTesting = () => {
  cachedSystemPrompt = null;
};
