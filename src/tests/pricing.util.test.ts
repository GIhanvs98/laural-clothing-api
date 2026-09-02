import { getEffectivePrice } from '../utils/pricing.util';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDate(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function makeVariant(overrides: Record<string, any> = {}) {
  return {
    price: 1500,
    salePrice: null,
    flashSaleItems: [],
    ...overrides,
  };
}

function makeFlashSaleItem(overrides: Record<string, any> = {}) {
  return {
    salePrice: 750,
    flashSale: {
      status: 'ACTIVE',
      startDate: null,
      endDate: null,
    },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getEffectivePrice()', () => {
  // ── Baseline ────────────────────────────────────────────────────────────────

  describe('no discount applied', () => {
    it('returns base price when no salePrice and no flash sales', () => {
      const variant = makeVariant();
      expect(getEffectivePrice(variant)).toBe(1500);
    });

    it('returns 0 when variant is null', () => {
      expect(getEffectivePrice(null)).toBe(0);
    });

    it('returns 0 when variant is undefined', () => {
      expect(getEffectivePrice(undefined)).toBe(0);
    });

    it('returns 0 when price is 0', () => {
      const variant = makeVariant({ price: 0 });
      expect(getEffectivePrice(variant)).toBe(0);
    });
  });

  // ── Static salePrice fallback ────────────────────────────────────────────────

  describe('static salePrice (no flash sale)', () => {
    it('uses salePrice when no flash sale items exist', () => {
      const variant = makeVariant({ price: 2000, salePrice: 1600, flashSaleItems: [] });
      expect(getEffectivePrice(variant)).toBe(1600);
    });

    it('uses salePrice = 0 correctly (free product edge case)', () => {
      const variant = makeVariant({ price: 2000, salePrice: 0, flashSaleItems: [] });
      // salePrice 0 is falsy — base price should be used (null coalescing is ??)
      expect(getEffectivePrice(variant)).toBe(0);
    });
  });

  // ── Flash Sale: Active with no date constraints ───────────────────────────────

  describe('active flash sale — no date constraints', () => {
    it('uses flash sale price when sale is ACTIVE with no start/end dates', () => {
      const variant = makeVariant({
        flashSaleItems: [makeFlashSaleItem({ salePrice: 900 })],
      });
      expect(getEffectivePrice(variant)).toBe(900);
    });

    it('flash sale price overrides static salePrice', () => {
      const variant = makeVariant({
        salePrice: 1200,
        flashSaleItems: [makeFlashSaleItem({ salePrice: 750 })],
      });
      expect(getEffectivePrice(variant)).toBe(750);
    });
  });

  // ── Flash Sale: Date-bounded ──────────────────────────────────────────────────

  describe('active flash sale — date-bounded', () => {
    it('applies flash sale when current date is within start and end', () => {
      const variant = makeVariant({
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 600,
            flashSale: {
              status: 'ACTIVE',
              startDate: makeDate(-60 * 60 * 1000), // 1 hour ago
              endDate: makeDate(60 * 60 * 1000),    // 1 hour ahead
            },
          }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(600);
    });

    it('skips flash sale when current date is before startDate', () => {
      const variant = makeVariant({
        price: 1500,
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 600,
            flashSale: {
              status: 'ACTIVE',
              startDate: makeDate(60 * 60 * 1000), // starts 1 hour FROM NOW
              endDate: makeDate(5 * 60 * 60 * 1000),
            },
          }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(1500); // returns base
    });

    it('skips flash sale when current date is after endDate', () => {
      const variant = makeVariant({
        price: 1500,
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 600,
            flashSale: {
              status: 'ACTIVE',
              startDate: makeDate(-5 * 60 * 60 * 1000), // 5 hours ago
              endDate: makeDate(-60 * 60 * 1000),        // ended 1 hour ago
            },
          }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(1500); // expired
    });

    it('applies flash sale when only startDate is set and is in the past', () => {
      const variant = makeVariant({
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 800,
            flashSale: {
              status: 'ACTIVE',
              startDate: makeDate(-60 * 60 * 1000),
              endDate: null,
            },
          }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(800);
    });

    it('applies flash sale when only endDate is set and is in the future', () => {
      const variant = makeVariant({
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 800,
            flashSale: {
              status: 'ACTIVE',
              startDate: null,
              endDate: makeDate(60 * 60 * 1000),
            },
          }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(800);
    });
  });

  // ── Flash Sale: Non-active status ─────────────────────────────────────────────

  describe('inactive flash sale statuses', () => {
    it('ignores flash sale items with status SCHEDULED', () => {
      const variant = makeVariant({
        price: 1500,
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 500,
            flashSale: { status: 'SCHEDULED', startDate: null, endDate: null },
          }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(1500);
    });

    it('ignores flash sale items with status EXPIRED', () => {
      const variant = makeVariant({
        price: 1500,
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 500,
            flashSale: { status: 'EXPIRED', startDate: null, endDate: null },
          }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(1500);
    });

    it('ignores flash sale items with null flashSale', () => {
      const variant = makeVariant({
        price: 1500,
        flashSaleItems: [{ salePrice: 500, flashSale: null }],
      });
      expect(getEffectivePrice(variant)).toBe(1500);
    });
  });

  // ── Multiple Flash Sale Items ──────────────────────────────────────────────────

  describe('multiple flash sale items', () => {
    it('uses first active flash sale item found', () => {
      const variant = makeVariant({
        flashSaleItems: [
          makeFlashSaleItem({
            salePrice: 700,
            flashSale: { status: 'EXPIRED', startDate: null, endDate: null },
          }),
          makeFlashSaleItem({
            salePrice: 900,
            flashSale: { status: 'ACTIVE', startDate: null, endDate: null },
          }),
          makeFlashSaleItem({
            salePrice: 800,
            flashSale: { status: 'ACTIVE', startDate: null, endDate: null },
          }),
        ],
      });
      // First ACTIVE item in order should win
      expect(getEffectivePrice(variant)).toBe(900);
    });

    it('falls back to base price when all flash sale items are inactive', () => {
      const variant = makeVariant({
        price: 1500,
        flashSaleItems: [
          makeFlashSaleItem({ salePrice: 500, flashSale: { status: 'EXPIRED', startDate: null, endDate: null } }),
          makeFlashSaleItem({ salePrice: 400, flashSale: { status: 'SCHEDULED', startDate: null, endDate: null } }),
        ],
      });
      expect(getEffectivePrice(variant)).toBe(1500);
    });
  });

  // ── Discount calculation verification ────────────────────────────────────────

  describe('discount percentage integrity', () => {
    it('50% flash sale on Rs.1500 results in Rs.750', () => {
      const basePrice = 1500;
      const variant = makeVariant({
        price: basePrice,
        flashSaleItems: [makeFlashSaleItem({ salePrice: 750 })],
      });
      const effective = getEffectivePrice(variant);
      const discount = Math.round(((basePrice - effective) / basePrice) * 100);
      expect(effective).toBe(750);
      expect(discount).toBe(50);
    });

    it('40% flash sale on Rs.1000 results in Rs.600', () => {
      const basePrice = 1000;
      const variant = makeVariant({
        price: basePrice,
        flashSaleItems: [makeFlashSaleItem({ salePrice: 600 })],
      });
      const effective = getEffectivePrice(variant);
      const discount = Math.round(((basePrice - effective) / basePrice) * 100);
      expect(effective).toBe(600);
      expect(discount).toBe(40);
    });

    it('returns 0 discount when no flash sale is active', () => {
      const basePrice = 1500;
      const variant = makeVariant({ price: basePrice });
      const effective = getEffectivePrice(variant);
      const discount = basePrice > effective
        ? Math.round(((basePrice - effective) / basePrice) * 100)
        : 0;
      expect(discount).toBe(0);
    });
  });
});
