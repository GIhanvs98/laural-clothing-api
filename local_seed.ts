import prisma from './src/config/prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  const password = await bcrypt.hash('Password123!', 10);

  // 1. Create Role
  const role = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      isSystem: true,
      status: 'Active'
    }
  });

  // 2. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'superadmin@laural.com' },
    update: { password },
    create: {
      email: 'superadmin@laural.com',
      password,
      name: 'Super Admin',
      status: 'ACTIVE',
      userRoles: {
        create: {
          roleId: role.id
        }
      }
    }
  });
  console.log('Created Admin:', admin.email);

  // 3. Create Category
  const category = await prisma.category.upsert({
    where: { slug: 'sample-category' },
    update: {},
    create: {
      name: 'Sample Category',
      slug: 'sample-category',
      status: 'Active'
    }
  });

  // 4. Create Product
  const product = await prisma.product.upsert({
    where: { slug: 'sample-product' },
    update: {},
    create: {
      name: 'Sample Product',
      slug: 'sample-product',
      description: 'This is a test product',
      categoryId: category.id,
      status: 'ACTIVE',
      variants: {
        create: {
          price: 1500,
          quantity: 100,
          sku: 'SMPL-001',
          stockStatus: 'instock',
          name: 'Default'
        }
      }
    }
  });
  console.log('Created Product:', product.name);
}

seed().then(() => {
  console.log('Seeding complete.');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
