import axios from 'axios';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

async function run() {
  const apiUrl = "https://www.fdedomestic.com/api/parcel";
  const apiKey = "7ec55dd3b431498b3f1a";
  const clientId = "3880";

  // Find a recent order
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { customer: true, items: true }
  });

  if (!order) {
    console.log("No orders found");
    return;
  }
  
  console.log("Found Order:", order.orderNumber);

  const shipping = order.shippingAddress as any;
  
  const data = new URLSearchParams();
  data.append('client_id', clientId);
  data.append('api_key', apiKey);
  data.append('client_ref', order.orderNumber);
  data.append('parcel_weight', '1.0');
  data.append('parcel_description', `Order ${order.orderNumber}`);
  data.append('recipient_name', shipping.fullName || `${order.customer.firstName} ${order.customer.lastName}`);
  data.append('recipient_phone', shipping.phone || order.customer.phone);
  
  data.append('recipient_address_1', shipping.addressLine1 || '');
  data.append('recipient_address_2', shipping.addressLine2 || '');
  data.append('recipient_address_3', shipping.addressLine3 || '');
  
  data.append('recipient_district', shipping.district || '');
  data.append('recipient_city', shipping.city || '');
  data.append('amount', order.total.toString());
  data.append('exchange', '0');

  console.log("FARDAR REQUEST PAYLOAD:", Object.fromEntries(data.entries()));

  try {
    const res = await axios.post(`${apiUrl}/new_api_v1.php`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log("FARDAR RESPONSE:", res.data);
  } catch (err: any) {
    console.error("FARDAR ERROR:", err.response?.data || err.message);
  }
}
run();
