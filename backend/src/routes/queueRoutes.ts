import express from "express";
import { protect } from "../middleware/authMiddleware";
import { getStoreByQr, joinQueue, getMyQueueStatus, getMyQueues, getQueueHistory } from "../controllers/queueController";

const router = express.Router();

router.get("/store/:qrCode", getStoreByQr);
router.get("/my-queues", protect, getMyQueues);
router.get("/history", protect, getQueueHistory);
router.post("/join", protect, joinQueue);
router.get("/status/:id", getMyQueueStatus); // Use getMyQueueStatus for detailed info

export default router;
