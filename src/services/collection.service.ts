import { Prisma, CollectionType } from '@prisma/client';
import prisma from '../config/prisma';

export const collectionService = {
  async getCollections() {
    return prisma.collection.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getCollectionById(id: string) {
    return prisma.collection.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  },

  async getCollectionBySlug(slug: string) {
    return prisma.collection.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  },

  async createCollection(data: Prisma.CollectionCreateInput) {
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    return prisma.collection.create({
      data,
    });
  },

  async updateCollection(id: string, data: Prisma.CollectionUpdateInput) {
    return prisma.collection.update({
      where: { id },
      data,
    });
  },

  async deleteCollection(id: string) {
    return prisma.collection.delete({
      where: { id },
    });
  },

  async getCollectionProducts(slug: string, skip?: number, take?: number) {
    const collection = await prisma.collection.findUnique({
      where: { slug },
    });

    if (!collection) {
      throw new Error('Collection not found');
    }

    if (collection.type === CollectionType.MANUAL) {
      const collectionProducts = await prisma.collectionProduct.findMany({
        where: { collectionId: collection.id },
        include: {
          product: {
            include: {
              variants: true,
              category: true,
            }
          }
        },
        skip,
        take,
        orderBy: { addedAt: 'desc' }
      });
      const total = await prisma.collectionProduct.count({ where: { collectionId: collection.id } });

      return {
        data: collectionProducts.map(cp => cp.product),
        meta: {
          total,
          skip: skip || 0,
          take: take || total,
        }
      };
    } else {
      // Automated Collection
      let whereClause: Prisma.ProductWhereInput = {};
      
      try {
        const rules = collection.rules as any;
        if (Array.isArray(rules) && rules.length > 0) {
          const priceRules = rules.filter(r => r.field === 'price');
          if (priceRules.length > 0) {
            whereClause.variants = { some: { price: {} } };
            priceRules.forEach(rule => {
              const val = parseFloat(rule.value);
              if (!isNaN(val)) {
                if (rule.operator === 'is less than' || rule.operator === '<') {
                  (whereClause.variants as any).some.price.lt = val;
                } else if (rule.operator === 'is greater than' || rule.operator === '>') {
                  (whereClause.variants as any).some.price.gt = val;
                }
              }
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse collection rules", e);
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          variants: true,
          category: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.product.count({ where: whereClause });

      return {
        data: products,
        meta: {
          total,
          skip: skip || 0,
          take: take || total,
        }
      };
    }
  }
};
