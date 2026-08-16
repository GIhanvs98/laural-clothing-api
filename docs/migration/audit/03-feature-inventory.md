# 3. Feature Inventory

| Feature ID | Feature Name | Module | Route / Components | User Role | Purpose |
| ---------- | ------------ | ------ | ------------------ | --------- | ------- |
| **AUTH-001** | User Authentication | Account | `/login`, `AuthForm.tsx` | Guest | Register, login, and authenticate users. |
| **USER-001** | Profile Management | Account | `/account` | Customer | Manage user details. |
| **USER-002** | Address Book | Account | `/account/addresses` | Customer | Manage shipping/billing addresses. |
| **CAT-001** | Catalog Browsing | Storefront | `/shop`, `/category/[slug]` | Guest/Customer | Browse products by category. |
| **PROD-001** | Product Details | Storefront | `/product/[slug]` | Guest/Customer | View product info, select variants. |
| **SEARCH-001**| Global Search | Storefront | `/search`, `GlobalSearchModal.tsx` | Guest/Customer | Search catalog and filter products. |
| **CART-001** | Shopping Cart | Storefront | `CartSidePanel.tsx` | Guest/Customer | Manage items for checkout. |
| **CHECKOUT-001**| Customer Checkout | Storefront | `/checkout` | Guest/Customer | Submit an order and process payment. |
| **ORDER-001** | Order Tracking | Storefront | `/track-order`, `/account/orders` | Customer | View order history and status. |
| **ORDER-002** | Order Management | Admin | `/admin/orders` | Admin | Process, dispatch, or cancel orders. |
| **PAY-001** | Payments | Admin | `/admin/payments` | Admin | Monitor transactions and handle refunds. |
| **RETURN-001**| RMA / Returns | Account/Admin | `/account/returns`, `/admin/returns` | Customer/Admin | Process product returns and refunds. |
| **POS-001** | POS Checkout | POS | `/pos` | Cashier | In-store checkout process. |
| **POS-002** | POS Shifts | POS | `PosShiftModal.tsx` | Cashier | Open/close register shifts. |
| **INV-001** | Inventory Mgmt | Admin | `/admin/inventory`, `InventoryAdjustmentModal.tsx` | Admin | Adjust stock and handle transfers. |
| **PROMO-001** | Promotions | Admin | `/admin/promotions`, `CouponModal.tsx` | Admin | Manage coupons and discount rules. |
| **LOYALTY-001**| Rewards Points | Account/Admin | `/account/loyalty`, `/admin/loyalty` | Customer/Admin | Loyalty program points and tiers. |
| **REVIEW-001** | Product Reviews | Account/Admin | `/account/reviews`, `/admin/reviews` | Customer/Admin | Submit and moderate product reviews. |
| **BRANCH-001** | Branch Management | Admin | `/admin/branches` | Admin | Manage physical store locations. |
| **STAFF-001** | System Staff / RBAC | Admin | `/admin/system/users`, `/admin/system/roles`| Super Admin | Manage staff accounts and permissions. |

*Note: This is a high-level inventory mapping to specific frontend files. Detailed UI behaviors, state changes, and specific inputs per feature are documented in the E2E flows and Database Requirements.*
