# Laural Clothing - Backend (Commerce API)

This repository serves as the central API and single source of truth for the Laural Clothing platform. It handles all business logic, data persistence, and external integrations.

## Tech Stack
- **Framework**: Express.js (Node.js 22)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Caching**: Redis (Planned)

## Core Domains
Based on the architecture specifications, the API is organized into several modules:
- **Identity & RBAC**: Authentication and Role-Based Access Control.
- **Organization**: Multi-Branch management.
- **Catalog & Inventory**: Products, variants, categories, and branch-specific stock.
- **Commerce**: Cart, Checkout, Orders, and Loyalty.
- **Payments**: Integrations for Koko, Mintpay, OnePay, Payzy, and COD.
- **Shipping**: Fardar courier API integration.

## Getting Started
1. Install dependencies: `npm install`
2. Set up a PostgreSQL database and add the connection string to `.env`.
3. Push the Prisma schema to the database: `npm run db:push`
4. Start the development server: `npm run dev`
