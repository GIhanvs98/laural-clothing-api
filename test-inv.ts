import { PrismaClient } from '@prisma/client';
import { productService } from './src/services/product.service';

const prisma = new PrismaClient();

async function test() {
  try {
    const branches = await prisma.branch.findMany();
    if (branches.length === 0) throw new Error("No branches found");
    const branchId = branches[0]!.id;

    // Test 1: Create a product with full sizes/colors
    console.log("Creating Product 1 (With Size/Color)...");
    const p1 = await productService.createProduct({
      name: "Test Shirt",
      basePrice: 1000,
      variants: {
        create: [
          {
            sku: "TS-M-BL",
            size: "M",
            color: "Blue",
            price: 1000,
            quantity: 50,
            inventoryItems: {
              create: [
                { branchId, quantity: 50 }
              ]
            }
          }
        ]
      }
    });
    console.log("P1 Variants:", p1.variants.map((v: any) => ({ sku: v.sku, size: v.size, qty: v.quantity })));
    
    // Test 2: Create a product with NO size/color (null/empty)
    console.log("\nCreating Product 2 (No Size/Color)...");
    const p2 = await productService.createProduct({
      name: "Test Mug",
      basePrice: 500,
      variants: {
        create: [
          {
            sku: "TM-01",
            price: 500,
            quantity: 20,
            inventoryItems: {
              create: [
                { branchId, quantity: 20 }
              ]
            }
          }
        ]
      }
    });
    console.log("P2 Variants:", p2.variants.map((v: any) => ({ sku: v.sku, size: v.size, qty: v.quantity })));
    
    const p1Inv = await prisma.inventoryItem.findMany({ where: { variantId: p1.variants![0]!.id }});
    console.log("P1 Inventory:", p1Inv);
    
    const p2Inv = await prisma.inventoryItem.findMany({ where: { variantId: p2.variants![0]!.id }});
    console.log("P2 Inventory:", p2Inv);

  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
