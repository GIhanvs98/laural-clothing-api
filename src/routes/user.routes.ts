import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticateJWT, requirePermission } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateJWT, requirePermission("system:manage_users"), UserController.getAllUsers);
router.post("/", authenticateJWT, requirePermission("system:manage_users"), UserController.createUser);
router.put("/:id", authenticateJWT, requirePermission("system:manage_users"), UserController.updateUser);
router.delete("/:id", authenticateJWT, requirePermission("system:manage_users"), UserController.deleteUser);

export default router;
