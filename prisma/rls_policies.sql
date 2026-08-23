-- Enable Row-Level Security on critical tables
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

-- 1. Order Policies
-- Allow admins to see/do everything
CREATE POLICY admin_all_orders ON "Order"
    FOR ALL
    USING (current_setting('app.is_admin', true) = 'true');

-- Allow customers to see their own orders
CREATE POLICY customer_read_own_orders ON "Order"
    FOR SELECT
    USING (current_setting('app.is_admin', true) != 'true' AND "customerId" = current_setting('app.current_user_id', true));

-- Allow customers to update their own orders (if applicable)
CREATE POLICY customer_update_own_orders ON "Order"
    FOR UPDATE
    USING (current_setting('app.is_admin', true) != 'true' AND "customerId" = current_setting('app.current_user_id', true));

-- Allow creation of orders (guest or customer)
CREATE POLICY all_insert_orders ON "Order"
    FOR INSERT
    WITH CHECK (true);

-- 2. Customer Policies
-- Allow admins to see/do everything
CREATE POLICY admin_all_customers ON "Customer"
    FOR ALL
    USING (current_setting('app.is_admin', true) = 'true');

-- Allow customers to see their own profile
CREATE POLICY customer_read_own_profile ON "Customer"
    FOR SELECT
    USING (current_setting('app.is_admin', true) != 'true' AND "id" = current_setting('app.current_user_id', true));

-- Allow customers to update their own profile
CREATE POLICY customer_update_own_profile ON "Customer"
    FOR UPDATE
    USING (current_setting('app.is_admin', true) != 'true' AND "id" = current_setting('app.current_user_id', true));

-- Allow insertion of new customers (e.g., during guest checkout or sign up)
CREATE POLICY all_insert_customers ON "Customer"
    FOR INSERT
    WITH CHECK (true);

-- Note: Because Prisma often needs to bypass RLS for background tasks or administrative operations,
-- the default PrismaClient (without the RLS extension) connects as a superuser or the app owner.
-- If the role is superuser, it inherently bypasses RLS in Postgres unless `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is used.
-- We are intentionally NOT using FORCE ROW LEVEL SECURITY so that the default admin Prisma client continues to work perfectly.
