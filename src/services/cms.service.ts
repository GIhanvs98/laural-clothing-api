import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export class CmsService {
  // Hero Slides
  async getHeroSlides() {
    return prisma.heroSlide.findMany({ orderBy: { order: 'asc' } });
  }

  async getActiveHeroSlides() {
    return prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
  }

  async createHeroSlide(data: Prisma.HeroSlideCreateInput) {
    return prisma.heroSlide.create({ data });
  }

  async updateHeroSlide(id: string, data: Prisma.HeroSlideUpdateInput) {
    return prisma.heroSlide.update({ where: { id }, data });
  }

  async deleteHeroSlide(id: string) {
    return prisma.heroSlide.delete({ where: { id } });
  }

  // Banners
  async getBanners() {
    return prisma.banner.findMany();
  }

  async getActiveBanner() {
    return prisma.banner.findFirst({ where: { active: true } });
  }

  async createBanner(data: Prisma.BannerCreateInput) {
    if (data.active) {
      await prisma.banner.updateMany({ data: { active: false } });
    }
    return prisma.banner.create({ data });
  }

  async updateBanner(id: string, data: Prisma.BannerUpdateInput) {
    if (data.active) {
      await prisma.banner.updateMany({
        where: { id: { not: id } },
        data: { active: false }
      });
    }
    return prisma.banner.update({ where: { id }, data });
  }

  async deleteBanner(id: string) {
    return prisma.banner.delete({ where: { id } });
  }

  // Homepage Sections
  async getHomepageSections() {
    return prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  }

  async createHomepageSection(data: Prisma.HomepageSectionCreateInput) {
    return prisma.homepageSection.create({ data });
  }

  async updateHomepageSection(id: string, data: Prisma.HomepageSectionUpdateInput) {
    return prisma.homepageSection.update({ where: { id }, data });
  }

  async deleteHomepageSection(id: string) {
    return prisma.homepageSection.delete({ where: { id } });
  }

  // Static Pages
  async getStaticPages() {
    return prisma.staticPage.findMany();
  }

  async getStaticPageBySlug(slug: string) {
    return prisma.staticPage.findUnique({ where: { slug } });
  }

  async createStaticPage(data: Prisma.StaticPageCreateInput) {
    return prisma.staticPage.create({ data });
  }

  async updateStaticPage(id: string, data: Prisma.StaticPageUpdateInput) {
    return prisma.staticPage.update({
      where: { id },
      data: { ...data, lastEdited: new Date() }
    });
  }

  async deleteStaticPage(id: string) {
    return prisma.staticPage.delete({ where: { id } });
  }
}

export const cmsService = new CmsService();
