# 1. Domain Entities

| Entity | Purpose | Evidence in Frontend | Required Attributes (Inferred) | Relationships | Confidence |
| ------ | ------- | -------------------- | ------------------------------ | ------------- | ---------- |
| **User** | System staff & customers | `/admin/system/users`, `/account` | id, email, passwordHash, role, status, branchId (optional) | 1:N Orders, 1:1 Profile, N:1 Branch | HIGH |
| **Customer** | End customer details | `/admin/customers` | id, userId (nullable), phone, totalSpent | 1:N Orders, 1:N Addresses | HIGH |
| **Branch** | Physical store location | `/admin/branches` | id, name, location, contactInfo | 1:N Inventory, 1:N Orders | HIGH |
| **Product**| Base product item | `/admin/products` | id, slug, name, description, categoryId | 1:N Variants, N:1 Category, 1:N Reviews | HIGH |
| **Variant**| Purchasable item variation| `components/pos/VariantSelectionModal.tsx` | id, productId, sku, barcode, price, compareAtPrice, color, size | N:1 Product, 1:N Inventory | HIGH |
| **Category**| Product taxonomy | `/admin/categories` | id, name, slug, parentId | 1:N Products, Self-referential Parent/Child | HIGH |
| **Inventory**| Stock tracking | `/admin/inventory` | id, variantId, branchId, quantity, reservedQty | N:1 Variant, N:1 Branch | HIGH |
| **Order** | E-commerce / POS purchase | `/admin/orders`, `/pos` | id, orderNumber, customerId, branchId (if POS), status, totals | 1:N OrderItems, 1:N Payments, N:1 Customer | HIGH |
| **OrderItem**| Line item in an order | `/admin/orders/[id]` | id, orderId, variantId, qty, unitPrice, discount | N:1 Order, N:1 Variant | HIGH |
| **PaymentTransaction**| Record of payment | `/admin/payments` | id, orderId, amount, method, status, gatewayRef | N:1 Order | HIGH |
| **Return(RMA)**| Product return/refund | `/admin/returns` | id, rmaNumber, orderId, status, refundAmount | N:1 Order | HIGH |
| **Review**| Customer product review | `/admin/reviews` | id, productId, customerId, rating, text, status | N:1 Product, N:1 Customer | HIGH |
| **Promotion**| Discount rules | `/admin/promotions` | id, code, discountType, value, validUntil | 1:N Orders (applied) | MEDIUM |
| **LoyaltyPoint**| Customer points | `/account/loyalty` | id, customerId, points, transactionType, sourceId | N:1 Customer | MEDIUM |
