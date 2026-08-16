# 2. State Machines

Search through the frontend reveals several state/status lifecycles.

## 1. Order Status
**Entity:** `Order`
**Evidence:** `/admin/orders` filtering, `/track-order`
**Statuses:**
- `PENDING`: Created, unpaid.
- `CONFIRMED`: Paid, awaiting fulfillment.
- `PROCESSING`: Currently being packed/dispatched.
- `DISPATCHED`: Shipped (E-commerce) or Completed (POS).
- `COMPLETED`: Delivered to customer.
- `CANCELLED`: Cancelled before fulfillment.
- `REFUNDED`: Fully refunded post-completion.

**Transitions:**
`PENDING` -> `CONFIRMED` (Triggered by Payment Success)
`CONFIRMED` -> `PROCESSING` -> `DISPATCHED` -> `COMPLETED` (Triggered by Admin/Shipping)
`PENDING` -> `CANCELLED` (Triggered by Admin or Payment Timeout)

## 2. Payment Status
**Entity:** `PaymentTransaction`
**Evidence:** `/admin/payments`
**Statuses:**
- `PENDING`: Awaiting gateway confirmation.
- `COMPLETED`: Funds captured.
- `FAILED`: Gateway rejected.
- `REFUNDED`: Funds returned.

## 3. Return (RMA) Status
**Entity:** `Return`
**Evidence:** `/admin/returns`
**Statuses:**
- `REQUESTED`: Customer submitted request.
- `APPROVED`: Admin authorized return.
- `RECEIVED`: Items physically returned to warehouse/branch.
- `REJECTED`: Return denied.
- `REFUNDED`: Money sent back.

## 4. Product/Review Status
**Entity:** `Product`, `Review`
- `DRAFT` / `PUBLISHED` / `ARCHIVED` (for Products)
- `PENDING` / `APPROVED` / `REJECTED` (for Reviews, evidence in `/admin/reviews`)
