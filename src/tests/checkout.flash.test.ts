/**
 * Unit tests for checkout price resolution with Flash Sale integration.
 * Tests that getEffectivePrice is correctly applied during total calculation.
 */
import { getEffectivePrice } from '../utils/pricing.util';

// ─── Helper to simulate cart items ────────────────────────────────────────────

function makeCartItem(variantOverrides: Record<string, any> = {}, quantity = 1) {
  return {
    id: 'item-001',
    quantity,
    variant: {
      price: 1500,
      salePrice: null,
      flashSaleItems: [],
      ...variantOverrides,
    },
  };
}

// ─── Subtotal calculation logic (mirrors checkout.service.ts) ─────────────────

function calculateSubtotal(items: ReturnType<typeof makeCartItem>[]) {
  return items.reduce((acc, item) => acc + item.quantity * getEffectivePrice(item.variant), 0);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Checkout Subtotal with Flash Sales', () => {
  describe('single item, no discount', () => {
    it('calculates correct subtotal for one item at full price', () => {
      const items = [makeCartItem({ price: 1500 }, 2)];
      expect(calculateSubtotal(items)).toBe(3000);
    });
  });

  describe('single item with static salePrice', () => {
    it('uses static salePrice for subtotal when no flash sale exists', () => {
      const items = [makeCartItem({ price: 1500, salePrice: 1200 }, 1)];
      expect(calculateSubtotal(items)).toBe(1200);
    });
  });

  describe('single item with active flash sale', () => {
    it('uses flash sale price for subtotal', () => {
      const flashSaleItems = [
        {
          salePrice: 750,
          flashSale: { status: 'ACTIVE', startDate: null, endDate: null },
        },
      ];
      const items = [makeCartItem({ price: 1500, flashSaleItems }, 1)];
      expect(calculateSubtotal(items)).toBe(750);
    });

    it('applies flash sale price multiplied by quantity', () => {
      const flashSaleItems = [
        {
          salePrice: 750,
          flashSale: { status: 'ACTIVE', startDate: null, endDate: null },
        },
      ];
      const items = [makeCartItem({ price: 1500, flashSaleItems }, 3)];
      expect(calculateSubtotal(items)).toBe(2250); // 750 * 3
    });
  });

  describe('mixed cart — some items on flash sale, some not', () => {
    it('applies flash sale only to eligible items', () => {
      const flashSaleItems = [
        { salePrice: 600, flashSale: { status: 'ACTIVE', startDate: null, endDate: null } },
      ];

      const items = [
        makeCartItem({ price: 1500, flashSaleItems }, 1), // flash: 600
        makeCartItem({ price: 2000 }, 1),                  // full: 2000
        makeCartItem({ price: 1000, salePrice: 800 }, 2),  // static: 800 * 2
      ];

      // 600 + 2000 + 1600 = 4200
      expect(calculateSubtotal(items)).toBe(4200);
    });
  });

  describe('expired flash sale in cart', () => {
    it('falls back to full price when flash sale has expired', () => {
      const expiredFlashSaleItems = [
        {
          salePrice: 600,
          flashSale: {
            status: 'ACTIVE',
            startDate: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // ended 1 hour ago
          },
        },
      ];

      const items = [makeCartItem({ price: 1500, flashSaleItems: expiredFlashSaleItems }, 1)];
      expect(calculateSubtotal(items)).toBe(1500);
    });
  });

  describe('priceAtPurchase — order ledger integrity', () => {
    it('records flash sale price as priceAtPurchase for each order item', () => {
      const flashSaleItems = [
        { salePrice: 750, flashSale: { status: 'ACTIVE', startDate: null, endDate: null } },
      ];

      const cartItems = [makeCartItem({ price: 1500, flashSaleItems }, 2)];

      // Simulate what initiateCheckout records
      const orderItems = cartItems.map(item => ({
        variantId: item.id,
        quantity: item.quantity,
        priceAtPurchase: getEffectivePrice(item.variant),
      }));

      expect(orderItems[0]!.priceAtPurchase).toBe(750); // not 1500
    });

    it('records static salePrice as priceAtPurchase when no flash sale', () => {
      const cartItems = [makeCartItem({ price: 1500, salePrice: 1200 }, 1)];

      const orderItems = cartItems.map(item => ({
        variantId: item.id,
        quantity: item.quantity,
        priceAtPurchase: getEffectivePrice(item.variant),
      }));

      expect(orderItems[0]!.priceAtPurchase).toBe(1200);
    });

    it('records base price as priceAtPurchase when no discount is active', () => {
      const cartItems = [makeCartItem({ price: 1500, salePrice: null }, 1)];

      const orderItems = cartItems.map(item => ({
        variantId: item.id,
        quantity: item.quantity,
        priceAtPurchase: getEffectivePrice(item.variant),
      }));

      expect(orderItems[0]!.priceAtPurchase).toBe(1500);
    });
  });
});
