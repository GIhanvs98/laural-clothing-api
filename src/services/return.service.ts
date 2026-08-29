import prisma from '../config/prisma';

export const returnService = {
  verifyOrderForReturn: async (orderNumber: string, email: string) => {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: true,
        items: {
          include: {
            variant: {
              include: { product: true }
            },
            returnItems: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found.');
    }

    if (order.customer?.email !== email) {
      throw new Error('Order email does not match.');
    }

    // Filter out items that have already been fully returned
    const returnableItems = order.items.filter(item => {
      const alreadyReturnedQty = item.returnItems.reduce((acc, r) => acc + r.quantity, 0);
      return alreadyReturnedQty < item.quantity;
    }).map(item => {
      const alreadyReturnedQty = item.returnItems.reduce((acc, r) => acc + r.quantity, 0);
      return {
        id: item.id,
        quantity: item.quantity - alreadyReturnedQty,
        priceAtPurchase: item.priceAtPurchase,
        variant: {
          id: item.variant.id,
          name: item.variant.name,
          featuredImage: item.variant.featuredImage,
          product: {
            name: item.variant.product.name
          }
        }
      };
    });

    if (returnableItems.length === 0) {
      throw new Error('No items available to return for this order.');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      date: order.createdAt,
      items: returnableItems
    };
  },

  createReturn: async (orderId: string, items: { orderItemId: string, quantity: number, reason: string, details?: string }[]) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!order) throw new Error("Order not found");

    // Generate unique RMA
    const count = await prisma.returnRequest.count();
    const rmaId = `RET-${10000 + count + 1}`;

    // Calculate initial refund amount based on items
    let totalRefund = 0;
    for (const item of items) {
      const orderItem = await prisma.orderItem.findUnique({ where: { id: item.orderItemId }});
      if (orderItem) {
        totalRefund += orderItem.priceAtPurchase * item.quantity;
      }
    }

    const returnRequest = await prisma.returnRequest.create({
      data: {
        rmaId,
        orderId: order.id,
        customerId: order.customerId,
        reason: items[0]?.reason || 'Customer Return',
        customerNote: items[0]?.details || '',
        refundAmount: totalRefund,
        status: 'REQUESTED',
        items: {
          create: items.map(item => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          }))
        }
      },
      include: {
        items: true
      }
    });

    return returnRequest;
  },

  getReturns: async (page: number, limit: number, search?: string, status?: string, customerId?: string) => {
    const skip = (page - 1) * limit;

    let whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    
    if (customerId) {
      whereClause.customerId = customerId;
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
  },

  bulkUpdateReturnStatus: async (resolutions: Record<string, { condition: string; action: string }>) => {
    const results = [];
    for (const [id, resolution] of Object.entries(resolutions)) {
      const returnRequest = await prisma.returnRequest.findUnique({
        where: { id },
        include: { items: true }
      });
      
      if (!returnRequest) continue;
      
      let finalStatus = 'RECEIVED';
      if (resolution.action === 'REJECT') finalStatus = 'REJECTED';
      else if (resolution.action === 'APPROVE_STORE_CREDIT' || resolution.action === 'APPROVE_ORIGINAL') {
        finalStatus = 'REFUNDED';
      }

      const itemsToUpdate = returnRequest.items.map(i => ({
        id: i.id,
        condition: resolution.condition,
        inspectionStatus: resolution.condition
      }));
      
      // Also update admin note
      await prisma.returnRequest.update({
        where: { id },
        data: { adminNote: `Resolution: ${resolution.action}` }
      });

      const updated = await returnService.updateReturnStatus(id, finalStatus, itemsToUpdate);
      results.push(updated);
    }
    return results;
  }
};
