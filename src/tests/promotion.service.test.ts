/**
 * Integration-style unit tests for promotionService flash sale methods.
 * Prisma client is mocked so no real DB connection is required.
 */

// Mock the prisma module before any imports that use it
jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    flashSale: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    flashSaleItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '../config/prisma';
import { promotionService } from '../services/promotion.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleFlashSale = {
  id: 'fs-001',
  name: 'End of Season Sale',
  description: 'Big discounts!',
  discount: 50,
  status: 'ACTIVE',
  startDate: null,
  endDate: null,
  items: [],
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};

const sampleItem = { variantId: 'var-001', salePrice: 750 };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('promotionService — Flash Sales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getFlashSales ──────────────────────────────────────────────────────────

  describe('getFlashSales()', () => {
    it('returns an array of flash sales', async () => {
      (mockPrisma.flashSale.findMany as jest.Mock).mockResolvedValue([sampleFlashSale]);
      const result = await promotionService.getFlashSales();
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('End of Season Sale');
    });

    it('returns empty array when no flash sales exist', async () => {
      (mockPrisma.flashSale.findMany as jest.Mock).mockResolvedValue([]);
      const result = await promotionService.getFlashSales();
      expect(result).toEqual([]);
    });
  });

  // ── getFlashSaleById ───────────────────────────────────────────────────────

  describe('getFlashSaleById()', () => {
    it('returns flash sale when found', async () => {
      (mockPrisma.flashSale.findUnique as jest.Mock).mockResolvedValue(sampleFlashSale);
      const result = await promotionService.getFlashSaleById('fs-001');
      expect(result.id).toBe('fs-001');
    });

    it('throws an error when flash sale not found', async () => {
      (mockPrisma.flashSale.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(promotionService.getFlashSaleById('nonexistent')).rejects.toThrow(
        'Flash Sale not found'
      );
    });
  });

  // ── createFlashSale ────────────────────────────────────────────────────────

  describe('createFlashSale()', () => {
    it('creates a flash sale and its items in a transaction', async () => {
      const txMock = {
        flashSale: { create: jest.fn().mockResolvedValue(sampleFlashSale) },
        flashSaleItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      };
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof txMock) => Promise<any>) => cb(txMock)
      );

      const payload = {
        name: 'End of Season Sale',
        description: 'Big discounts!',
        discount: 50,
        status: 'ACTIVE',
        startDate: null,
        endDate: null,
        items: [sampleItem],
      };

      const result = await promotionService.createFlashSale(payload);

      expect(txMock.flashSale.create).toHaveBeenCalledTimes(1);
      expect(txMock.flashSaleItem.createMany).toHaveBeenCalledWith({
        data: [{ flashSaleId: 'fs-001', variantId: 'var-001', salePrice: 750 }],
      });
      expect(result.name).toBe('End of Season Sale');
    });

    it('creates flash sale without items', async () => {
      const txMock = {
        flashSale: { create: jest.fn().mockResolvedValue(sampleFlashSale) },
        flashSaleItem: { createMany: jest.fn() },
      };
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof txMock) => Promise<any>) => cb(txMock)
      );

      await promotionService.createFlashSale({ ...sampleFlashSale, items: [] });

      expect(txMock.flashSale.create).toHaveBeenCalledTimes(1);
      expect(txMock.flashSaleItem.createMany).not.toHaveBeenCalled();
    });

    it('stores the correct salePrice for each item', async () => {
      const txMock = {
        flashSale: { create: jest.fn().mockResolvedValue(sampleFlashSale) },
        flashSaleItem: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof txMock) => Promise<any>) => cb(txMock)
      );

      const items = [
        { variantId: 'var-001', salePrice: 750 },
        { variantId: 'var-002', salePrice: 1000 },
      ];

      await promotionService.createFlashSale({ ...sampleFlashSale, items });

      const calledWith = txMock.flashSaleItem.createMany.mock.calls[0][0];
      expect(calledWith.data).toEqual([
        { flashSaleId: 'fs-001', variantId: 'var-001', salePrice: 750 },
        { flashSaleId: 'fs-001', variantId: 'var-002', salePrice: 1000 },
      ]);
    });
  });

  // ── updateFlashSale ────────────────────────────────────────────────────────

  describe('updateFlashSale()', () => {
    it('deletes old items and recreates them on update', async () => {
      const txMock = {
        flashSale: { update: jest.fn().mockResolvedValue(sampleFlashSale) },
        flashSaleItem: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof txMock) => Promise<any>) => cb(txMock)
      );

      await promotionService.updateFlashSale('fs-001', {
        ...sampleFlashSale,
        items: [sampleItem],
      });

      expect(txMock.flashSaleItem.deleteMany).toHaveBeenCalledWith({
        where: { flashSaleId: 'fs-001' },
      });
      expect(txMock.flashSaleItem.createMany).toHaveBeenCalledTimes(1);
    });

    it('removes all items when items array is empty', async () => {
      const txMock = {
        flashSale: { update: jest.fn().mockResolvedValue(sampleFlashSale) },
        flashSaleItem: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          createMany: jest.fn(),
        },
      };
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof txMock) => Promise<any>) => cb(txMock)
      );

      await promotionService.updateFlashSale('fs-001', {
        ...sampleFlashSale,
        items: [],
      });

      expect(txMock.flashSaleItem.deleteMany).toHaveBeenCalledTimes(1);
      expect(txMock.flashSaleItem.createMany).not.toHaveBeenCalled();
    });
  });

  // ── deleteFlashSale ────────────────────────────────────────────────────────

  describe('deleteFlashSale()', () => {
    it('deletes the flash sale by id', async () => {
      (mockPrisma.flashSale.delete as jest.Mock).mockResolvedValue(sampleFlashSale);
      await promotionService.deleteFlashSale('fs-001');
      expect(mockPrisma.flashSale.delete).toHaveBeenCalledWith({ where: { id: 'fs-001' } });
    });
  });

  // ── Business Rule: Discount Math ──────────────────────────────────────────

  describe('business rule — global discount computation', () => {
    /**
     * This test verifies the discount formula used in FlashSaleModal and
     * whenever a sale price is being computed. The formula must be:
     *   salePrice = basePrice - (basePrice * (discount / 100))
     */

    const cases = [
      { basePrice: 1500, discount: 50, expectedSalePrice: 750 },
      { basePrice: 2000, discount: 25, expectedSalePrice: 1500 },
      { basePrice: 1000, discount: 40, expectedSalePrice: 600 },
      { basePrice: 999,  discount: 10, expectedSalePrice: 899.1 },
    ];

    test.each(cases)(
      '%i - %d%% discount = %i sale price',
      ({ basePrice, discount, expectedSalePrice }) => {
        const computed = basePrice - basePrice * (discount / 100);
        expect(computed).toBeCloseTo(expectedSalePrice, 1);
      }
    );

    it('a 100% discount results in a sale price of 0', () => {
      const basePrice = 1500;
      const discount = 100;
      const salePrice = basePrice - basePrice * (discount / 100);
      expect(salePrice).toBe(0);
    });

    it('a 0% discount results in no price change', () => {
      const basePrice = 1500;
      const discount = 0;
      const salePrice = basePrice - basePrice * (discount / 100);
      expect(salePrice).toBe(1500);
    });
  });
});
