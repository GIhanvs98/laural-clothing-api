import { Router } from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionProducts
} from '../controllers/collection.controller';

const router = Router();

router.get('/', getCollections);
router.post('/', createCollection);
router.get('/:id', getCollectionById);
router.put('/:id', updateCollection);
router.delete('/:id', deleteCollection);
router.get('/:slug/products', getCollectionProducts);

export default router;
