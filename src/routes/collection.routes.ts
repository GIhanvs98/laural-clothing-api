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

const router = Router();

router.get('/', getCollections);
router.post('/', authenticateJWT, requirePermission("collections:manage"), createCollection);
router.get('/:id', getCollectionById);
router.put('/:id', authenticateJWT, requirePermission("collections:manage"), updateCollection);
router.delete('/:id', authenticateJWT, requirePermission("collections:manage"), deleteCollection);
router.get('/:slug/products', getCollectionProducts);

export default router;
