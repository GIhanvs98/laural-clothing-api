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
}
