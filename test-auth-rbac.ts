import { AuthService } from "./src/services/auth.service";
import { RoleService } from "./src/services/role.service";
import { verifyAccessToken } from "./src/utils/jwt";
import prisma from "./src/config/prisma";

async function runTests() {
  console.log("=== Starting JWT & RBAC Backend Verification Tests ===");

  try {
    // 1. Seed Roles & Permissions
    console.log("\n[1] Seeding default roles and permissions...");
    await RoleService.seedDefaultRolesAndPermissions();
    console.log("✓ Seeding complete.");

    // 2. Register Public User
    const testEmail = `customer_${Date.now()}@example.com`;
    console.log(`\n[2] Registering test public user: ${testEmail}...`);
    const regResult = await AuthService.registerPublicUser({
      email: testEmail,
      password: "CustomerSecret123!",
      fullName: "Test Customer",
      birthday: "1995-05-15",
      phone: "+94712345678",
    });

    console.log("✓ Registration successful!");
    console.log("User:", {
      id: regResult.user.id,
      email: regResult.user.email,
      name: regResult.user.name,
      birthday: regResult.user.birthday,
      roles: regResult.user.roles,
    });

    if (!regResult.user.roles.includes("PUBLIC_USER") && !regResult.user.roles.includes("Public User")) {
      throw new Error("Expected user to have PUBLIC_USER role!");
    }

    // 3. Verify JWT Access Token
    console.log("\n[3] Verifying JWT token payload...");
    const decoded = verifyAccessToken(regResult.accessToken);
    console.log("✓ Token decoded successfully:", {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
    });

    // 4. Login User
    console.log("\n[4] Testing Login...");
    const loginResult = await AuthService.loginUser({
      email: testEmail,
      password: "CustomerSecret123!",
    });
    console.log("✓ Login successful, received access token and refresh token.");

    // 5. Test Refresh Token
    console.log("\n[5] Testing Refresh Token...");
    const refreshResult = await AuthService.refreshAccessToken(loginResult.refreshToken);
    console.log("✓ Refresh token exchange successful!");

    // 6. Super Admin Login
    console.log("\n[6] Testing Super Admin Login...");
    const adminLogin = await AuthService.loginUser({
      email: "admin@laural.lk",
      password: "Admin@123456",
    });
    console.log("✓ Super admin login successful:", {
      roles: adminLogin.user.roles,
      permissionsCount: adminLogin.user.permissions.length,
    });

    // 7. Role Management: Create Custom Role
    console.log("\n[7] Testing Custom Role Creation...");
    const customRoleName = `Custom Manager ${Date.now()}`;
    const customRole = await RoleService.createRole({
      name: customRoleName,
      description: "Custom test role with specific permissions",
      status: "Active",
      permissionCodes: ["orders:view", "products:view", "inventory:view_stock"],
    });
    console.log("✓ Custom role created:", {
      id: customRole.id,
      name: customRole.name,
      permissions: customRole.permissions,
    });

    // 8. Fetch all roles
    console.log("\n[8] Fetching all roles with counts...");
    const allRoles = await RoleService.getAllRoles();
    console.log(`✓ Fetched ${allRoles.length} roles.`);

    // 9. Clean up test custom role and test user
    console.log("\n[9] Cleaning up test records...");
    await RoleService.deleteRole(customRole.id);
    await prisma.refreshToken.deleteMany({ where: { userId: regResult.user.id } });
    await prisma.userRole.deleteMany({ where: { userId: regResult.user.id } });
    await prisma.user.delete({ where: { id: regResult.user.id } });
    console.log("✓ Cleaned up test records.");

    console.log("\n==========================================");
    console.log("🎉 ALL JWT & RBAC BACKEND TESTS PASSED!");
    console.log("==========================================");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
