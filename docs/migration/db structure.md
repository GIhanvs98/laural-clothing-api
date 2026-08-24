# WordPress / WooCommerce Database Structure
*(Table Prefix used in dump: `wpqr_`)*

When migrating data from the old WordPress site to your new custom architecture, you will need to extract data from specific tables. WordPress stores many different types of data in shared tables (like `posts`), but WooCommerce also uses custom tables for performance. 

Here is the breakdown of the most important tables you'll need to query for Users, Products, Images, and Orders.

---

## 👥 1. Users & Customers
WordPress splits user data across two main tables.

- **`wpqr_users`**: The core table. Contains authentication data.
  - *Key columns:* `ID`, `user_login`, `user_pass` (hashed), `user_email`, `user_registered`.
- **`wpqr_usermeta`**: The metadata table. This is where WooCommerce stores customer addresses and WordPress stores roles.
  - *Key columns:* `user_id`, `meta_key`, `meta_value`.
  - *Important meta keys:* `billing_first_name`, `billing_phone`, `shipping_address_1`, `wpqr_capabilities` (to check if they are admin vs customer).
- **`wpqr_wc_customer_lookup`**: A WooCommerce helper table that flattens customer purchase data (total spent, last order date).

---

## 🛍️ 2. Products & Images (The Post System)
WordPress uses the `wpqr_posts` table for almost everything content-related, distinguishing them by the `post_type` column.

- **`wpqr_posts`**: 
  - Products have `post_type = 'product'` or `'product_variation'`.
  - Images have `post_type = 'attachment'` (The image URL is in the `guid` column).
  - *Key columns:* `ID`, `post_title` (Product Name), `post_content` (Description), `post_excerpt` (Short Description), `post_status` (publish/draft).
- **`wpqr_postmeta`**: Contains all specific product data. Links to `wpqr_posts.ID`.
  - *Important meta keys:* `_price`, `_regular_price`, `_sku`, `_stock_status`, `_thumbnail_id` (links to the Feature Image attachment ID), and `_product_image_gallery` (comma-separated list of gallery image IDs).
- **`wpqr_wc_product_meta_lookup`**: A highly useful WooCommerce table that makes querying easier. It extracts data from postmeta into columns: `product_id`, `sku`, `min_price`, `max_price`, `stock_quantity`, `stock_status`.

---

## 🗂️ 3. Categories, Tags, and Attributes
Products are linked to categories and attributes using the WordPress Taxonomy system (a complex 4-table join).

- **`wpqr_terms`**: The actual name of the category/tag/attribute (e.g., "T-Shirts", "Red", "Large").
  - *Key columns:* `term_id`, `name`, `slug`.
- **`wpqr_term_taxonomy`**: Defines what the term is (e.g., `taxonomy = 'product_cat'` for category, `product_tag` for tag, or `pa_color` for a color attribute).
- **`wpqr_term_relationships`**: The bridge table linking a Product ID (`object_id`) to a `term_taxonomy_id`.

---

## 📦 4. Orders & Fulfillment
Based on your database dump, your old site was using WooCommerce's **HPOS (High-Performance Order Storage)**, which makes order migration much cleaner than older WooCommerce versions.

- **`wpqr_wc_orders`**: The core order table.
  - *Key columns:* `id`, `status` (e.g., wc-completed, wc-processing), `currency`, `total_amount`, `customer_id`, `date_created_gmt`.
- **`wpqr_wc_order_addresses`**: Contains the frozen billing and shipping address for that specific order.
- **`wpqr_wc_orders_meta`**: Metadata for the order (e.g., payment gateway details, transaction IDs).
- **`wpqr_woocommerce_order_items`**: The items purchased inside the order.
  - *Key columns:* `order_id`, `order_item_name`, `order_item_type` (usually 'line_item' or 'shipping').
- **`wpqr_woocommerce_order_itemmeta`**: Links to the item table to provide quantity and price.
  - *Important meta keys:* `_product_id`, `_variation_id`, `_qty`, `_line_total`.

---

### 💡 Quick Migration Query Tips:
- **To get all product names and prices:** Join `wpqr_posts` (where `post_type='product'`) with `wpqr_wc_product_meta_lookup`.
- **To get product main images:** Join `wpqr_postmeta` (looking for `_thumbnail_id`) with `wpqr_posts` (to get the `guid` URL of the attachment).
- **To get customers and their total spend:** Join `wpqr_users` with `wpqr_wc_customer_lookup`.
