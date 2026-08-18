import prisma from '../config/prisma';
import { signImageUrl } from './product.service';

export const inventoryService = {

  // ─── Stock Levels ────────────────────────────────────────────────────────────
  async getInventory(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
        inventoryItem: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.productVariant.count({ where });

    const data = await Promise.all(variants.map(async (v) => {
      const inv = v.inventoryItem;
      const qty = inv?.quantity ?? v.quantity;
      const reserved = inv?.reservedQty ?? 0;
      const sellable = Math.max(0, qty - reserved);
      const threshold = inv?.lowStockThreshold ?? 5;
      const isLowStock = qty > 0 && (qty <= threshold);
      const isOutOfStock = qty === 0;

      let imageUrl: string | null = null;
      if (v.featuredImage) {
        imageUrl = await signImageUrl(v.featuredImage);
      }

      return {
        id: v.id,
        variantId: v.id,
        sku: v.sku ?? '—',
        name: (v.name ?? `${v.color ?? ''} ${v.size ?? ''}`.trim()) || 'Variant',
        productName: v.product.name,
        productId: v.product.id,
        color: v.color,
        size: v.size,
        price: v.price,
        imageUrl,
        quantity: qty,
        reservedQty: reserved,
        sellable,
        lowStockThreshold: threshold,
        isLowStock,
        isOutOfStock,
        stockStatus: isOutOfStock ? 'outofstock' : isLowStock ? 'lowstock' : 'instock',
      };
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  // ─── KPI Stats ───────────────────────────────────────────────────────────────
  async getStats() {
    const [totalVariants, inventoryItems] = await Promise.all([
      prisma.productVariant.count(),
      prisma.inventoryItem.findMany({
        select: { quantity: true, reservedQty: true, lowStockThreshold: true },
      }),
    ]);

    // For variants with no InventoryItem yet, fall back to ProductVariant.quantity
    const variantsWithoutInv = await prisma.productVariant.findMany({
      where: { inventoryItem: null },
      select: { quantity: true, price: true },
    });

    const invQuantities = inventoryItems.map(i => ({
      qty: i.quantity,
      threshold: i.lowStockThreshold,
    }));

    const lowStockCount = inventoryItems.filter(i => i.quantity > 0 && i.quantity <= i.lowStockThreshold).length;
    const outOfStockCount = inventoryItems.filter(i => i.quantity === 0).length
      + variantsWithoutInv.filter(v => v.quantity === 0).length;

    const totalQty = inventoryItems.reduce((s, i) => s + i.quantity, 0)
      + variantsWithoutInv.reduce((s, v) => s + v.quantity, 0);

    // Rough value: sum of qty * price for all variants
    const allVariants = await prisma.productVariant.findMany({
      select: { quantity: true, price: true },
    });
    const estimatedValue = allVariants.reduce((s, v) => s + v.quantity * v.price, 0);

    return {
      totalItems: totalQty,
      lowStockCount,
      outOfStockCount,
      estimatedValue,
      totalSKUs: totalVariants,
    };
  },

  // ─── Transactions ─────────────────────────────────────────────────────────────
  async getTransactions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        include: {
          variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryTransaction.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  // ─── Adjust Stock ─────────────────────────────────────────────────────────────
  async adjustStock(data: {
    variantId: string;
    type: 'RECEIVE' | 'DEDUCT';
    quantity: number;
    reason?: string;
    reference?: string;
  }) {
    const { variantId, type, quantity, reason, reference } = data;
    const delta = type === 'RECEIVE' ? Math.abs(quantity) : -Math.abs(quantity);

    // Upsert InventoryItem
    const inv = await prisma.inventoryItem.upsert({
      where: { variantId },
      create: { variantId, quantity: Math.max(0, delta) },
      update: { quantity: { increment: delta } },
    });

    // Also keep ProductVariant.quantity in sync
    await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        quantity: { increment: delta },
        stockStatus: inv.quantity <= 0 ? 'outofstock' : inv.quantity <= inv.lowStockThreshold ? 'lowstock' : 'instock',
      },
    });

    // Log transaction
    const tx = await prisma.inventoryTransaction.create({
      data: {
        variantId,
        type,
        quantityChange: delta,
        reason,
        reference,
      },
    });

    return { inventoryItem: inv, transaction: tx };
  },

  // ─── Transfers ────────────────────────────────────────────────────────────────
  async getTransfers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        include: {
          variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockTransfer.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  async createTransfer(data: {
    variantId: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
    requestedBy?: string;
    notes?: string;
  }) {
    return prisma.stockTransfer.create({ data });
  },

  async updateTransferStatus(id: string, status: string) {
    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: { status },
    });

    // When received — deduct from source, add to destination (using transactions)
    if (status === 'Received') {
      await this.adjustStock({
        variantId: transfer.variantId,
        type: 'DEDUCT',
        quantity: transfer.quantity,
        reason: `Transfer to ${transfer.toLocation}`,
        reference: transfer.id,
      });
      // Note: In a real multi-branch system, we'd credit the destination branch's stock here.
      // For now we log as TRANSFER_OUT since we have global stock.
      await prisma.inventoryTransaction.create({
        data: {
          variantId: transfer.variantId,
          type: 'TRANSFER_OUT',
          quantityChange: -transfer.quantity,
          reason: `${transfer.fromLocation} → ${transfer.toLocation}`,
          reference: transfer.id,
        },
      });
    }

    return transfer;
  },
};
