import { Request, Response, NextFunction } from "express";
import { RoleService } from "../services/role.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export class RoleController {
  static async getAllRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await RoleService.getAllRoles();
      res.status(200).json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  static async getRoleById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const role = await RoleService.getRoleById(id);
      res.status(200).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  static async createRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, status, permissionCodes } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: "Role name is required." });
        return;
      }

      const role = await RoleService.createRole({
        name,
        description,
        status,
        permissionCodes,
      });

      res.status(201).json({ success: true, data: role, message: "Role created successfully." });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { name, description, status, permissionCodes } = req.body;

      const role = await RoleService.updateRole(id, {
        name,
        description,
        status,
        permissionCodes,
      });

      res.status(200).json({ success: true, data: role, message: "Role updated successfully." });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await RoleService.deleteRole(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getAllPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const perms = await RoleService.getAllPermissions();
      res.status(200).json({ success: true, data: perms });
    } catch (error) {
      next(error);
    }
  }

  static async seedRoles(req: Request, res: Response, next: NextFunction) {
    try {
      await RoleService.seedDefaultRolesAndPermissions();
      res.status(200).json({ success: true, message: "Roles and permissions seeded successfully." });
    } catch (error) {
      next(error);
    }
  }
}
