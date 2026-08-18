import prisma from '../config/prisma';
import { signImageUrl } from './product.service';

export const inventoryService = {

  // ─── Branches ────────────────────────────────────────────────────────────────
  async getBranches() {
    return prisma.branch.findMany({
      orderBy: { name: 'asc' }
    });
  },

  async createBranch(data: { name: string, code: string, address?: string, phone?: string, type?: string }) {
    return prisma.branch.create({ data });
  },

  // ─── Stock Levels ────────────────────────────────────────────────────────────
  async getInventory(search?: string, branchId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (search) {
      where.variant = {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ]
      };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        variant: { include: { product: true } },
        branch: true
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.inventoryItem.count({ where });

    const data = await Promise.all(items.map(async (inv: any) => {
      const v = inv.variant;
      const qty = inv.quantity;
      const reserved = inv.reservedQty;
      const sellable = Math.max(0, qty - reserved);
      const threshold = inv.lowStockThreshold;
      const isLowStock = qty > 0 && (qty <= threshold);
      const isOutOfStock = qty === 0;

      let imageUrl: string | null = null;
      if (v.featuredImage) {
        imageUrl = await signImageUrl(v.featuredImage);
      }

      return {
        id: inv.id,
        variantId: v.id,
        branchId: inv.branchId,
        branchName: inv.branch.name,
        sku: v.sku ?? '—',
        name: (v.name ?? `${v.color ?? ''} ${v.size ?? ''}`.trim()) || 'Variant',
        productName: v.product.name,
        productId: v.product.id,
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
  async getStats(branchId?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;

    const [inventoryItems, totalVariants] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        select: { quantity: true, reservedQty: true, lowStockThreshold: true, variant: { select: { price: true } } },
      }),
      prisma.productVariant.count(),
    ]);

    const lowStockCount = inventoryItems.filter((i: any) => i.quantity > 0 && i.quantity <= i.lowStockThreshold).length;
    const outOfStockCount = inventoryItems.filter((i: any) => i.quantity === 0).length;
    const totalQty = inventoryItems.reduce((s: any, i: any) => s + i.quantity, 0);
    const estimatedValue = inventoryItems.reduce((s: any, i: any) => s + (i.quantity * i.variant.price), 0);

    return {
      totalItems: totalQty,
      lowStockCount,
      outOfStockCount,
      estimatedValue,
      totalSKUs: totalVariants, // Total catalog SKUs, regardless of stock
    };
  },

  // ─── Adjust Stock ─────────────────────────────────────────────────────────────
  async adjustStock(data: {
    variantId: string;
    branchId: string;
    type: 'RECEIVE' | 'DEDUCT';
    quantity: number;
    reason?: string;
    reference?: string;
  }) {
    const { variantId, branchId, type, quantity, reason, reference } = data;
    const delta = type === 'RECEIVE' ? Math.abs(quantity) : -Math.abs(quantity);

    const inv = await prisma.inventoryItem.upsert({
      where: { variantId_branchId: { variantId, branchId } },
      create: { variantId, branchId, quantity: Math.max(0, delta) },
      update: { quantity: { increment: delta } },
    });

    // We no longer sync ProductVariant.quantity, because inventory is branch-specific.
    // If needed, we'd sum all branch quantities.

    const tx = await prisma.inventoryTransaction.create({
      data: {
        variantId,
        branchId,
        type,
        quantityChange: delta,
        reason,
        reference,
      },
    });

    return { inventoryItem: inv, transaction: tx };
  },

  // ─── Reservations ─────────────────────────────────────────────────────────────
  async reserveStock(data: { variantId: string; branchId: string; quantity: number; orderId: string }) {
    const { variantId, branchId, quantity, orderId } = data;
    const inv = await prisma.inventoryItem.findUnique({
      where: { variantId_branchId: { variantId, branchId } }
    });

    if (!inv || (inv.quantity - inv.reservedQty < quantity)) {
      throw new Error('Insufficient sellable stock to reserve');
    }

    const updated = await prisma.inventoryItem.update({
      where: { id: inv.id },
      data: { reservedQty: { increment: quantity } }
    });

    await prisma.inventoryTransaction.create({
      data: { variantId, branchId, type: 'RESERVE', quantityChange: 0, reason: 'Order Reservation', reference: orderId }
    });

    return updated;
  },

  async releaseStock(data: { variantId: string; branchId: string; quantity: number; orderId: string }) {
    const { variantId, branchId, quantity, orderId } = data;
    const inv = await prisma.inventoryItem.findUnique({
      where: { variantId_branchId: { variantId, branchId } }
    });

    if (!inv) return null;

    const releaseQty = Math.min(inv.reservedQty, quantity);

    const updated = await prisma.inventoryItem.update({
      where: { id: inv.id },
      data: { reservedQty: { decrement: releaseQty } }
    });

    await prisma.inventoryTransaction.create({
      data: { variantId, branchId, type: 'RELEASE', quantityChange: 0, reason: 'Reservation Released', reference: orderId }
    });

    return updated;
  },

  // ─── Transactions ─────────────────────────────────────────────────────────────
  async getTransactions(branchId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (branchId) where.branchId = branchId;

    const [data, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        include: {
          variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
          branch: { select: { name: true } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  // ─── Transfers ────────────────────────────────────────────────────────────────
  async getTransfers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        include: {
          fromBranch: true,
          toBranch: true,
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
    fromBranchId: string;
    toBranchId: string;
    quantity: number;
    requestedBy?: string;
    notes?: string;
  }) {
    // Validate source branch has enough stock
    const sourceItem = await prisma.inventoryItem.findUnique({
      where: { variantId_branchId: { variantId: data.variantId, branchId: data.fromBranchId } }
    });

    if (!sourceItem || sourceItem.quantity < data.quantity) {
      throw new Error('Insufficient stock in source branch');
    }

    return prisma.stockTransfer.create({ data: { ...data, status: 'PENDING' } });
  },

  async updateTransferStatus(id: string, status: string) {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id } });
    if (!transfer) throw new Error('Transfer not found');

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: { status },
    });

    if (status === 'DISPATCHED' && transfer.status !== 'DISPATCHED') {
      await this.adjustStock({
        variantId: transfer.variantId,
        branchId: transfer.fromBranchId,
        type: 'DEDUCT',
        quantity: transfer.quantity,
        reason: 'Transfer Dispatch',
        reference: transfer.id,
      });
      await prisma.inventoryTransaction.create({
        data: {
          variantId: transfer.variantId,
          branchId: transfer.fromBranchId,
          type: 'TRANSFER_OUT',
          quantityChange: -transfer.quantity,
          reason: 'Transfer Dispatched',
          reference: transfer.id,
        },
      });
    }

    if (status === 'RECEIVED' && transfer.status !== 'RECEIVED') {
      await this.adjustStock({
        variantId: transfer.variantId,
        branchId: transfer.toBranchId,
        type: 'RECEIVE',
        quantity: transfer.quantity,
        reason: 'Transfer Receive',
        reference: transfer.id,
      });
      await prisma.inventoryTransaction.create({
        data: {
          variantId: transfer.variantId,
          branchId: transfer.toBranchId,
          type: 'TRANSFER_IN',
          quantityChange: transfer.quantity,
          reason: 'Transfer Received',
          reference: transfer.id,
        },
      });
    }

    return updated;
  },

};
