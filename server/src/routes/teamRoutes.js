import { Router } from "express";
import {
  getMyTeam,
  listCases,
  listCheckpoints,
  submitCheckpoint,
  upsertTeam,
} from "../controllers/teamController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/cases", requireAuth, listCases);
router.get("/checkpoints", requireAuth, listCheckpoints);
router.get("/my-team", requireAuth, getMyTeam);
router.post("/my-team", requireAuth, upsertTeam);
router.put("/checkpoints/:code", requireAuth, submitCheckpoint);

export default router;
