import { Router } from "express";
import { getLiveness, getReadiness, getHealthSummary } from "../controllers/healthController";

const router = Router();

router.get("/live", getLiveness);
router.get("/ready", getReadiness);
router.get("/", getHealthSummary);

export default router;
