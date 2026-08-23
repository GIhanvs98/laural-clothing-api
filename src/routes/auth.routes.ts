import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { loginRateLimiter, registerRateLimiter } from "../middlewares/rateLimiter.middleware";
import { checkHoneypot } from "../middlewares/honeypot.middleware";
import { verifyTurnstile } from "../middlewares/turnstile.middleware";

const router = Router();

router.post("/register", checkHoneypot, verifyTurnstile, registerRateLimiter, AuthController.register);
router.post("/login", checkHoneypot, verifyTurnstile, loginRateLimiter, AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", authenticateJWT, AuthController.logout);
router.get("/me", authenticateJWT, AuthController.getMe);

export default router;
