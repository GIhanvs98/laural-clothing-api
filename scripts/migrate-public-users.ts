import prisma from "../src/config/prisma";

async function main() {
  console.log("Starting migration of PUBLIC_USER to Customer...");

  // 1. Fetch all users who have the PUBLIC_USER role
  const publicUsers = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            name: "PUBLIC_USER"
          }
        }
      }
    }
  });

  console.log(`Found ${publicUsers.length} users with PUBLIC_USER role.`);

  let createdCount = 0;
  let updatedCount = 0;

  // 2. Upsert each user into the Customer table
  for (const user of publicUsers) {
    const firstName = user.name ? user.name.split(' ')[0] : 'Unknown';
    const lastName = user.name ? user.name.split(' ').slice(1).join(' ') : '';
    const phone = user.phone || `0000000000-${user.id.substring(0, 5)}`; // Fallback for unique phone constraint

    try {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { email: user.email },
            { phone: user.phone || "" }
          ]
        }
      });

      if (existingCustomer) {
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName: existingCustomer.firstName || firstName,
            lastName: existingCustomer.lastName || lastName,
            isGuest: false,
          }
        });
        updatedCount++;
      } else {
        await prisma.customer.create({
          data: {
            email: user.email,
            phone,
            firstName,
            lastName,
            isGuest: false,
            loyaltyTier: "Bronze",
            loyaltyPoints: 0
          }
        });
        createdCount++;
      }
    } catch (err) {
      console.error(`Failed to migrate user ${user.email}:`, err);
    }
  }

  console.log(`Migration Complete. Created: ${createdCount}, Updated: ${updatedCount}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
