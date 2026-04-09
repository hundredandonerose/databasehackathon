import { Router } from "express";
import { getJudgeDashboard, submitJudgeScore } from "../controllers/judgeController.js";
import { requireAuth, requireJudge } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/judge/dashboard", requireAuth, requireJudge, getJudgeDashboard);
router.put("/judge/scores/:teamId", requireAuth, requireJudge, submitJudgeScore);

export default router;
