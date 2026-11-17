-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "reserved_quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "sale_id" TEXT;

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_reservations_catalog_item_id_idx" ON "stock_reservations"("catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservations_work_order_id_catalog_item_id_key" ON "stock_reservations"("work_order_id", "catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_sale_id_key" ON "work_orders"("sale_id");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Reserved stock is part of the physical stock: 0 <= reserved <= stock
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_reserved_within_stock"
  CHECK ("reserved_quantity" >= 0 AND "reserved_quantity" <= "stock_quantity");
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_quantity_positive" CHECK ("quantity" > 0);
