import { Router } from 'express';
import { getMetaCatalogFeed } from '../controllers/feed.controller';

const router = Router();

router.get('/meta-catalog', getMetaCatalogFeed);

export default router;
