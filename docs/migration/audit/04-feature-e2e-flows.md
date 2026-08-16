# 4. Feature E2E Flows

## Feature ID: CHECKOUT-001
**Feature:** Customer Checkout

**PRECONDITIONS**
1. User has items in cart.
2. User is on `/checkout` page.
3. User is either logged in or provides guest details.

**USER FLOW**
1. Enter Shipping Information (if physical items).
2. Select Shipping Method.
3. Apply Coupon (optional).
4. Enter Payment Details.
5. Click "Place Order".

**INPUTS**
- Shipping Address (Name, Street, City, ZIP, Country, Phone)
- Billing Address (or same as shipping)
- Shipping Method ID
- Payment Details (Token or Card Info securely passed to gateway)
- Coupon Code

**VALIDATION**
- Cart is not empty.
- Stock is available for all items.
- Payment details valid.
- Coupon valid and applicable.

**BUSINESS RULES**
- Order total must match backend calculation (Subtotal + Tax + Shipping - Discount).
- Inventory must be reserved/deducted upon successful payment.

**DATABASE READS**
- Product/Variant price and stock.
- Coupon validity.
- Shipping rates based on zone/address.

**DATABASE WRITES**
- Create `Order`.
- Create `OrderItem` (multiple).
- Create `PaymentTransaction`.
- Update `Inventory` (decrement).
- Create/Update `Customer` (if guest opts to save).

**STATE CHANGES**
- Order: `PENDING` -> `PROCESSING` (or `CONFIRMED` upon payment success).
- Payment: `PENDING` -> `COMPLETED`.

**SIDE EFFECTS**
- Clear cart.
- Send Order Confirmation Email.

**SUCCESS STATE**
- Redirect to `/checkout/success` with Order ID.

**ERROR STATES**
- Payment Declined: Show error, remain on checkout.
- Out of Stock: Show error, update cart quantities, remain on checkout.

---

## Feature ID: POS-001
**Feature:** POS Checkout

**PRECONDITIONS**
1. Cashier is logged in and has an open Shift/Session.
2. Items added to POS Cart.

**USER FLOW**
1. Cashier scans/adds products to cart.
2. Cashier selects Customer (optional).
3. Cashier applies manual discount (optional).
4. Cashier selects "Pay".
5. Cashier chooses payment method (Cash, Card, Mixed).
6. Cashier completes payment and prints receipt.

**INPUTS**
- Product SKUs/Barcodes.
- Customer ID.
- Payment Amounts per method.

**VALIDATION**
- Sum of payment amounts >= Total.
- Register is open.

**DATABASE WRITES**
- Create `Order` (marked as POS source, linked to Branch/Register).
- Create `PaymentTransaction`.
- Update `Inventory`.

**CONCURRENCY CONCERNS**
- High risk of simultaneous POS and online checkout for same item. Requires strict transactional locks on `Inventory`.

