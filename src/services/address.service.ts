import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export const addressService = {
  getAddresses: async (customerId: string) => {
    return await prisma.address.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  },

  getAddressById: async (id: string) => {
    return await prisma.address.findUnique({
      where: { id },
    });
  },

  addAddress: async (customerId: string, data: Omit<Prisma.AddressCreateInput, 'customer' | 'id' | 'createdAt' | 'updatedAt'>) => {
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { customerId, type: data.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    return await prisma.address.create({
      data: {
        ...data,
        customer: {
          connect: { id: customerId }
        }
      },
    });
  },

  updateAddress: async (id: string, customerId: string, data: Partial<Omit<Prisma.AddressUpdateInput, 'customer' | 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (data.isDefault) {
      const addressToUpdate = await prisma.address.findUnique({ where: { id } });
      if (addressToUpdate) {
        const type = data.type ? (data.type as string) : addressToUpdate.type;
        await prisma.address.updateMany({
          where: { customerId, type, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
    }

    return await prisma.address.update({
      where: { id },
      data,
    });
  },

  deleteAddress: async (id: string) => {
    return await prisma.address.delete({
      where: { id },
    });
  },

  setDefault: async (id: string, customerId: string, type: string) => {
    // Reset all others of this type for this customer
    await prisma.address.updateMany({
      where: { customerId, type, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    return await prisma.address.update({
      where: { id },
      data: { isDefault: true, type },
    });
  },
};
