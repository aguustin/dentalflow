-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "mp_preapproval_id" TEXT,
ADD COLUMN     "next_payment_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "billing_checkouts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "mp_preapproval_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mp_payment_id" TEXT NOT NULL,
    "mp_preapproval_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkouts_mp_preapproval_id_key" ON "billing_checkouts"("mp_preapproval_id");

-- CreateIndex
CREATE INDEX "billing_checkouts_organization_id_idx" ON "billing_checkouts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payments_mp_payment_id_key" ON "billing_payments"("mp_payment_id");

-- CreateIndex
CREATE INDEX "billing_payments_organization_id_created_at_idx" ON "billing_payments"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_provider_topic_resource_id_idx" ON "webhook_events"("provider", "topic", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_request_id_key" ON "webhook_events"("provider", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_mp_preapproval_id_key" ON "subscriptions"("mp_preapproval_id");


-- Mercado Pago Argentina charges in ARS. PROVISIONAL prices: set the real ones before going live.
UPDATE "plans" SET "currency" = 'ARS', "price" = 25000 WHERE "name" = 'pro';
UPDATE "plans" SET "currency" = 'ARS', "price" = 90000 WHERE "name" = 'enterprise';
UPDATE "plans" SET "currency" = 'ARS' WHERE "name" = 'free';
