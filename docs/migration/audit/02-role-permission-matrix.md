# 2. Role & Access Audit

## Identified Roles
Based on the frontend application structure (routes, dashboard sidebar, and mock structures):
- **Guest (Public User)**: Unauthenticated user accessing the storefront.
- **Customer**: Authenticated user accessing the storefront and `/account` area.
- **Super Admin**: System owner with access to all modules in `/admin`.
- **Branch Admin**: Store manager with access to local branch data in `/branch-admin`.
- **Cashier / POS Staff**: Retail staff accessing `/pos` to process in-store sales.

## Role-Permission Matrix

| Role | Module | View | Create | Update | Delete | Approve | Refund | Export | Special Permission |
| ---- | ------ | ---: | -----: | -----: | -----: | ------: | -----: | -----: | ------------------ |
| Guest | Storefront | Yes | No | No | No | No | No | No | None |
| Guest | Checkout | Yes | Yes (Order) | No | No | No | No | No | None |
| Customer | Account Profile | Yes | No | Yes | No | No | No | No | None |
| Customer | Account Orders | Yes | Yes | No | No | No | No | No | Request Return/RMA |
| Customer | Account Addresses| Yes | Yes | Yes | Yes | No | No | No | None |
| Cashier | POS | Yes | Yes (Order) | Yes (Cart) | Yes (Void) | No | Yes | No | Suspend Cart, Exchange |
| Branch Admin| Branch Data | Yes | No | Yes | No | No | No | Yes | View local reports |
| Super Admin| All `admin/*` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | System Configuration, User Management |

> **Note:** Currently, frontend visibility dictates these permissions (e.g. routes are separate). In the backend, these MUST be enforced via robust API authorization middleware (RBAC).
