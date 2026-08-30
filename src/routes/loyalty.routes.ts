import express from "express";
import { getLoyaltyMembers, getLoyaltyKpis } from "../controllers/loyalty.controller";

const router = express.Router();

router.get("/members", getLoyaltyMembers);
router.get("/kpis", getLoyaltyKpis);

export default router;
