# Backend Architecture Overview

## Core Principle
**Frontend should never own business logic. Backend is the source of truth.** The Storefront, POS, and Admin applications are clients of the Commerce API. They are never allowed to implement their own business logic. 

## System Design
The Laural backend is built as a **Modular Monolith**. It runs on Node.js 22 with Express.js and TypeScript. 

### Modules
- **Auth/RBAC Module**: Manages roles (Super Admin, Branch Admin, Cashier, Customer, Guest) and granular permissions.
- **Organization/Branch Module**: Ensures isolation between branch operations.
- **Customer Module**: Guest identities (phone-based) and registered profiles.
- **Catalog Module**: Products, Variants (Size/Color), Collections.
- **Inventory Module**: Branch-specific inventory, stock transfers, reservations.
- **Order Module**: State machine for order processing (PENDING -> PAID -> PROCESSING -> PACKED -> DISPATCHED -> DELIVERED).
- **Payment Module**: Abstraction layer for multiple gateways (Koko, Mintpay, etc).
- **Courier Module**: Fardar API integration for tracking and shipments.
- **Loyalty Module**: Points accrual, redemption, and tiers.
- **POS Module**: Cashier sessions, sales, returns.
- **Reporting & Audit**: High-fidelity logging for every operational change.

## Key Technical Decisions
1. **API Layer**: `Route -> Middleware (Auth/RBAC) -> Validation (Zod) -> Controller -> Service -> Repository -> Prisma -> PostgreSQL`
2. **Event-Driven Internals**: E.g., `PaymentConfirmed` triggers actions in `OrderService`, `InventoryService`, and `NotificationService`.
3. **Idempotency**: All webhooks, payments, inventory deductions, and order creations require idempotency keys to prevent duplicate actions.
