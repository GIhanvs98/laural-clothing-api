import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);
router.post('/', authenticateJWT, requirePermission("categories:manage"), categoryController.createCategory);
router.put('/:id', authenticateJWT, requirePermission("categories:manage"), categoryController.updateCategory);
router.delete('/:id', authenticateJWT, requirePermission("categories:manage"), categoryController.deleteCategory);

export default router;
