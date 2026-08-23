import { Request, Response, NextFunction } from "express";
import { RoleService } from "../services/role.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export class UserController {
  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = (req.query.search as string) || undefined;
      const role = (req.query.role as string) || undefined;
      const users = await RoleService.getAllUsers(search, role);
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, name, phone, branchId, status, roleIds } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: "Email is required." });
        return;
      }

      const user = await RoleService.createUser({
        email,
        password,
        name,
        phone,
        branchId,
        status,
        roleIds,
      });

      res.status(201).json({ success: true, data: user, message: "User created successfully." });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { name, email, phone, branchId, status, roleIds, password } = req.body;

      const users = await RoleService.updateUser(id, {
        name,
        email,
        phone,
        branchId,
        status,
        roleIds,
        password,
      });

      res.status(200).json({ success: true, data: users, message: "User updated successfully." });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await RoleService.deleteUser(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
