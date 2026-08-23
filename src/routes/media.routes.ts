import { Router } from "express";
import { getMediaFiles, getPresignedUrl, createMediaRecord, deleteMediaFile, viewMediaFile } from "../controllers/media.controller";
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get("/view", viewMediaFile); // Public, but redirects to short-lived signed URL

router.get("/", authenticateJWT, requirePermission("media:view_library"), getMediaFiles);
router.post("/presigned-url", authenticateJWT, requirePermission("media:upload"), getPresignedUrl);
router.post("/", authenticateJWT, requirePermission("media:upload"), createMediaRecord);
router.delete("/:id", authenticateJWT, requirePermission("media:delete"), deleteMediaFile);

export default router;
