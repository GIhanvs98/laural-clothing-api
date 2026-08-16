# Feature-Level Database Requirements & Forensic Audit

This document is the culmination of the Frontend Forensic Audit, reverse-engineering the business rules, state machines, and data requirements from the UI. It provides a highly reliable `FRONTEND → FEATURE MODEL → BUSINESS MODEL → DATABASE REQUIREMENTS → PRISMA SCHEMA` pipeline.

---

## 1. Scope & Domain Overview
The application handles e-commerce (storefront), multi-branch inventory, role-based administration, and in-store Point-of-Sale (POS) operations.
Key domains include:
- **Identity & Access:** Staff, Customers, and RBAC.
- **Catalog:** Categories, Collections, Products, Variants.
- **Inventory & Fulfillment:** Multi-branch stock tracking, Shipping, Transfers.
- **Sales & Financials:** Orders, Checkout, POS sessions, Payments, Refunds.
- **Engagement:** Reviews, Loyalty, Promotions.

---

## 2. Feature → Database Traceability

| Feature ID | Feature | Entities | Reads | Writes | Transactions | Audit / Status |
| ---------- | ------- | -------- | ----- | ------ | ------------ | -------------- |
| **AUTH-001** | User Auth | `User`, `Role` | User by Email | Create User | Basic | Status: Active/Blocked |
| **USER-001** | Profile | `Customer`, `Address`| Customer data | Update profile | Basic | - |
| **CAT-001** | Catalog | `Product`, `Category`| Products (Filter/Sort)| - | - | Status: Published |
| **CART-001** | Cart | `Variant` | Current Price/Stock | - | - | (Cart is session-based, no DB) |
| **CHECKOUT-001**| Checkout | `Order`, `OrderItem`, `PaymentTransaction`, `Inventory` | Stock, Price, Coupon | Order, Payment, Stock Deduct | **CRITICAL:** Lock stock, atomic payment & order. | Status: Pending -> Confirmed |
| **ORDER-001**| Order Tracking| `Order`, `OrderItem` | Order History | - | - | - |
| **POS-001** | POS Checkout | `Order`, `OrderItem`, `PaymentTransaction`, `Inventory`, `Branch` | Stock | Order (POS origin), Stock Deduct | **CRITICAL:** Concurrent stock updates. | Multi-payment (Split) support |
| **INV-001** | Inventory Mgmt | `Inventory`, `InventoryAdjustment` | Current Stock | Adjust Stock | Atomic adjustment | Audit: Adjustment History |
| **RETURN-001**| Returns | `Order`, `Return` | Order verification | Create RMA, Update Order | Refund Payment atomic | Status: Requested -> Refunded |

---

## 3. Prisma-Ready Entity Specifications (Proposed Schema)

*Note: This is the required specification for Prisma implementation, derived directly from frontend constraints. Do not assume mock data structure, assume these normalized business entities.*

