import cron from 'node-cron';
import prisma from '../config/prisma';
import { FardarService } from '../services/fardar.service';
import { OrderService } from '../services/order.service';

// Run every 6 hours
export const initFardarSync = () => {
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Cron] Starting Fardar status sync...');
    
    try {
      const dispatchedOrders = await prisma.order.findMany({
        where: {
          status: 'DISPATCHED',
          trackingNumber: {
            not: null
          }
        }
      });

      console.log(`[Cron] Found ${dispatchedOrders.length} dispatched orders to sync.`);

      for (const order of dispatchedOrders) {
        if (!order.trackingNumber) continue;

        try {
          const trackingDetails = await FardarService.trackShipment(order.trackingNumber);
          
          let newStatus = order.status;
          if (trackingDetails.status === 'DELIVERED') newStatus = 'DELIVERED';
          else if (trackingDetails.status === 'RETURNED') newStatus = 'CANCELLED'; 

          if (newStatus !== order.status) {
            console.log(`[Cron] Updating order ${order.id} status to ${newStatus}`);
            await OrderService.updateOrderStatus(order.id, newStatus);
          }
        } catch (e) {
          console.error(`[Cron] Failed to sync order ${order.id} (${order.trackingNumber}):`, e);
        }
      }

      console.log('[Cron] Fardar status sync completed.');
    } catch (error) {
      console.error('[Cron] Error running Fardar status sync:', error);
    }
  });
};
