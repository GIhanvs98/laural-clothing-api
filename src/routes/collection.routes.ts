import { Router } from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionProducts
} from '../controllers/collection.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

router.get('/', getCollections);
router.post('/', authenticateJWT, requirePermission("collections:manage"), auditLog('Collection', 'CREATE'), createCollection);
router.get('/:id', getCollectionById);
router.put('/:id', authenticateJWT, requirePermission("collections:manage"), auditLog('Collection', 'UPDATE'), updateCollection);
router.delete('/:id', authenticateJWT, requirePermission("collections:manage"), auditLog('Collection', 'DELETE'), deleteCollection);
router.get('/:slug/products', getCollectionProducts);

export default router;
