-- Phase 0: generalize the core for multiple business verticals.
-- Renames (instead of drop/create) so existing data is preserved.

-- Organization vertical + enabled modules
ALTER TABLE "organizations" ADD COLUMN "vertical" TEXT NOT NULL DEFAULT 'dental';
ALTER TABLE "organizations" ADD COLUMN "enabled_modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "organizations" SET "enabled_modules" = ARRAY['customers', 'scheduling'];

-- patients -> customers
ALTER TABLE "patients" RENAME TO "customers";
ALTER TABLE "customers" RENAME CONSTRAINT "patients_pkey" TO "customers_pkey";
ALTER TABLE "customers" RENAME CONSTRAINT "patients_organization_id_fkey" TO "customers_organization_id_fkey";
ALTER INDEX "patients_organization_id_idx" RENAME TO "customers_organization_id_idx";
ALTER INDEX "patients_organization_id_document_id_idx" RENAME TO "customers_organization_id_document_id_idx";
ALTER TABLE "customers" ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}';

-- appointments.patient_id -> customer_id
ALTER TABLE "appointments" RENAME COLUMN "patient_id" TO "customer_id";
ALTER TABLE "appointments" RENAME CONSTRAINT "appointments_patient_id_fkey" TO "appointments_customer_id_fkey";
ALTER INDEX "appointments_organization_id_patient_id_idx" RENAME TO "appointments_organization_id_customer_id_idx";
ALTER INDEX "appointments_patient_id_start_time_end_time_idx" RENAME TO "appointments_customer_id_start_time_end_time_idx";

-- Billing: generic metric names
ALTER TABLE "plans" RENAME COLUMN "max_patients" TO "max_customers";
UPDATE "usage_records" SET "metric" = 'customers' WHERE "metric" = 'patients';

-- RBAC: patients.* -> customers.* (keeps role assignments since ids don't change)
UPDATE "permissions" SET "resource" = 'customers' WHERE "resource" = 'patients';
UPDATE "plans" SET "features" = array_replace("features", 'patients', 'customers');
