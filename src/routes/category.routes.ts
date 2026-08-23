import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);
router.post('/', authenticateJWT, requirePermission("categories:manage"), auditLog('Category', 'CREATE'), categoryController.createCategory);
router.put('/:id', authenticateJWT, requirePermission("categories:manage"), auditLog('Category', 'UPDATE'), categoryController.updateCategory);
router.delete('/:id', authenticateJWT, requirePermission("categories:manage"), auditLog('Category', 'DELETE'), categoryController.deleteCategory);

export default router;
