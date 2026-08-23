import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { loginRateLimiter, registerRateLimiter } from "../middlewares/rateLimiter.middleware";
import { checkHoneypot } from "../middlewares/honeypot.middleware";

const router = Router();

router.post("/register", checkHoneypot, registerRateLimiter, AuthController.register);
router.post("/login", checkHoneypot, loginRateLimiter, AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", authenticateJWT, AuthController.logout);
router.get("/me", authenticateJWT, AuthController.getMe);

export default router;
