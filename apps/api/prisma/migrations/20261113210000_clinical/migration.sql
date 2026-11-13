-- CreateTable
CREATE TABLE "clinical_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "anamnesis" JSONB NOT NULL DEFAULT '{}',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tooth_conditions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tooth" INTEGER NOT NULL,
    "surface" TEXT,
    "condition" TEXT NOT NULL,
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tooth_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinical_records_customer_id_key" ON "clinical_records"("customer_id");

-- CreateIndex
CREATE INDEX "clinical_records_organization_id_idx" ON "clinical_records"("organization_id");

-- CreateIndex
CREATE INDEX "clinical_notes_customer_id_created_at_idx" ON "clinical_notes"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "tooth_conditions_customer_id_tooth_created_at_idx" ON "tooth_conditions"("customer_id", "tooth", "created_at");

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tooth_conditions" ADD CONSTRAINT "tooth_conditions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Enable the clinical module for existing dental organizations ────────────
UPDATE "organizations"
SET "enabled_modules" = "enabled_modules" || ARRAY['clinical']
WHERE "vertical" = 'dental' AND NOT ('clinical' = ANY("enabled_modules"));

-- ── RBAC: clinical.read / clinical.update ────────────────────────────────────
-- Sensitive health data: only admins and professionals (not reception/viewer).
INSERT INTO "permissions" ("id", "resource", "action")
SELECT gen_random_uuid()::text, 'clinical', a FROM unnest(ARRAY['read', 'update']) a
ON CONFLICT ("resource", "action") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r JOIN "permissions" p ON p."resource" = 'clinical'
WHERE r."name" IN ('admin', 'professional')
ON CONFLICT DO NOTHING;
