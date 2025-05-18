-- Add order_date column to orders table
ALTER TABLE "public"."orders" 
ADD COLUMN "order_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to set order_date to created_at for data consistency
UPDATE "public"."orders" 
SET "order_date" = "created_at";

-- Make order_date NOT NULL after populating existing data
ALTER TABLE "public"."orders" 
ALTER COLUMN "order_date" SET NOT NULL;

-- Add an index for better query performance when filtering by date
CREATE INDEX "idx_orders_order_date" ON "public"."orders" ("order_date");

COMMENT ON COLUMN "public"."orders"."order_date" IS 'The date when the order was placed'; 