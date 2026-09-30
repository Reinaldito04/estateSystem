ALTER TABLE "Lease"
ADD COLUMN "signatureMethod" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "signedBy" TEXT,
ADD COLUMN "signatureHash" TEXT,
ADD COLUMN "signatureConsentAt" TIMESTAMP(3);