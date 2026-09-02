import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { productWithVariantsSelect } from '../dto/product.dto';
import { withCache, invalidateCache } from '../utils/cache.util';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'auto',
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

export async function signImageUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  
  const endpointUrl = process.env.AWS_S3_ENDPOINT || '';
  let endpointHostname = '';
  try {
    if (endpointUrl) {
      endpointHostname = new URL(endpointUrl).hostname;
    }
  } catch (e) {
    // Ignore invalid URL
  }
  
  if (!url.includes(endpointHostname) && !url.includes(endpointUrl)) return url;
  
  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME || '';
    const urlObj = new URL(url);
    let key = urlObj.pathname.substring(1); // remove leading slash
    if (key.startsWith(bucket + '/')) {
      key = key.substring(bucket.length + 1);
    }
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    // AWS Signature V4 maximum expiration is 7 days (604800 seconds).
    // This perfectly solves the Next.js ISR (1 hour) expiration race condition!
    return await getSignedUrl(s3Client, command, { expiresIn: 604800 });
  } catch (error) {
    console.error('Failed to sign URL:', error);
    return url;
  }
}

async function processProductImageUrls(product: any) {
  if (!product.variants) return product;
  
  for (const variant of product.variants) {
    variant.featuredImage = await signImageUrl(variant.featuredImage);
    if (variant.gallery && variant.gallery.length > 0) {
      variant.gallery = await Promise.all(variant.gallery.map((url: string) => signImageUrl(url)));
    }
  }
  return product;
}

export class ProductService {
  async getAllProducts(params: {
    skip?: number;
    take?: number;
    search?: string;
    category?: string;
    color?: string;
    size?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
  }) {
    const { skip = 0, take = 50, search, category, color, size, minPrice, maxPrice, status } = params;
    const cacheKey = `products:all:skip:${skip}:take:${take}:search:${search || 'none'}:category:${category || 'none'}:color:${color || 'none'}:size:${size || 'none'}:minP:${minPrice || 'none'}:maxP:${maxPrice || 'none'}:status:${status || 'none'}`;

    return withCache(cacheKey, 900, async () => {
      const where: Prisma.ProductWhereInput = {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
        ...(category
          ? {
              category: { slug: category }
            }
          : {}),
        ...((color || size || minPrice !== undefined || maxPrice !== undefined)
          ? {
              variants: {
                some: {
                  ...(color ? { color: { equals: color, mode: 'insensitive' } } : {}),
                  ...(size ? { size: { equals: size, mode: 'insensitive' } } : {}),
                  ...(minPrice !== undefined ? { price: { gte: minPrice } } : {}),
                  ...(maxPrice !== undefined ? { price: { lte: maxPrice } } : {}),
                }
              }
            }
          : {}),
        // If no status is specified, exclude ARCHIVED by default
        ...(status && status !== 'ALL' 
          ? { status: { equals: status, mode: 'insensitive' } } 
          : (!status ? { status: { not: 'ARCHIVED' } } : {})),
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take,
          select: productWithVariantsSelect,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.product.count({ where }),
      ]);

      const processedProducts = await Promise.all(products.map((p: any) => processProductImageUrls(p)));

      return {
        data: processedProducts,
        meta: {
          total,
          skip,
          take,
        },
      };
    });
  }

  async getProductById(id: string) {
    return withCache(`product:id:${id}`, 900, async () => {
      const product = await prisma.product.findUnique({
        where: { id },
        select: productWithVariantsSelect,
      });
      return product ? processProductImageUrls(product) : null;
    });
  }

  async getProductBySlug(slug: string) {
    return withCache(`product:slug:${slug}`, 900, async () => {
      const product = await prisma.product.findUnique({
        where: { slug },
        select: productWithVariantsSelect,
      });
      return product ? processProductImageUrls(product) : null;
    });
  }

  async getProductBySku(sku: string) {
    return withCache(`product:sku:${sku}`, 900, async () => {
      const variant = await prisma.productVariant.findUnique({
        where: { sku },
        select: { product: { select: productWithVariantsSelect } },
      });
      return variant && variant.product ? processProductImageUrls(variant.product) : null;
    });
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    if (!data.slug) {
      let baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.product.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      data.slug = slug;
    }
    
    const result = await prisma.product.create({
      data,
    });
    await invalidateCache('product*');
    return result;
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    const result = await prisma.product.update({
      where: { id },
      data,
    });
    await invalidateCache('product*');
    return result;
  }

  async deleteProduct(id: string) {
    const result = await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });
    await invalidateCache('product*');
    return result;
  }

  async bulkEditProducts(productIds: string[], data: any) {
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data,
    });
    await invalidateCache('product*');
    return result;
  }

  async getFilters() {
    return withCache('product_filters', 3600, async () => {
      const colors = await prisma.productVariant.findMany({
        where: { color: { not: null } },
        select: { color: true },
        distinct: ['color'],
      });

      const sizes = await prisma.productVariant.findMany({
        where: { size: { not: null } },
        select: { size: true },
        distinct: ['size'],
      });

      return {
        colors: colors.map((c) => c.color).filter(Boolean) as string[],
        sizes: sizes.map((s) => s.size).filter(Boolean) as string[],
      };
    });
  }
}

export const productService = new ProductService();
