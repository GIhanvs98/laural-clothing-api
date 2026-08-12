# Payment Integration Strategy

The platform supports multiple payment methods: **Koko, Mintpay, OnePay, Payzy, COD, and POS Cash**.

## Abstraction
Never implement payment logic directly into checkout. Instead, rely on a `PaymentProvider` interface:
```typescript
interface PaymentProvider {
  createPayment();
  verifyPayment();
  refundPayment();
  handleWebhook();
}
```

## Source of Truth
Frontend response is only informational. The backend **webhook is authoritative**.

**Flow:**
1. Customer initiates checkout.
2. Checkout service resolves gateway through `PaymentService`.
3. Gateway processes payment and fires Webhook.
4. Backend verifies webhook signature.
5. `Payment` record is updated -> `Order` confirmed -> `Inventory` officially deducted.

## Idempotency
Gateways frequently fire duplicate webhooks. A robust `payment_idempotency_key` constraint must be applied to webhook processing to ignore duplicates safely.

## COD (Cash on Delivery)
COD orders must create a proper `Payment` record with status `PENDING`. Upon successful delivery and cash collection, the payment status is updated to `PAID`. This ensures clean accounting for branch reporting.
