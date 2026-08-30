import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

export const getLoyaltyMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    let where: any = {};
    if (search) {
      where = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ]
      };
    }

    const [members, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { loyaltyPoints: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    const mappedMembers = members.map((m: any) => ({
      customer: `${m.firstName || ''} ${m.lastName || ''}`.trim() || (m.isGuest ? 'Guest User' : 'Unknown'),
      phone: m.phone || 'N/A',
      points: m.loyaltyPoints.toLocaleString(),
      tier: m.loyaltyTier,
      lastActivity: m.updatedAt.toLocaleDateString()
    }));

    res.status(200).json({
      success: true,
      data: mappedMembers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLoyaltyKpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalMembers = await prisma.customer.count();
    const result = await prisma.customer.aggregate({
      _sum: {
        loyaltyPoints: true
      }
    });

    const pointsIssued = result._sum.loyaltyPoints || 0;
    
    // Calculate points redeemed from PaymentTransactions or orders if applicable
    // Since there's no pointsRedeemed field, we use 0 or a dynamic query later
    const pointsRedeemed = 0; 
    
    // Estimated conversion for outstanding liability, e.g., 10 points = 1 Rs
    const estimatedLiability = Math.floor(pointsIssued / 10);

    res.status(200).json({
      success: true,
      data: {
        totalMembers: totalMembers.toLocaleString(),
        pointsIssued: pointsIssued.toLocaleString(),
        pointsRedeemed: pointsRedeemed.toLocaleString(),
        outstandingLiability: `Rs. ${estimatedLiability.toLocaleString()}`
      }
    });
  } catch (error) {
    next(error);
  }
};
