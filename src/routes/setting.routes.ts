import { Router } from "express";
import { SettingController } from "../controllers/setting.controller";
import { authenticateJWT, requireRole } from "../middlewares/auth.middleware";
import { auditLog } from "../middlewares/audit.middleware";

const router = Router();

// Public routes
router.get("/public", SettingController.getPublic);

// Protected routes (Admin / Super Admin)
router.get("/", authenticateJWT, requireRole("ADMIN", "SUPER_ADMIN"), SettingController.getAll);
router.post("/", authenticateJWT, requireRole("SUPER_ADMIN"), auditLog('Setting', 'CREATE'), SettingController.create);
router.put("/", authenticateJWT, requireRole("ADMIN", "SUPER_ADMIN"), auditLog('Setting', 'UPDATE'), SettingController.bulkUpdate);
router.delete("/:key", authenticateJWT, requireRole("SUPER_ADMIN"), auditLog('Setting', 'DELETE'), SettingController.delete);

export default router;
