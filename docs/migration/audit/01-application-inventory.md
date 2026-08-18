# 1. Application Inventory

## Application architecture

* **Framework:** Next.js 15 (App Router)
* **Routing strategy:** File-system based routing (App Router)
* **Rendering strategy:** Mixed (Server Components by default, Client Components where interactivity is needed)
* **State management:** React Context (e.g., `CartProvider`), TanStack React Query for async state.
* **Component architecture:** Functional components, heavy use of shared UI components (`components/ui`, `components/admin`, `components/dashboard`, `components/pos`).
* **UI library:** Tailwind CSS with Lucide React for icons.
* **Styling system:** Tailwind CSS (configured via `tailwind.config.ts` and `postcss.config.js`).
* **Form handling:** `react-hook-form`
* **Validation:** `zod`
* **Mock-data architecture:** Hardcoded mock objects in components and specific `.ts` files.
* **Data-fetching abstraction if present:** `@tanstack/react-query` suggests API layers exist or are planned, but current implementation seems heavily mock-based.
* **Authentication placeholders:** `app/(storefront)/login`, `components/AuthForm.tsx` (Likely relying on future session cookies/JWTs).
* **Authorization placeholders:** Role-specific route grouping (`app/admin`, `app/branch-admin`, `app/pos`, `app/account`).

## Route inventory

