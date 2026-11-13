-- CreateEnum
CREATE TYPE "CatalogItemType" AS ENUM ('SERVICE', 'PRODUCT');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "service_id" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ARS',
ADD COLUMN     "sale_counter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tax_rate_bps" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "CatalogItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" INTEGER NOT NULL,
    "duration_minutes" INTEGER,
    "track_stock" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "customer_id" TEXT,
    "staff_id" TEXT,
    "appointment_id" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "discount_total" INTEGER NOT NULL DEFAULT 0,
    "global_discount" INTEGER NOT NULL DEFAULT 0,
    "tax_rate_bps" INTEGER NOT NULL DEFAULT 0,
    "tax_total" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paid_total" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "catalog_item_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "cash_session_id" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opening_amount" INTEGER NOT NULL,
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "counted_cash" INTEGER,
    "expected_cash" INTEGER,
    "notes" TEXT,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_items_organization_id_type_idx" ON "catalog_items"("organization_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_organization_id_sku_key" ON "catalog_items"("organization_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "sales_appointment_id_key" ON "sales"("appointment_id");

-- CreateIndex
CREATE INDEX "sales_organization_id_created_at_idx" ON "sales"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "sales_organization_id_status_idx" ON "sales"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_organization_id_number_key" ON "sales"("organization_id", "number");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "payments_sale_id_idx" ON "payments"("sale_id");

-- CreateIndex
CREATE INDEX "payments_cash_session_id_idx" ON "payments"("cash_session_id");

-- CreateIndex
CREATE INDEX "cash_sessions_organization_id_opened_at_idx" ON "cash_sessions"("organization_id", "opened_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Integrity rules not expressible in Prisma schema ────────────────────────
-- At most one open cash session per organization
CREATE UNIQUE INDEX "cash_sessions_one_open_per_org" ON "cash_sessions" ("organization_id") WHERE "closed_at" IS NULL;

-- Money sanity (amounts in cents); a sale can never be paid beyond its total
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "sales" ADD CONSTRAINT "sales_paid_within_total" CHECK ("paid_total" >= 0 AND "paid_total" <= "total");

-- ── Enable the new modules for existing dental organizations ───────────────
UPDATE "organizations"
SET "enabled_modules" = "enabled_modules" || ARRAY['catalog', 'sales']
WHERE "vertical" = 'dental' AND NOT ('sales' = ANY("enabled_modules"));

-- ── RBAC: catalog.* and sales.* ─────────────────────────────────────────────
INSERT INTO "permissions" ("id", "resource", "action")
SELECT gen_random_uuid()::text, r, a
FROM unnest(ARRAY['catalog', 'sales']) r, unnest(ARRAY['create', 'read', 'update']) a
ON CONFLICT ("resource", "action") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ro."id", p."id" FROM "roles" ro JOIN "permissions" p ON p."resource" IN ('catalog', 'sales')
WHERE ro."name" = 'admin'
   OR (ro."name" = 'reception' AND (p."resource" = 'sales' OR p."action" = 'read'))
   OR (ro."name" IN ('professional', 'viewer') AND p."action" = 'read')
ON CONFLICT DO NOTHING;
