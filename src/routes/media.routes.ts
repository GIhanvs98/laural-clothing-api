import { Router } from "express";
import { getMediaFiles, getPresignedUrl, createMediaRecord, deleteMediaFile, viewMediaFile, syncS3 } from "../controllers/media.controller";
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.get("/view", viewMediaFile); // Public, but redirects to short-lived signed URL

router.post("/sync-s3", authenticateJWT, requirePermission("media:upload"), syncS3);
router.get("/", authenticateJWT, requirePermission("media:view_library"), getMediaFiles);
router.post("/presigned-url", authenticateJWT, requirePermission("media:upload"), getPresignedUrl);
router.post("/", authenticateJWT, requirePermission("media:upload"), auditLog('MediaFile', 'CREATE'), createMediaRecord);
router.delete("/:id", authenticateJWT, requirePermission("media:delete"), auditLog('MediaFile', 'DELETE'), deleteMediaFile);

export default router;
