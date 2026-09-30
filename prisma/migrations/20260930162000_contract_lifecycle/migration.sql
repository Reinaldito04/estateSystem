ALTER TABLE "Owner" ADD COLUMN "identityDocumentExpiresAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "identityDocumentExpiresAt" TIMESTAMP(3);
ALTER TABLE "Lease"
ADD COLUMN "contractStatus" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "renewalMode" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "renewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "priceAdjustmentType" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "priceAdjustmentValue" DECIMAL(8,4),
ADD COLUMN "priceAdjustmentIndex" TEXT,
ADD COLUMN "nextAdjustmentDate" TIMESTAMP(3),
ADD COLUMN "guarantorRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "guarantorName" TEXT,
ADD COLUMN "guarantorDocumentId" TEXT,
ADD COLUMN "guarantorPhone" TEXT,
ADD COLUMN "guarantorEmail" TEXT,
ADD COLUMN "templateId" TEXT,
ADD COLUMN "draftContent" TEXT,
ADD COLUMN "signatureProvider" TEXT,
ADD COLUMN "signatureEnvelopeId" TEXT,
ADD COLUMN "signatureStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "signedIp" TEXT;

CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractType" TEXT NOT NULL DEFAULT 'LEASE',
    "description" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractSignatureEvent" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ipAddress" TEXT,
    "actorName" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractSignatureEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractSignatureEvent_leaseId_createdAt_idx" ON "ContractSignatureEvent"("leaseId", "createdAt");
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractSignatureEvent" ADD CONSTRAINT "ContractSignatureEvent_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;