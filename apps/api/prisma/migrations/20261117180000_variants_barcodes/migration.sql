-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "is_variant_group" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "variant_options" JSONB;

-- CreateIndex
CREATE INDEX "catalog_items_parent_id_idx" ON "catalog_items"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_organization_id_barcode_key" ON "catalog_items"("organization_id", "barcode");

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A variant group is only a container: it never tracks stock, and variants can't nest
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_group_has_no_stock"
  CHECK (NOT "is_variant_group" OR ("track_stock" = false AND "parent_id" IS NULL));
