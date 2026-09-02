import prisma from "../src/config/prisma";

async function main() {
  console.log("Starting patch for orphaned users...");

  // 1. Get the PUBLIC_USER role ID
  const publicRole = await prisma.role.findFirst({
    where: { name: "PUBLIC_USER" },
  });

  if (!publicRole) {
    throw new Error("PUBLIC_USER role not found in the database.");
  }

  // 2. Find all users with no roles
  const orphanedUsers = await prisma.user.findMany({
    where: {
      userRoles: {
        none: {}
      }
    }
  });

  console.log(`Found ${orphanedUsers.length} users with no assigned roles.`);

  let patchedCount = 0;

  // 3. Assign the PUBLIC_USER role to each orphaned user
  for (const user of orphanedUsers) {
    try {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: publicRole.id,
        }
      });
      patchedCount++;
    } catch (err) {
      console.error(`Failed to assign role to user ${user.id}:`, err);
    }
  }

  console.log(`Successfully patched ${patchedCount} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
