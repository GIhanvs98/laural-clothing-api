import { Router } from 'express';
import * as cmsController from '../controllers/cms.controller';

const router = Router();

// Hero Slides
router.get('/hero', cmsController.getHeroSlides);
router.get('/hero/active', cmsController.getActiveHeroSlides);
router.post('/hero', cmsController.createHeroSlide);
router.put('/hero/:id', cmsController.updateHeroSlide);
router.delete('/hero/:id', cmsController.deleteHeroSlide);

// Banners
router.get('/banners', cmsController.getBanners);
router.get('/banners/active', cmsController.getActiveBanner);
router.post('/banners', cmsController.createBanner);
router.put('/banners/:id', cmsController.updateBanner);
router.delete('/banners/:id', cmsController.deleteBanner);

// Homepage Sections
router.get('/sections', cmsController.getHomepageSections);
router.post('/sections', cmsController.createHomepageSection);
router.put('/sections/:id', cmsController.updateHomepageSection);
router.delete('/sections/:id', cmsController.deleteHomepageSection);

// Static Pages
router.get('/pages', cmsController.getStaticPages);
router.get('/pages/slug/:slug', cmsController.getStaticPageBySlug);
router.post('/pages', cmsController.createStaticPage);
router.put('/pages/:id', cmsController.updateStaticPage);
router.delete('/pages/:id', cmsController.deleteStaticPage);

export default router;
