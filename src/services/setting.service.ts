import prisma from "../config/prisma";
import { AppError } from "../middlewares/errorHandler";

export interface SettingInput {
  key: string;
  value: string;
}

export class SettingService {
  /**
   * Get all settings (Admin)
   */
  static async getAllSettings() {
    return prisma.setting.findMany({
      orderBy: { group: 'asc' }
    });
  }

  /**
   * Get only public settings (Storefront)
   */
  static async getPublicSettings() {
    return prisma.setting.findMany({
      where: { isPublic: true },
      orderBy: { group: 'asc' }
    });
  }

  /**
   * Bulk update settings
   */
  static async bulkUpdateSettings(settings: SettingInput[]) {
    // We use a transaction to safely update all keys
    return prisma.$transaction(async (tx) => {
      const updatedSettings = [];
      for (const setting of settings) {
        // Find existing setting to preserve type/group if upserting
        const existing = await tx.setting.findUnique({ where: { key: setting.key } });
        
        const updated = await tx.setting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: {
            key: setting.key,
            value: setting.value,
            type: existing?.type || "string",
            group: existing?.group || "general",
            isPublic: existing?.isPublic ?? false
          },
        });
        updatedSettings.push(updated);
      }
      return updatedSettings;
    });
  }

  /**
   * Create a new custom setting
   */
  static async createSetting(data: { key: string; value: string; type: string; group: string; isPublic: boolean; description?: string }) {
    const existing = await prisma.setting.findUnique({ where: { key: data.key } });
    if (existing) {
      throw new AppError("Setting with this key already exists", 400);
    }
    return prisma.setting.create({
      data,
    });
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key: string) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      throw new AppError("Setting not found", 404);
    }
    return prisma.setting.delete({
      where: { key },
    });
  }

  /**
   * Seed default settings if they don't exist
   */
  static async seedDefaultSettings() {
    const defaults = [
      // General
      { key: "store_name", value: "Laural Clothing", type: "string", group: "general", isPublic: true },
      { key: "support_email", value: "support@laural.com", type: "string", group: "general", isPublic: true },
      { key: "support_phone", value: "+94 77 123 4567", type: "string", group: "general", isPublic: true },
      // Currency & Tax
      { key: "default_currency", value: "LKR", type: "string", group: "currency", isPublic: true },
      { key: "tax_rate", value: "15", type: "number", group: "currency", isPublic: false },
      // Shipping
      { key: "base_shipping_cost", value: "350", type: "number", group: "shipping", isPublic: true },
      // Payment Gateways
      { key: "enable_cod", value: "true", type: "boolean", group: "payment", isPublic: true },
      { key: "enable_card_payments", value: "true", type: "boolean", group: "payment", isPublic: true },
      // Notifications
      { key: "email_new_orders", value: "true", type: "boolean", group: "notifications", isPublic: false },
      { key: "email_low_stock", value: "false", type: "boolean", group: "notifications", isPublic: false },
    ];

    for (const def of defaults) {
      await prisma.setting.upsert({
        where: { key: def.key },
        update: {}, // Don't override if it already exists
        create: def,
      });
    }
  }
}
