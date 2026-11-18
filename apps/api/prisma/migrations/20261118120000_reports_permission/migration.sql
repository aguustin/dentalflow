-- Phase 8: reports.read (financial data → admin roles only)
INSERT INTO "permissions" ("id", "resource", "action")
VALUES (gen_random_uuid()::text, 'reports', 'read')
ON CONFLICT ("resource", "action") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r JOIN "permissions" p ON p."resource" = 'reports'
WHERE r."name" = 'admin'
ON CONFLICT DO NOTHING;
