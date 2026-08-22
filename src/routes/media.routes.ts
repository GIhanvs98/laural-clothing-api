import { Router } from "express";
import { getMediaFiles, getPresignedUrl, createMediaRecord, deleteMediaFile } from "../controllers/media.controller";

const router = Router();

router.get("/", getMediaFiles);
router.post("/presigned-url", getPresignedUrl);
router.post("/", createMediaRecord);
router.delete("/:id", deleteMediaFile);

export default router;
