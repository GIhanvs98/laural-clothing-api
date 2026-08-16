# 5. E2E Test Matrix

| Test ID | Feature | Scenario | Preconditions | Action | Expected Result | Backend Requirement |
| ------- | ------- | -------- | ------------- | ------ | --------------- | ------------------- |
| **TEST-CHK-01** | CHECKOUT-001 | Happy Path Guest | Items in cart | Submit checkout form | Redirect to success page, order created | API `/api/checkout` creates order transactionally |
| **TEST-CHK-02** | CHECKOUT-001 | Payment Failure | Invalid card | Submit checkout form | Show payment error, order not created | API rolls back order creation if payment fails |
| **TEST-CHK-03** | CHECKOUT-001 | Out of Stock | Item bought by another user concurrently | Submit checkout form | Show inventory error | DB transaction lock prevents negative stock |
| **TEST-POS-01** | POS-001 | Exact Cash | Open shift, items in cart | Pay exact cash amount | Print receipt, new blank sale | Fast transactional write for POS order |
| **TEST-POS-02** | POS-001 | Split Payment | Items in cart | Pay half cash, half card | Print receipt | Support multiple `PaymentTransaction` per `Order` |
| **TEST-INV-01** | INV-001 | Stock Transfer | Admin logged in | Transfer 10 items Branch A to B | Stock updated | `InventoryAdjustment` records created for audit |
| **TEST-PROD-01**| PROD-001 | View Variations | Product exists | Select Color/Size | Price/Image updates | API delivers variant matrix efficiently |
