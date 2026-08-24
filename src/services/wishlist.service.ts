import prisma from '../config/prisma';

export const wishlistService = {
  getWishlist: async (sessionId?: string, customerId?: string) => {
    if (!sessionId && !customerId) {
      throw new Error('Either sessionId or customerId must be provided');
    }

    let wishlist = await prisma.wishlist.findFirst({
      where: {
        OR: [
          ...(sessionId ? [{ sessionId }] : []),
          ...(customerId ? [{ customerId }] : []),
        ],
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                variants: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          sessionId,
          customerId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  variants: true
                }
              }
            }
          }
        },
      });
    }

    return wishlist;
  },

  addItem: async (wishlistId: string, productId: string) => {
    // Check if the item already exists in the wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId,
          productId
        }
      }
    });

    if (existing) {
      // It's already there, just return the wishlist
      return await prisma.wishlist.findUnique({
        where: { id: wishlistId },
        include: {
          items: {
            include: { product: { include: { variants: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId,
        productId,
      },
    });

    return await prisma.wishlist.findUnique({
      where: { id: wishlistId },
      include: {
        items: {
          include: { product: { include: { variants: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  },

  removeItem: async (wishlistId: string, productId: string) => {
    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId,
        productId,
      },
    });

    return await prisma.wishlist.findUnique({
      where: { id: wishlistId },
      include: {
        items: {
          include: { product: { include: { variants: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  },
};
