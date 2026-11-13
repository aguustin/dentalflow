-- Phase 2: staff, working hours, time off, resources; appointments get staff (+ optional resource).

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2563eb',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_members_organization_id_idx" ON "staff_members"("organization_id");

-- CreateIndex
CREATE INDEX "working_hours_staff_id_idx" ON "working_hours"("staff_id");

-- CreateIndex
CREATE INDEX "time_off_staff_id_start_time_idx" ON "time_off"("staff_id", "start_time");

-- CreateIndex
CREATE INDEX "resources_organization_id_idx" ON "resources"("organization_id");

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Appointments: staff (required) + resource (optional) ───────────────────
ALTER TABLE "appointments" ADD COLUMN "resource_id" TEXT, ADD COLUMN "staff_id" TEXT;

-- Backfill: one default staff member per organization that already has appointments
INSERT INTO "staff_members" ("id", "organization_id", "name", "updated_at")
SELECT gen_random_uuid()::text, o."id", 'Profesional principal', CURRENT_TIMESTAMP
FROM "organizations" o
WHERE EXISTS (SELECT 1 FROM "appointments" a WHERE a."organization_id" = o."id");

UPDATE "appointments" a
SET "staff_id" = s."id"
FROM "staff_members" s
WHERE s."organization_id" = a."organization_id";

ALTER TABLE "appointments" ALTER COLUMN "staff_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "appointments_staff_id_start_time_end_time_idx" ON "appointments"("staff_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "appointments_resource_id_start_time_end_time_idx" ON "appointments"("resource_id", "start_time", "end_time");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Race-proof double-booking protection (not expressible in Prisma schema) ─
-- Two active appointments can't overlap for the same staff member or resource,
-- even if two requests arrive at the same instant. App-level checks give friendly
-- messages; these constraints are the safety net.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_no_overlap"
  EXCLUDE USING gist ("staff_id" WITH =, tsrange("start_time", "end_time") WITH &&)
  WHERE ("status" IN ('SCHEDULED', 'CONFIRMED'));

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_resource_no_overlap"
  EXCLUDE USING gist ("resource_id" WITH =, tsrange("start_time", "end_time") WITH &&)
  WHERE ("status" IN ('SCHEDULED', 'CONFIRMED') AND "resource_id" IS NOT NULL);

-- ── RBAC: staff.* permissions ────────────────────────────────────────────────
INSERT INTO "permissions" ("id", "resource", "action")
SELECT gen_random_uuid()::text, 'staff', a FROM unnest(ARRAY['create', 'read', 'update']) a
ON CONFLICT ("resource", "action") DO NOTHING;

-- admin roles get everything; operational roles get read (+ update for reception: time off)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r JOIN "permissions" p ON p."resource" = 'staff'
WHERE r."name" = 'admin'
   OR (r."name" IN ('reception') AND p."action" IN ('read', 'update'))
   OR (r."name" IN ('professional', 'viewer') AND p."action" = 'read')
ON CONFLICT DO NOTHING;
