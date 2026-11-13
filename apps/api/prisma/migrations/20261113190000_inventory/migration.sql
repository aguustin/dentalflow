-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'ADJUSTMENT', 'SALE', 'SALE_VOID');

-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "min_stock" INTEGER,
ADD COLUMN     "stock_quantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "sale_id" TEXT,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_catalog_item_id_created_at_idx" ON "stock_movements"("catalog_item_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_sale_id_idx" ON "stock_movements"("sale_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Integrity: stock never goes negative (sales are blocked when stock is insufficient)
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_stock_non_negative" CHECK ("stock_quantity" >= 0);
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_min_stock_non_negative" CHECK ("min_stock" IS NULL OR "min_stock" >= 0);

-- ── Enable inventory for existing dental organizations (clinic supplies) ───
UPDATE "organizations"
SET "enabled_modules" = "enabled_modules" || ARRAY['inventory']
WHERE "vertical" = 'dental' AND NOT ('inventory' = ANY("enabled_modules"));

-- ── RBAC: inventory.read / inventory.update ─────────────────────────────────
INSERT INTO "permissions" ("id", "resource", "action")
SELECT gen_random_uuid()::text, 'inventory', a FROM unnest(ARRAY['read', 'update']) a
ON CONFLICT ("resource", "action") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r JOIN "permissions" p ON p."resource" = 'inventory'
WHERE r."name" IN ('admin', 'reception')
   OR (r."name" IN ('professional', 'viewer') AND p."action" = 'read')
ON CONFLICT DO NOTHING;
