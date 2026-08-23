import { Router } from 'express';
import * as cmsController from '../controllers/cms.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

// Hero Slides
router.get('/hero', authenticateJWT, requirePermission("cms:view"), cmsController.getHeroSlides);
router.get('/hero/active', cmsController.getActiveHeroSlides);
router.post('/hero', authenticateJWT, requirePermission("cms:edit_hero"), auditLog('CmsHero', 'CREATE'), cmsController.createHeroSlide);
router.put('/hero/:id', authenticateJWT, requirePermission("cms:edit_hero"), auditLog('CmsHero', 'UPDATE'), cmsController.updateHeroSlide);
router.delete('/hero/:id', authenticateJWT, requirePermission("cms:edit_hero"), auditLog('CmsHero', 'DELETE'), cmsController.deleteHeroSlide);

// Banners
router.get('/banners', authenticateJWT, requirePermission("cms:view"), cmsController.getBanners);
router.get('/banners/active', cmsController.getActiveBanner);
router.post('/banners', authenticateJWT, requirePermission("cms:edit_promo"), auditLog('CmsBanner', 'CREATE'), cmsController.createBanner);
router.put('/banners/:id', authenticateJWT, requirePermission("cms:edit_promo"), auditLog('CmsBanner', 'UPDATE'), cmsController.updateBanner);
router.delete('/banners/:id', authenticateJWT, requirePermission("cms:edit_promo"), auditLog('CmsBanner', 'DELETE'), cmsController.deleteBanner);

// Homepage Sections
router.get('/sections', cmsController.getHomepageSections);
router.post('/sections', authenticateJWT, requirePermission("cms:edit_homepage"), auditLog('CmsSection', 'CREATE'), cmsController.createHomepageSection);
router.put('/sections/:id', authenticateJWT, requirePermission("cms:edit_homepage"), auditLog('CmsSection', 'UPDATE'), cmsController.updateHomepageSection);
router.delete('/sections/:id', authenticateJWT, requirePermission("cms:edit_homepage"), auditLog('CmsSection', 'DELETE'), cmsController.deleteHomepageSection);

// Static Pages
router.get('/pages', authenticateJWT, requirePermission("cms:view"), cmsController.getStaticPages);
router.get('/pages/slug/:slug', cmsController.getStaticPageBySlug);
router.post('/pages', authenticateJWT, requirePermission("cms:edit_static"), auditLog('CmsPage', 'CREATE'), cmsController.createStaticPage);
router.put('/pages/:id', authenticateJWT, requirePermission("cms:edit_static"), auditLog('CmsPage', 'UPDATE'), cmsController.updateStaticPage);
router.delete('/pages/:id', authenticateJWT, requirePermission("cms:edit_static"), auditLog('CmsPage', 'DELETE'), cmsController.deleteStaticPage);

export default router;
