import prisma from '../src/config/prisma';

async function main() {
  const branches = [
    { name: 'Colombo Main Warehouse', code: 'W-CMB-01', address: '123 Main St, Colombo', phone: '0112345678', type: 'WAREHOUSE' },
    { name: 'Kandy Retail Store', code: 'R-KND-01', address: '45 Lake View, Kandy', phone: '0812345678', type: 'RETAIL' },
    { name: 'Galle Retail Store', code: 'R-GAL-01', address: '10 Fort Rd, Galle', phone: '0912345678', type: 'RETAIL' }
  ];

  for (const b of branches) {
    await prisma.branch.upsert({
      where: { code: b.code },
      update: {},
      create: b
    });
  }
  console.log('Seeded 3 dummy branches!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
