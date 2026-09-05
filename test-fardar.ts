import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  const orderId = 'c9dcf816-e01f-4ded-a3a1-e738612e0891';
  console.log('Fetching order:', orderId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true }
  });

  if (!order) {
    console.log('Order not found!');
    return;
  }

  const shippingAddress = order.shippingAddress as any;
  const details = {
    orderId: order.orderNumber,
    customerName: order.customer?.firstName ? `${order.customer.firstName} ${order.customer.lastName || ''}` : shippingAddress?.firstName + ' ' + (shippingAddress?.lastName || ''),
    customerPhone: order.customer?.phone || shippingAddress?.phone || 'Unknown',
    customerAddress: shippingAddress ? `${shippingAddress.addressLine1} ${shippingAddress.addressLine2 || ''}` : 'Unknown',
    city: shippingAddress?.city || 'Unknown',
    weightKg: 1.0,
    codAmount: order.paymentMethod === 'COD' ? order.total : 0
  };

  console.log('Fardar details:', details);

  const apiUrl = process.env.FARDAR_API_URL;
  const apiKey = process.env.FARDAR_API_KEY;
  const clientId = process.env.FARDAR_CLIENT_ID;

  if (!apiUrl || !apiKey) {
    console.log('Missing FARDAR_API_URL or FARDAR_API_KEY. It would use mock.');
    return;
  }

  try {
    const payload = {
      reference: details.orderId,
      recipient_name: details.customerName,
      recipient_phone: details.customerPhone,
      recipient_address: details.customerAddress,
      recipient_city: details.city,
      weight: details.weightKg || 1,
      cod_amount: details.codAmount || 0,
    };
    console.log('Sending payload:', payload);

    const response = await axios.post(
      `${apiUrl}/shipments`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Client-ID': clientId || '',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', response.data);
  } catch (error: any) {
    console.error('Fardar API Error Response:', error.response?.data || error.message);
  }
}

run().finally(() => prisma.$disconnect());
