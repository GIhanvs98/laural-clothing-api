import { Router } from "express";
import { SettingController } from "../controllers/setting.controller";
import { authenticateJWT, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.get("/public", SettingController.getPublic);

// Protected routes (Admin / Super Admin)
router.get("/", authenticateJWT, requireRole("ADMIN", "SUPER_ADMIN"), SettingController.getAll);
router.put("/", authenticateJWT, requireRole("ADMIN", "SUPER_ADMIN"), SettingController.bulkUpdate);

export default router;
