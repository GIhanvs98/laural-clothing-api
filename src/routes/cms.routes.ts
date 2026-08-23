import { Router } from 'express';
import * as cmsController from '../controllers/cms.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Hero Slides
router.get('/hero', authenticateJWT, requirePermission("cms:view"), cmsController.getHeroSlides);
router.get('/hero/active', cmsController.getActiveHeroSlides);
router.post('/hero', authenticateJWT, requirePermission("cms:edit_hero"), cmsController.createHeroSlide);
router.put('/hero/:id', authenticateJWT, requirePermission("cms:edit_hero"), cmsController.updateHeroSlide);
router.delete('/hero/:id', authenticateJWT, requirePermission("cms:edit_hero"), cmsController.deleteHeroSlide);

// Banners
router.get('/banners', authenticateJWT, requirePermission("cms:view"), cmsController.getBanners);
router.get('/banners/active', cmsController.getActiveBanner);
router.post('/banners', authenticateJWT, requirePermission("cms:edit_promo"), cmsController.createBanner);
router.put('/banners/:id', authenticateJWT, requirePermission("cms:edit_promo"), cmsController.updateBanner);
router.delete('/banners/:id', authenticateJWT, requirePermission("cms:edit_promo"), cmsController.deleteBanner);

// Homepage Sections
router.get('/sections', cmsController.getHomepageSections);
router.post('/sections', authenticateJWT, requirePermission("cms:edit_homepage"), cmsController.createHomepageSection);
router.put('/sections/:id', authenticateJWT, requirePermission("cms:edit_homepage"), cmsController.updateHomepageSection);
router.delete('/sections/:id', authenticateJWT, requirePermission("cms:edit_homepage"), cmsController.deleteHomepageSection);

// Static Pages
router.get('/pages', authenticateJWT, requirePermission("cms:view"), cmsController.getStaticPages);
router.get('/pages/slug/:slug', cmsController.getStaticPageBySlug);
router.post('/pages', authenticateJWT, requirePermission("cms:edit_static"), cmsController.createStaticPage);
router.put('/pages/:id', authenticateJWT, requirePermission("cms:edit_static"), cmsController.updateStaticPage);
router.delete('/pages/:id', authenticateJWT, requirePermission("cms:edit_static"), cmsController.deleteStaticPage);

export default router;
