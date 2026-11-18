-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'RETURN';

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "returned_quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "refunded_total" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "reason" TEXT,
    "refund_total" INTEGER NOT NULL,
    "refund_method" "PaymentMethod" NOT NULL,
    "cash_session_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item_serials" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "warranty_until" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_item_serials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sale_returns_sale_id_idx" ON "sale_returns"("sale_id");

-- CreateIndex
CREATE INDEX "sale_returns_cash_session_id_idx" ON "sale_returns"("cash_session_id");

-- CreateIndex
CREATE INDEX "sale_return_items_return_id_idx" ON "sale_return_items"("return_id");

-- CreateIndex
CREATE INDEX "sale_item_serials_organization_id_serial_idx" ON "sale_item_serials"("organization_id", "serial");

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item_serials" ADD CONSTRAINT "sale_item_serials_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Never return more than sold, nor refund more than paid
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_returned_within_quantity"
  CHECK ("returned_quantity" >= 0 AND "returned_quantity" <= "quantity");
ALTER TABLE "sales" ADD CONSTRAINT "sales_refunded_within_paid"
  CHECK ("refunded_total" >= 0 AND "refunded_total" <= "paid_total");
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_quantity_positive" CHECK ("quantity" > 0);
-- A serial can be "out" (sold, not returned) only once per organization
CREATE UNIQUE INDEX "sale_item_serials_one_active_per_org"
  ON "sale_item_serials" ("organization_id", "serial") WHERE "returned_at" IS NULL;
