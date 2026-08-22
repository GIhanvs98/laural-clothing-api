import { Request, Response } from "express";
import { mediaService } from "../services/media.service";

export const getMediaFiles = async (req: Request, res: Response) => {
  try {
    const { folder } = req.query;
    const media = await mediaService.getMediaFiles(folder as string);
    res.json(media);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getPresignedUrl = async (req: Request, res: Response) => {
  try {
    const { filename, contentType, folder } = req.body;
    if (!filename || !contentType) {
      return res.status(400).json({ error: "Filename and contentType are required" });
    }

    const data = await mediaService.generatePresignedUrl(filename, contentType, folder);
    res.json(data);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const createMediaRecord = async (req: Request, res: Response) => {
  try {
    const record = await mediaService.createMediaRecord(req.body);
    res.status(201).json(record);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteMediaFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await mediaService.deleteMediaFile(id as string);
    res.status(204).send();
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
