import { Router } from "express";
import { RoleController } from "../controllers/role.controller";
import { authenticateJWT, requirePermission } from "../middlewares/auth.middleware";

const router = Router();

// Seed default roles and permissions
router.post("/seed", RoleController.seedRoles);

// Permissions catalog
router.get("/permissions", authenticateJWT, RoleController.getAllPermissions);

// Roles CRUD
router.get("/", authenticateJWT, requirePermission("system:manage_roles"), RoleController.getAllRoles);
router.get("/:id", authenticateJWT, requirePermission("system:manage_roles"), RoleController.getRoleById);
router.post("/", authenticateJWT, requirePermission("system:manage_roles"), RoleController.createRole);
router.put("/:id", authenticateJWT, requirePermission("system:manage_roles"), RoleController.updateRole);
router.delete("/:id", authenticateJWT, requirePermission("system:manage_roles"), RoleController.deleteRole);

export default router;
