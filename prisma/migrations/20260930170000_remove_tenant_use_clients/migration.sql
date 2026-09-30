-- Preserve tenant information in the central client table before removing Tenant.
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "bankDetails" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "workPlace" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "monthlyIncome" DECIMAL(12,2);
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "preferredPropertyType" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "maxBudget" DECIMAL(12,2);
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "housingRequirement" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "identityDocumentExpiresAt" TIMESTAMP(3);

INSERT INTO "ClientProfile" (
    "id", "fullName", "legalDocumentId", "email", "phone", "workPlace",
    "monthlyIncome", "emergencyContactName", "emergencyContactPhone", "role",
    "status", "riskLevel", "createdAt", "updatedAt", "identityDocumentExpiresAt"
)
SELECT
    t."id", t."fullName", t."documentId", t."email", t."phone", t."workPlace",
    t."monthlyIncome", t."emergencyContactName", t."emergencyContactPhone", 'TENANT',
    'active', 'MEDIUM', t."createdAt", t."updatedAt", t."identityDocumentExpiresAt"
FROM "Tenant" t
WHERE NOT EXISTS (
    SELECT 1 FROM "ClientProfile" c WHERE c."legalDocumentId" = t."documentId"
);

CREATE TABLE "LeaseClient" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TENANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaseClient_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LeaseClient" ("id", "leaseId", "clientId", "role")
SELECT md5(l."id" || t."id" || 'TENANT')::uuid::text, l."id", c."id", 'TENANT'
FROM "Lease" l
JOIN "Tenant" t ON t."id" = l."tenantId"
JOIN "ClientProfile" c ON c."legalDocumentId" = t."documentId"
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "EntityDocument" ADD COLUMN "clientId" TEXT;
ALTER TABLE "PropertyIssue" ADD COLUMN "clientId" TEXT;

UPDATE "EntityDocument" d
SET "clientId" = c."id"
FROM "Tenant" t
JOIN "ClientProfile" c ON c."legalDocumentId" = t."documentId"
WHERE d."tenantId" = t."id";

UPDATE "PropertyIssue" i
SET "clientId" = c."id"
FROM "Tenant" t
JOIN "ClientProfile" c ON c."legalDocumentId" = t."documentId"
WHERE i."tenantId" = t."id";

ALTER TABLE "EntityDocument" DROP CONSTRAINT "EntityDocument_tenantId_fkey";
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_tenantId_fkey";
ALTER TABLE "PropertyIssue" DROP CONSTRAINT "PropertyIssue_tenantId_fkey";

ALTER TABLE "Lease" DROP COLUMN "tenantId";
ALTER TABLE "EntityDocument" DROP COLUMN "tenantId";
ALTER TABLE "PropertyIssue" DROP COLUMN "tenantId";

ALTER TABLE "EntityDocument" ADD CONSTRAINT "EntityDocument_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyIssue" ALTER COLUMN "clientId" SET NOT NULL;
ALTER TABLE "PropertyIssue" ADD CONSTRAINT "PropertyIssue_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaseClient" ADD CONSTRAINT "LeaseClient_leaseId_fkey"
    FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaseClient" ADD CONSTRAINT "LeaseClient_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LeaseClient_leaseId_clientId_role_key" ON "LeaseClient"("leaseId", "clientId", "role");
CREATE INDEX "LeaseClient_clientId_role_idx" ON "LeaseClient"("clientId", "role");
CREATE INDEX "EntityDocument_entityType_clientId_idx" ON "EntityDocument"("entityType", "clientId");

DROP TABLE "Tenant";