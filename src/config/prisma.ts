import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { requestContext } from '../context/RequestContext';
import { logger } from '../utils/logger';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ 
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

basePrisma.$on('query' as never, (e: any) => {
  if (e.duration > 50) {
    logger.warn(`Slow Query [${e.duration}ms]: ${e.query}`);
  }
});

/**
 * Global Prisma Extension for Row-Level Security (RLS)
 * 
 * Intercepts every query. If there's an active AsyncLocalStorage context
 * (set by the rlsMiddleware), it wraps the query in a transaction that
 * injects the user session variables directly into PostgreSQL first.
 */
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const ctx = requestContext.getStore();
        
        // If there is no context (e.g., background job, startup), run normally
        if (!ctx) {
          return query(args);
        }

        const isAdmin = ctx.isAdmin || false;
        const currentUserId = ctx.userId || '';
        const currentRole = ctx.role || 'GUEST';

        // Wrap the actual query in a transaction to safely set the session variables
        const [, result] = await basePrisma.$transaction([
          basePrisma.$executeRaw`
            SELECT set_config('app.current_user_id', ${currentUserId}, true),
                   set_config('app.current_role', ${currentRole}, true),
                   set_config('app.is_admin', ${isAdmin.toString()}, true)
          `,
          query(args),
        ]);
        
        return result;
      },
    },
  },
});

export default prisma;