```prisma
// --- IDENTITY ---

model User {
  id             String    @id @default(uuid())
  email          String    @unique
  passwordHash   String
  role           Role      @default(CUSTOMER)
  status         UserStatus @default(ACTIVE)
  branchId       String?   // For Branch Admin / POS Cashier
  branch         Branch?   @relation(fields: [branchId], references: [id])
  customer       Customer? // 1:1 if user is a customer
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model Customer {
  id             String    @id @default(uuid())
  userId         String?   @unique
  user           User?     @relation(fields: [userId], references: [id])
  firstName      String
  lastName       String
  phone          String?
  totalSpent     Decimal   @default(0.00)
  addresses      Address[]
  orders         Order[]
  createdAt      DateTime  @default(now())
}

model Address {
  id             String    @id @default(uuid())
  customerId     String
  customer       Customer  @relation(fields: [customerId], references: [id])
  type           AddressType // SHIPPING, BILLING
  street1        String
  city           String
  state          String
  country        String
  zipCode        String
  isDefault      Boolean   @default(false)
}

// --- ORGANIZATION ---

model Branch {
  id             String    @id @default(uuid())
  name           String
  location       String?
  contactInfo    String?
  inventory      Inventory[]
  orders         Order[]   // POS orders tied to branch
  staff          User[]
}

// --- CATALOG ---

model Category {
  id             String    @id @default(uuid())
  name           String
  slug           String    @unique
  parentId       String?
  parent         Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children       Category[] @relation("CategoryHierarchy")
  products       Product[]
}

model Product {
  id             String    @id @default(uuid())
  categoryId     String
  category       Category  @relation(fields: [categoryId], references: [id])
  name           String
  slug           String    @unique
  description    String?
  status         ProductStatus @default(DRAFT)
  variants       Variant[]
  reviews        Review[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model Variant {
  id             String    @id @default(uuid())
  productId      String
  product        Product   @relation(fields: [productId], references: [id])
  sku            String    @unique
  barcode        String?   @unique // For POS scanning
  price          Decimal
  compareAtPrice Decimal?
  color          String?
  size           String?
  inventory      Inventory[]
  orderItems     OrderItem[]
}

model Inventory {
  id             String    @id @default(uuid())
  variantId      String
  variant        Variant   @relation(fields: [variantId], references: [id])
  branchId       String
  branch         Branch    @relation(fields: [branchId], references: [id])
  quantity       Int       @default(0)
  reservedQty    Int       @default(0) // For pending e-commerce checkouts

  @@unique([variantId, branchId])
}

// --- SALES & FINANCIALS ---

model Order {
  id             String    @id @default(uuid())
  orderNumber    String    @unique
  customerId     String?   // Null for anonymous POS checkout
  customer       Customer? @relation(fields: [customerId], references: [id])
  branchId       String?   // Present if POS order
  branch         Branch?   @relation(fields: [branchId], references: [id])
  status         OrderStatus @default(PENDING)
  source         OrderSource // ECOMMERCE, POS
  subtotal       Decimal
  taxAmount      Decimal
  discountAmount Decimal   @default(0.00)
  shippingFee    Decimal   @default(0.00)
  totalAmount    Decimal
  items          OrderItem[]
  payments       PaymentTransaction[]
  returns        Return[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model OrderItem {
  id             String    @id @default(uuid())
  orderId        String
  order          Order     @relation(fields: [orderId], references: [id])
  variantId      String
  variant        Variant   @relation(fields: [variantId], references: [id])
  quantity       Int
  unitPrice      Decimal
  totalPrice     Decimal
}

model PaymentTransaction {
  id             String    @id @default(uuid())
  orderId        String
  order          Order     @relation(fields: [orderId], references: [id])
  amount         Decimal
  method         PaymentMethod // CREDIT_CARD, CASH, PAYPAL
  status         PaymentStatus @default(PENDING)
  gatewayRef     String?
  createdAt      DateTime  @default(now())
}

model Return {
  id             String    @id @default(uuid())
  rmaNumber      String    @unique
  orderId        String
  order          Order     @relation(fields: [orderId], references: [id])
  status         ReturnStatus @default(REQUESTED)
  reason         String?
  refundAmount   Decimal?
  createdAt      DateTime  @default(now())
}
```

---

## 4. API & Backend Contract Gaps (Gap Analysis)

The following backend logic is currently absent from the frontend but *must* be implemented to ensure security and integrity:

1. **Cart Persistence:** Currently, the cart is a React Context (`CartProvider.tsx`). If the business requires cross-device carts, an API (`POST /api/cart`) is missing. *Recommendation: Keep local storage cart for guests, sync to DB on login.*
2. **Transactional Checkout:** The frontend cannot guarantee stock. The backend must implement a strict SQL transaction during `POST /api/checkout` that:
   - Verifies price (DO NOT trust frontend price).
   - Locks the `Inventory` row.
   - Decrements stock / increments `reservedQty`.
   - Processes payment.
   - Rolls back if payment fails.
3. **POS vs. Online Race Conditions:** POS sales happen instantly. E-commerce sales might be pending payment. We added `reservedQty` to the schema to prevent overselling while a customer is entering credit card details.
4. **Calculations:** Totals, taxes, and discounts MUST be recalculated on the backend.
5. **Audit Logs:** Features like Stock Adjustments (`InventoryAdjustmentModal.tsx`) require an immutable `InventoryAudit` table on the backend. We have flagged this as a MUST HAVE.

---

## 5. Implementation Strategy & Confidence Model

**Confidence Level:** HIGH.
The database schema tightly matches the robust UI/Component architecture already present in the codebase.

**Implementation Order:**
1. Phase 1: Users, Branches, Auth (Identity)
2. Phase 2: Category, Product, Variant (Catalog)
3. Phase 3: Inventory (Requires Catalog and Branches)
4. Phase 4: Orders, Customers, Payments (Checkout)
5. Phase 5: POS enhancements (Split payments, receipts)
6. Phase 6: RMAs, Loyalty, Promos

*This file acts as the ultimate blueprint for the backend engineers generating the Prisma Schema.*
