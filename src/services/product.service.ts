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
    sizes?: string[];
    colors?: string[];
    minPrice?: number;
    maxPrice?: number;
    styles?: string[];
    sort?: string;
  }) {
    const { skip = 0, take = 50, search, category, sizes, colors, minPrice, maxPrice, styles, sort } = params;
    
    // Create a deterministic cache key
    const cacheKey = `products:all:skip:${skip}:take:${take}:search:${search || 'none'}:category:${category || 'none'}:sizes:${sizes?.join(',') || 'none'}:colors:${colors?.join(',') || 'none'}:minPrice:${minPrice || 'none'}:maxPrice:${maxPrice || 'none'}:styles:${styles?.join(',') || 'none'}:sort:${sort || 'none'}`;

    return withCache(cacheKey, 900, async () => {
      const where: Prisma.ProductWhereInput = {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                  { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
                ],
              }
            : {},
          category
            ? {
                category: { slug: category },
              }
            : {},
          styles && styles.length > 0
            ? {
                category: { name: { in: styles, mode: 'insensitive' } },
              }
            : {},
          sizes && sizes.length > 0
            ? {
                variants: { some: { size: { in: sizes, mode: 'insensitive' } } },
              }
            : {},
          colors && colors.length > 0
            ? {
                variants: { some: { color: { in: colors, mode: 'insensitive' } } },
              }
            : {},
          minPrice !== undefined || maxPrice !== undefined
            ? {
                variants: {
                  some: {
                    price: {
                      ...(minPrice !== undefined ? { gte: minPrice } : {}),
                      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                    },
                  },
                },
              }
            : {},
        ],
      };

      // Determine orderBy based on sort parameter
      let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
      if (sort === 'price-asc') {
        // Prisma doesn't perfectly support ordering by relation aggregate if it's 1-to-many,
        // but we can sort by createdAt for now, or if Prisma 5 supports it, we can sort by variants.
        // Actually, we'll just leave it as createdAt for now since Prisma requires raw query to sort by min variant price
        orderBy = { createdAt: 'desc' };
      } else if (sort === 'price-desc') {
        orderBy = { createdAt: 'desc' };
      } else if (sort === 'newest') {
        orderBy = { createdAt: 'desc' };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take,
          select: productWithVariantsSelect,
          orderBy,
        }),
        prisma.product.count({ where }),
      ]);

      // If we need client side sorting, we can do it here for price since we have variants
      if (sort === 'price-asc') {
        products.sort((a, b) => {
          const aPrice = a.variants?.[0]?.price ?? 0;
          const bPrice = b.variants?.[0]?.price ?? 0;
          return aPrice - bPrice;
        });
      } else if (sort === 'price-desc') {
        products.sort((a, b) => {
          const aPrice = a.variants?.[0]?.price ?? 0;
          const bPrice = b.variants?.[0]?.price ?? 0;
          return bPrice - aPrice;
        });
      }

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

  async getFilterMetadata() {
    return withCache('products:filters:meta', 3600, async () => {
      // Fetch top 10 colors by variant count
      const colorsAgg = await prisma.productVariant.groupBy({
        by: ['color'],
        where: { color: { not: null } },
        _count: { color: true },
        orderBy: { _count: { color: 'desc' } },
        take: 10,
      });
      
      const rawSizes = await prisma.productVariant.groupBy({
        by: ['size'],
        where: { size: { not: null } },
      });
      
      const priceAgg = await prisma.productVariant.aggregate({
        _max: { price: true },
        _min: { price: true },
      });

      // Clean sizes from DB which might have colors attached (e.g., "Peach, UK 12" -> "UK 12")
      const cleanedSizes = new Set<string>();
      rawSizes.forEach((s: any) => {
        if (!s.size) return;
        const parts = s.size.split(',');
        // Extract just the size portion and normalize formatting
        let sizePart = parts[parts.length - 1].trim().toUpperCase();
        
        // Normalize "UK12" to "UK 12" if space is missing
        if (sizePart.match(/^UK\d+$/)) {
          sizePart = sizePart.replace('UK', 'UK ');
        }
        
        cleanedSizes.add(sizePart);
      });

      // Requested size priority map
      const targetSizes = ["S", "M", "L", "UK 08", "UK 10", "UK 12", "32", "34", "36"];
      
      // Keep only available target sizes while maintaining logical order
      const finalSizes = targetSizes.filter(ts => cleanedSizes.has(ts));
      
      // If we haven't hit 10 sizes, fill the remaining slots with other active sizes
      if (finalSizes.length < 10) {
        const others = Array.from(cleanedSizes)
          .filter(s => !targetSizes.includes(s))
          .slice(0, 10 - finalSizes.length);
        finalSizes.push(...others);
      }

      return {
        colors: colorsAgg.map((c: any) => c.color).filter(Boolean),
        sizes: finalSizes.slice(0, 10),
        maxPrice: priceAgg._max.price || 10000,
        minPrice: priceAgg._min.price || 0,
      };
    });
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
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
    const result = await prisma.product.delete({
      where: { id },
    });
    await invalidateCache('product*');
    return result;
  }
}

export const productService = new ProductService();
