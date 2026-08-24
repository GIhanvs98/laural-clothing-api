import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/slug/:slug', productController.getProductBySlug);
router.get('/sku/:sku', productController.getProductBySku);
router.post('/', authenticateJWT, requirePermission("products:create"), auditLog('Product', 'CREATE'), productController.createProduct);
router.put('/:id', authenticateJWT, requirePermission("products:edit"), auditLog('Product', 'UPDATE'), productController.updateProduct);
router.delete('/:id', authenticateJWT, requirePermission("products:delete"), auditLog('Product', 'DELETE'), productController.deleteProduct);

export default router;
