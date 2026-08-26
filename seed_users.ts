import prisma from './src/config/prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  const usersToSeed = [
    { email: 'superadmin@laural.com', role: 'Super Admin', name: 'Super Admin' },
    { email: 'branchadmin@laural.com', role: 'Branch Admin', name: 'Branch Admin' },
    { email: 'cashier@laural.com', role: 'Cashier', name: 'Cashier' },
    { email: 'onlinesales@laural.com', role: 'Customer Support', name: 'Online Sales' },
  ];

  const password = await bcrypt.hash('Password123!', 10);

  for (const u of usersToSeed) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const role = await prisma.role.findUnique({ where: { name: u.role } });
      if (role) {
        await prisma.user.create({
          data: {
            email: u.email,
            password: password,
            name: u.name,
            phone: '+94700000000',
            status: 'ACTIVE',
            userRoles: {
              create: {
                roleId: role.id
              }
            }
          }
        });
        console.log(`Created ${u.email} with role ${u.role}`);
      } else {
        console.log(`Role ${u.role} not found for ${u.email}`);
      }
    } else {
      console.log(`User ${u.email} already exists. Updating password.`);
      await prisma.user.update({
        where: { email: u.email },
        data: { password }
      });
    }
  }
}

seed().then(() => {
  console.log('Seeding complete.');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
