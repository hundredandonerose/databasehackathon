import { Router } from "express";
import { getAdminOverview } from "../controllers/adminController.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/admin/overview", requireAuth, requireAdmin, getAdminOverview);

export default router;
