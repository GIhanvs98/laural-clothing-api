import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'auto',
  endpoint: process.env.AWS_S3_ENDPOINT || 'https://t3.storageapi.dev',
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

export async function signImageUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (!url.includes('t3.storageapi.dev') && !url.includes(process.env.AWS_S3_ENDPOINT || '')) return url;
  
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
    
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
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
  }) {
    const { skip = 0, take = 50, search, category } = params;

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
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: { variants: true },
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
  }

  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    return product ? processProductImageUrls(product) : null;
  }

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });
    return product ? processProductImageUrls(product) : null;
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    
    return prisma.product.create({
      data,
    });
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  }
}

export const productService = new ProductService();
