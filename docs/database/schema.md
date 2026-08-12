# Database Architecture & Conventions

The backend relies on **PostgreSQL** accessed via **Prisma ORM**.

## Schema Domains

1. **AUTH**: `User`, `Role`, `Permission`, `UserRole`, `Session`
2. **ORGANIZATION**: `Organization`, `Branch`, `BranchUser`, `POS`
3. **CATALOG**: `Product`, `ProductVariant`, `Category`, `Collection`, `ProductImage`, `Attribute`
4. **INVENTORY**: `BranchInventory`, `InventoryTransaction`, `InventoryReservation`, `StockTransfer`
5. **COMMERCE**: `Cart`, `Wishlist`, `Order`, `OrderItem`, `Address`, `Coupon`
6. **PAYMENTS**: `Payment`, `PaymentTransaction`, `PaymentWebhook`
7. **SHIPPING**: `Shipment`, `ShipmentTrackingEvent`
8. **LOYALTY**: `LoyaltyAccount`, `LoyaltyTransaction`, `LoyaltyRule`
9. **POS**: `POSTerminal`, `CashierSession`, `POSSale`, `POSPayment`
10. **CUSTOMER**: `Customer`, `CustomerAddress`, `CustomerPreference`
11. **AUDIT**: `AuditLog`, `ActivityLog`

## Critical Database Rules

- **Money**: ALWAYS use `Decimal`. NEVER use `Float`.
- **Primary Keys**: ALWAYS use `UUID`.
- **Timestamps**: ALWAYS store in `UTC` (`createdAt`, `updatedAt`).
- **Statuses**: ALWAYS use `Enums` (e.g., `PENDING`, `PAID`, `SHIPPED`).
- **Audit Trails**: Most operational tables must have `createdBy` and `updatedBy`.

## Transaction Boundaries

Operations spanning multiple domains (e.g., Checkout) must be wrapped in transactions:
```
BEGIN TRANSACTION -> Validate inventory -> Reserve stock -> Create Order -> Create Payment record -> COMMIT
```
Wait to execute external API calls (e.g., Payment Gateway creation) *after* or carefully *outside* the strict DB transaction block to prevent long-running DB locks, or use saga patterns with compensating transactions if an API fails.
