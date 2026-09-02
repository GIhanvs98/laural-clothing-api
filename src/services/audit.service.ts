import prisma from '../config/prisma';

export const auditService = {
  createLog: async (data: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    oldData?: any;
    newData?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) => {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          oldData: data.oldData ? JSON.parse(JSON.stringify(data.oldData)) : undefined,
          newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : undefined,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (error) {
      console.error('[Audit Log Error]: Failed to create audit log', error);
      return null;
    }
  },

  getLogs: async (search?: string, action?: string, timeframe?: string, page: number = 1, limit: number = 50) => {
    const where: any = {};
    
    if (action && action !== 'All Actions') {
      where.action = action;
    }
    
    if (timeframe) {
      const now = new Date();
      if (timeframe === 'Last 24 Hours') {
        where.createdAt = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      } else if (timeframe === 'Last 7 Days') {
        where.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (timeframe === 'Last 30 Days') {
        where.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }
    
    if (search) {
      where.OR = [
        { userId: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true, email: true } } }
      }),
      prisma.auditLog.count({ where })
    ]);
    
    // Map logs to return user name if available
    const mappedLogs = logs.map(log => ({
      ...log,
      userName: log.user?.name || log.user?.email || 'System'
    }));
    
    return {
      data: mappedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};
