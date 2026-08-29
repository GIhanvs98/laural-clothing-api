import { Request, Response } from 'express';
import { cmsService } from '../services/cms.service';
import { z } from 'zod';

const heroSlideSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
  ctaLink: z.string().optional().nullable(),
  image: z.string().min(1),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

const bannerSchema = z.object({
  text: z.string().min(1),
  link: z.string().optional().nullable(),
  bgColor: z.string().optional(),
  active: z.boolean().optional(),
  type: z.string().optional(),
});

const sectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  visible: z.boolean().optional(),
  order: z.number().int().optional(),
  type: z.string().optional(),
  config: z.any().optional(),
});

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
});

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
    const validatedData = heroSlideSchema.parse(req.body);
    const slide = await cmsService.createHeroSlide(validatedData);
    res.status(201).json(slide);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateHeroSlide = async (req: Request, res: Response) => {
  try {
    const validatedData = heroSlideSchema.partial().parse(req.body);
    const slide = await cmsService.updateHeroSlide(req.params.id as string, validatedData);
    res.json(slide);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
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
    const validatedData = bannerSchema.parse(req.body);
    const banner = await cmsService.createBanner(validatedData);
    res.status(201).json(banner);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBanner = async (req: Request, res: Response) => {
  try {
    const validatedData = bannerSchema.partial().parse(req.body);
    const banner = await cmsService.updateBanner(req.params.id as string, validatedData);
    res.json(banner);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
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
    const validatedData = sectionSchema.parse(req.body);
    const section = await cmsService.createHomepageSection(validatedData);
    res.status(201).json(section);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateHomepageSection = async (req: Request, res: Response) => {
  try {
    const validatedData = sectionSchema.partial().parse(req.body);
    const section = await cmsService.updateHomepageSection(req.params.id as string, validatedData);
    res.json(section);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
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
    const validatedData = pageSchema.parse(req.body);
    const page = await cmsService.createStaticPage(validatedData);
    res.status(201).json(page);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStaticPage = async (req: Request, res: Response) => {
  try {
    const validatedData = pageSchema.partial().parse(req.body);
    const page = await cmsService.updateStaticPage(req.params.id as string, validatedData);
    res.json(page);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
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
