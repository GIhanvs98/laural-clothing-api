import prisma from '../config/prisma';

export const promotionService = {
  // --- Coupons ---
  async getCoupons() {
    return prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  async getCouponById(id: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new Error('Coupon not found');
    return coupon;
  },

  async createCoupon(data: any) {
    return prisma.coupon.create({
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        value: data.value,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status
      }
    });
  },

  async updateCoupon(id: string, data: any) {
    return prisma.coupon.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        value: data.value,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        status: data.status
      }
    });
  },

  async deleteCoupon(id: string) {
    return prisma.coupon.delete({ where: { id } });
  },

  // --- Flash Sales ---
  async getFlashSales() {
    return prisma.flashSale.findMany({
      include: {
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getFlashSaleById(id: string) {
    const flashSale = await prisma.flashSale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      }
    });
    if (!flashSale) throw new Error('Flash Sale not found');
    return flashSale;
  },

  async createFlashSale(data: any) {
    return prisma.$transaction(async (tx) => {
      const flashSale = await tx.flashSale.create({
        data: {
          name: data.name,
          description: data.description,
          discount: data.discount,
          status: data.status,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        }
      });

      if (data.items && data.items.length > 0) {
        await tx.flashSaleItem.createMany({
          data: data.items.map((item: any) => ({
            flashSaleId: flashSale.id,
            variantId: item.variantId,
            salePrice: item.salePrice
          }))
        });
      }

      return flashSale;
    });
  },

  async updateFlashSale(id: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const flashSale = await tx.flashSale.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          discount: data.discount,
          status: data.status,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        }
      });

      if (data.items) {
        // Simple strategy: delete existing and recreate
        await tx.flashSaleItem.deleteMany({ where: { flashSaleId: id } });
        
        if (data.items.length > 0) {
          await tx.flashSaleItem.createMany({
            data: data.items.map((item: any) => ({
              flashSaleId: id,
              variantId: item.variantId,
              salePrice: item.salePrice
            }))
          });
        }
      }

      return flashSale;
    });
  },

  async deleteFlashSale(id: string) {
    return prisma.flashSale.delete({ where: { id } });
  }
};
