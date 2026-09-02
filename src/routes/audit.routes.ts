import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, requirePermission("system:view_audit_logs"), getAuditLogs);

export default router;
