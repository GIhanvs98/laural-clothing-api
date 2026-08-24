import { Request, Response } from 'express';
import { cmsService } from '../services/cms.service';

export const getHeroSlides = async (req: Request, res: Response) => {
  try {
    const slides = await cmsService.getHeroSlides();
    res.json(slides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getActiveHeroSlides = async (req: Request, res: Response) => {
  try {
    const slides = await cmsService.getActiveHeroSlides();
    res.json(slides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createHeroSlide = async (req: Request, res: Response) => {
  try {
    const slide = await cmsService.createHeroSlide(req.body);
    res.status(201).json(slide);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateHeroSlide = async (req: Request, res: Response) => {
  try {
    const slide = await cmsService.updateHeroSlide(req.params.id as string, req.body);
    res.json(slide);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteHeroSlide = async (req: Request, res: Response) => {
  try {
    await cmsService.deleteHeroSlide(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBanners = async (req: Request, res: Response) => {
  try {
    const banners = await cmsService.getBanners();
    res.json(banners);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getActiveBanner = async (req: Request, res: Response) => {
  try {
    const banner = await cmsService.getActiveBanner();
    res.json(banner || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBanner = async (req: Request, res: Response) => {
  try {
    const banner = await cmsService.createBanner(req.body);
    res.status(201).json(banner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBanner = async (req: Request, res: Response) => {
  try {
    const banner = await cmsService.updateBanner(req.params.id as string, req.body);
    res.json(banner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBanner = async (req: Request, res: Response) => {
  try {
    await cmsService.deleteBanner(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHomepageSections = async (req: Request, res: Response) => {
  try {
    const sections = await cmsService.getHomepageSections();
    res.json(sections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createHomepageSection = async (req: Request, res: Response) => {
  try {
    const section = await cmsService.createHomepageSection(req.body);
    res.status(201).json(section);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateHomepageSection = async (req: Request, res: Response) => {
  try {
    const section = await cmsService.updateHomepageSection(req.params.id as string, req.body);
    res.json(section);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteHomepageSection = async (req: Request, res: Response) => {
  try {
    await cmsService.deleteHomepageSection(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStaticPages = async (req: Request, res: Response) => {
  try {
    const pages = await cmsService.getStaticPages();
    res.json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStaticPageBySlug = async (req: Request, res: Response) => {
  try {
    const page = await cmsService.getStaticPageBySlug(req.params.slug as string);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStaticPage = async (req: Request, res: Response) => {
  try {
    const page = await cmsService.createStaticPage(req.body);
    res.status(201).json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStaticPage = async (req: Request, res: Response) => {
  try {
    const page = await cmsService.updateStaticPage(req.params.id as string, req.body);
    res.json(page);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteStaticPage = async (req: Request, res: Response) => {
  try {
    await cmsService.deleteStaticPage(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
