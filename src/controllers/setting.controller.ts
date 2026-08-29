import { Request, Response, NextFunction } from "express";
import { SettingService } from "../services/setting.service";
import { AppError } from "../middlewares/errorHandler";

export class SettingController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingService.getAllSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async getPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingService.getPublicSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async bulkUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { settings } = req.body;
      
      if (!settings || !Array.isArray(settings)) {
        res.status(400).json({ success: false, message: "Settings array is required" });
        return;
      }

      const updated = await SettingService.bulkUpdateSettings(settings);
      res.status(200).json({ success: true, data: updated, message: "Settings updated successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { key, value, type, group, isPublic, description } = req.body;
      if (!key || !value) {
        res.status(400).json({ success: false, message: "Key and value are required" });
        return;
      }
      
      const newSetting = await SettingService.createSetting({
        key,
        value,
        type: type || "string",
        group: group || "custom",
        isPublic: isPublic === undefined ? false : Boolean(isPublic),
        description
      });
      
      res.status(201).json({ success: true, data: newSetting, message: "Setting created successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      if (!key) {
        res.status(400).json({ success: false, message: "Key is required" });
        return;
      }

      await SettingService.deleteSetting(key as string);
      res.status(200).json({ success: true, message: "Setting deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
