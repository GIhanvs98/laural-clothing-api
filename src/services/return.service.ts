import prisma from '../config/prisma';

export const returnService = {
  getReturns: async (page: number, limit: number, search?: string, status?: string) => {
    const skip = (page - 1) * limit;

    let whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.OR = [
        { rmaId: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [total, returns] = await Promise.all([
      prisma.returnRequest.count({ where: whereClause }),
      prisma.returnRequest.findMany({
        where: whereClause,
        include: {
          customer: true,
          order: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
    ]);

    return {
      returns: returns.map(r => ({
        id: r.id,
        rmaId: r.rmaId,
        orderId: r.order.orderNumber,
        customer: r.customer ? `${r.customer.firstName} ${r.customer.lastName || ''}`.trim() : 'Unknown',
        date: r.createdAt.toISOString().split('T')[0],
        status: r.status,
        amount: r.refundAmount
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  getReturnById: async (id: string) => {
    const rma = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: true
                  }
                }
              }
            }
          }
        },
        items: {
          include: {
            orderItem: {
              include: {
                variant: {
                  include: {
                    product: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!rma) throw new Error('Return not found');

    // Calculate Customer LTV
    const customerOrders = await prisma.order.findMany({
      where: { customerId: rma.customerId || '' },
      select: { total: true }
    });
    const ltv = customerOrders.reduce((sum, o) => sum + o.total, 0);

    return { ...rma, customerLtv: ltv };
  },

  updateReturnStatus: async (id: string, status: string, items?: any[]) => {
    // 1. Update overall status
    const updated = await prisma.returnRequest.update({
      where: { id },
      data: { status }
    });

    // 2. If it's the inspection step, update items
    if (items && items.length > 0) {
      for (const item of items) {
        await prisma.returnItem.update({
          where: { id: item.id },
          data: {
            condition: item.condition,
            inspectionStatus: item.inspectionStatus
          }
        });
        
        // If restockable, create inventory transaction
        if (item.inspectionStatus === 'RESTOCKABLE') {
          const retItem = await prisma.returnItem.findUnique({
            where: { id: item.id },
            include: { orderItem: true }
          });
          
          if (retItem) {
            // Find default warehouse or online branch for return
            const branch = await prisma.branch.findFirst({
              where: { type: 'WAREHOUSE' }
            });
            
            if (branch) {
              await prisma.inventoryTransaction.create({
                data: {
                  variantId: retItem.orderItem.variantId,
                  branchId: branch.id,
                  type: 'RETURN',
                  quantityChange: retItem.quantity,
                  reason: 'Customer Return RMA',
                  reference: updated.rmaId
                }
              });
              
              // Also update InventoryItem count
              const invItem = await prisma.inventoryItem.findUnique({
                where: { variantId_branchId: { variantId: retItem.orderItem.variantId, branchId: branch.id } }
              });
              
              if (invItem) {
                await prisma.inventoryItem.update({
                  where: { id: invItem.id },
                  data: { quantity: { increment: retItem.quantity } }
                });
              } else {
                await prisma.inventoryItem.create({
                  data: {
                    variantId: retItem.orderItem.variantId,
                    branchId: branch.id,
                    quantity: retItem.quantity
                  }
                });
              }
            }
          }
        }
      }
    }

    // 3. If refunded, update order status
    if (status === 'REFUNDED') {
      await prisma.order.update({
        where: { id: updated.orderId },
        data: { paymentStatus: 'REFUNDED' }
      });
    }

    return updated;
  }
};
