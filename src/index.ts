import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import collectionRoutes from './routes/collection.routes';
import inventoryRoutes from './routes/inventory.routes';
import cartRoutes from './routes/cart.routes';
import checkoutRoutes from './routes/checkout.routes';
import wishlistRoutes from './routes/wishlist.routes';
import posRoutes from './routes/pos.routes';
import cmsRoutes from './routes/cms.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import prisma from './config/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import addressRoutes from './routes/address.routes';
import reportRoutes from './routes/report.routes';

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Commerce API is running' });
});

// Start Server
async function bootstrap() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('Successfully connected to the database.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database', error);
    process.exit(1);
  }
}

bootstrap();
