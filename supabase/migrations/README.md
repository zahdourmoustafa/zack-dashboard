# Database Migrations

This directory contains SQL migration files for the Supabase database.

## Migration: Add order_date to orders table

The migration file `20250518_add_order_date_to_orders.sql` adds an `order_date` column to the `orders` table to store the date when an order was placed.

### Changes made:

1. Added a new `order_date` column of type `TIMESTAMPTZ` to the `orders` table
2. Set default value to `CURRENT_TIMESTAMP` for new orders
3. Updated existing orders to set `order_date = created_at` for data consistency
4. Made the column `NOT NULL` after populating existing data
5. Added an index for better query performance when filtering by date
6. Added a column comment for documentation

### How to apply this migration:

#### Option 1: Using Supabase CLI (Recommended)

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
# Navigate to the project root
cd craft-order-pilot

# Push the migrations to your Supabase project
supabase db push
```

#### Option 2: Using Supabase Dashboard

1. Log in to the [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to SQL Editor
4. Copy the contents of `20250518_add_order_date_to_orders.sql`
5. Create a new SQL query, paste the content, and run the query

### TypeScript types:

The `order_date` field has been added to the TypeScript types in:

- `src/integrations/supabase/types.ts`
- `src/lib/mock-data.ts`

This ensures that your application code is consistent with the database schema.
