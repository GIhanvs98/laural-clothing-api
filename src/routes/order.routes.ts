import { Router } from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus
} from "../controllers/order.controller";

const router = Router();

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.patch("/:id/status", updateOrderStatus);

export default router;