| Route | Role | Page | Purpose | Data Required | Actions | Status |
| ----- | ---- | ---- | ------- | ------------- | ------- | ------ |
| `/` | Public | Storefront Home | Display featured products, categories, campaigns | Banners, Featured Products, New Arrivals | Navigation | UI Implemented |
| `/about` | Public | About Us | Company information | Static content / CMS | None | UI Implemented |
| `/category/[slug]` | Public | Category | Products by category | Category details, Product List, Filters | Filter, Sort, View Product | UI Implemented |
| `/collection/[slug]` | Public | Collection | Curated collections | Collection details, Product List | Filter, Sort, View Product | UI Implemented |
| `/product/[slug]` | Public | Product Details | Individual product view | Product, Variants, Inventory, Reviews | Add to Cart, Select Variant, Add to Wishlist | UI Implemented |
| `/checkout` | Public/Auth | Checkout | Purchase process | Cart Items, Shipping Address, Payment Methods | Submit Order, Apply Coupon | UI Implemented |
| `/checkout/success` | Public/Auth | Order Success | Confirmation | Order Number, Summary | View Order | UI Implemented |
| `/contact` | Public | Contact Us | Inquiry form | Store locations, Contact Details | Submit Form | UI Implemented |
| `/login` | Public | Login/Register | Authentication | None | Login, Register, Forgot Password | UI Implemented |
| `/privacy-policy` | Public | Privacy Policy | Legal | Static / CMS | None | UI Implemented |
| `/returns` | Public | Returns Info | Policy information | Static / CMS | None | UI Implemented |
| `/sale` | Public | Sale/Clearance | Discounted products | Discounted Products | Filter, Sort, View Product | UI Implemented |
| `/search` | Public | Search Results | Global search | Search Query, Products | Search, Filter | UI Implemented |
| `/shop` | Public | All Products | Full catalog | All Products, Filters, Categories | Filter, Sort, View Product | UI Implemented |
| `/terms-conditions` | Public | Terms | Legal | Static / CMS | None | UI Implemented |
| `/track-order` | Public | Track Order | Guest tracking | Order ID, Email -> Order Status | Check Status | UI Implemented |
| `/account` | Customer | Dashboard | Customer overview | User Profile, Recent Orders | Edit Profile | UI Implemented |
| `/account/addresses` | Customer | Addresses | Manage shipping/billing | User Addresses | Add, Edit, Delete Address | UI Implemented |
| `/account/loyalty` | Customer | Loyalty | Points & rewards | Points Balance, Tier, History | Redeem Points | UI Implemented |
| `/account/orders` | Customer | Order History | Past orders list | Orders List | View Details, Reorder | UI Implemented |
| `/account/orders/[id]` | Customer | Order Details | Specific order | Order, Items, Shipping, Payment | Request Return | UI Implemented |
| `/account/returns` | Customer | RMAs | Return history | RMA List, Status | Track RMA | UI Implemented |
| `/account/reviews` | Customer | My Reviews | Product reviews | User Reviews | Edit/Delete Review | UI Implemented |
| `/account/wishlist` | Customer | Wishlist | Saved products | Saved Products | Move to Cart, Remove | UI Implemented |
| `/admin` | Admin | Dashboard | System overview | Key Metrics, Charts, Recent Activity | None | UI Implemented |
| `/admin/branches` | Admin | Branches | Manage stores | Branch List | CRUD Branch | UI Implemented |
| `/admin/categories` | Admin | Categories | Manage taxonomy | Category List | CRUD Category | UI Implemented |
| `/admin/cms` | Admin | Content | Manage static pages | Page Content | Edit Pages | UI Implemented |
| `/admin/collections` | Admin | Collections | Manage curated lists | Collection List | CRUD Collection | UI Implemented |
| `/admin/customers` | Admin | Customers | User management | Customer List, History | View, Edit, Block User | UI Implemented |
| `/admin/inventory` | Admin | Inventory | Global stock | Stock Levels across branches | Adjust Stock, Transfer | UI Implemented |
| `/admin/loyalty` | Admin | Loyalty Config | Reward rules | Tiers, Rules | Edit Rules | UI Implemented |
| `/admin/media` | Admin | Media | Image assets | Images, Folders | Upload, Delete, Organize | UI Implemented |
| `/admin/orders` | Admin | Orders | All orders | Order List | Filter, Sort, Bulk Update | UI Implemented |
| `/admin/orders/[id]` | Admin | Order Details | Order management | Order, Items, Payments | Update Status, Dispatch, Cancel | UI Implemented |
| `/admin/payments` | Admin | Payments | Transactions | Transaction List | Filter, Export | UI Implemented |
| `/admin/payments/[id]` | Admin | Payment Details | Transaction view | Payment Details | Refund, Retry | UI Implemented |
| `/admin/products` | Admin | Products | Catalog | Product List | CRUD Product | UI Implemented |
| `/admin/products/[id]` | Admin | Product Edit | Catalog entry | Product Details, Variants | Update Product | UI Implemented |
| `/admin/promotions` | Admin | Promotions | Discounts/Coupons | Promotion List | CRUD Promotion | UI Implemented |
| `/admin/reports` | Admin | Reports | Analytics | Sales Data, Inventory Data | Generate, Export | UI Implemented |
| `/admin/returns` | Admin | Returns | RMA management | RMA List | Approve, Reject, Refund | UI Implemented |
| `/admin/returns/[rma]` | Admin | Return Details | RMA processing | RMA Details | Process Return | UI Implemented |
| `/admin/reviews` | Admin | Reviews | Product reviews | Review List | Approve, Reject, Delete | UI Implemented |
| `/admin/shipping` | Admin | Shipping | Methods/Rates | Shipping Zones, Rates | CRUD Zones | UI Implemented |
| `/admin/system/audit` | Admin | Audit Logs | System logs | Audit Events | Filter, View | UI Implemented |
| `/admin/system/roles` | Admin | Roles | RBAC config | Roles, Permissions | CRUD Roles | UI Implemented |
| `/admin/system/settings` | Admin | Settings | Global config | Settings Object | Update Settings | UI Implemented |
| `/admin/system/users` | Admin | Staff Users | Staff management | Staff List | CRUD Staff | UI Implemented |
| `/branch-admin` | Branch Admin | Branch Dashboard | Local management | Branch Metrics, Local Orders | View Local Data | UI Implemented |
| `/pos` | Cashier | POS Interface | In-store checkout | Products, Cart, Customers, Register | Add to Cart, Pay, Print Receipt | UI Implemented |

