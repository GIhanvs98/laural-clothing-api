import prisma from '../config/prisma';
import { signImageUrl } from './product.service';

// Resolves the final image URL for a collection.
// Priority: manually set imageUrl > first product image in the collection.
async function resolveCollectionImageUrl(collection: {
  id: string;
  imageUrl: string | null;
  type: string;
}): Promise<string | null> {
  if (collection.imageUrl) {
    return signImageUrl(collection.imageUrl);
  }

  let featuredImage: string | null = null;

  if (collection.type === 'MANUAL') {
    const cp = await prisma.collectionProduct.findFirst({
      where: { collectionId: collection.id },
      include: {
        product: {
          include: {
            variants: {
              where: { featuredImage: { not: null } },
              take: 1,
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
    featuredImage = cp?.product?.variants?.[0]?.featuredImage ?? null;
  } else {
    // Automated – pick first product that has an image
    const product = await prisma.product.findFirst({
      include: {
        variants: {
          where: { featuredImage: { not: null } },
          take: 1,
        },
      },
    });
    featuredImage = product?.variants?.[0]?.featuredImage ?? null;
  }

  if (featuredImage) return signImageUrl(featuredImage);
  return null;
}

type CollectionCreateData = {
  title: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  type?: string;
  status?: string;
  rules?: any;
};

type CollectionUpdateData = Partial<CollectionCreateData>;

export const collectionService = {
  async getCollections() {
    const collections = await prisma.collection.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      collections.map(async (col: any) => {
        const imageUrl = await resolveCollectionImageUrl(col);
        return { ...col, imageUrl };
      })
    );
  },

  async getCollectionById(id: string) {
    const col = await prisma.collection.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!col) return null;
    const imageUrl = await resolveCollectionImageUrl(col);
    return { ...col, imageUrl };
  },

  async getCollectionBySlug(slug: string) {
    const col = await prisma.collection.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    });
    if (!col) return null;
    const imageUrl = await resolveCollectionImageUrl(col);
    return { ...col, imageUrl };
  },

  async createCollection(data: CollectionCreateData) {
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    return prisma.collection.create({ data: data as any });
  },

  async updateCollection(id: string, data: CollectionUpdateData) {
    return prisma.collection.update({ where: { id }, data: data as any });
  },

  // SAFE DELETE: removes collection and join records, NEVER touches products
  async deleteCollection(id: string) {
    await prisma.collectionProduct.deleteMany({ where: { collectionId: id } });
    return prisma.collection.delete({ where: { id } });
  },

  async getCollectionProducts(slug: string, skip?: number, take?: number) {
    const collection = await prisma.collection.findUnique({ where: { slug } });
    if (!collection) throw new Error('Collection not found');

    if (collection.type === 'MANUAL') {
      const collectionProducts = await prisma.collectionProduct.findMany({
        where: { collectionId: collection.id },
        include: { product: { include: { variants: true, category: true } } },
        skip,
        take,
        orderBy: { addedAt: 'desc' },
      });
      const total = await prisma.collectionProduct.count({ where: { collectionId: collection.id } });

      return {
        data: collectionProducts.map((cp: any) => cp.product),
        meta: { total, skip: skip || 0, take: take || total },
      };
    } else {
      let whereClause: any = {};

      try {
        const rules = collection.rules as any;
        if (Array.isArray(rules) && rules.length > 0) {
          const priceRules = rules.filter((r: any) => r.field === 'price');
          if (priceRules.length > 0) {
            whereClause.variants = { some: { price: {} } };
            priceRules.forEach((rule: any) => {
              const val = parseFloat(rule.value);
              if (!isNaN(val)) {
                if (rule.operator === '<' || rule.operator === 'is less than') {
                  whereClause.variants.some.price.lt = val;
                } else if (rule.operator === '>' || rule.operator === 'is greater than') {
                  whereClause.variants.some.price.gt = val;
                }
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse collection rules', e);
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: { variants: true, category: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });
      const total = await prisma.product.count({ where: whereClause });

      return {
        data: products,
        meta: { total, skip: skip || 0, take: take || total },
      };
    }
  },
};
