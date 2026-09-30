ALTER TABLE "Property"
ADD COLUMN "propertyType" TEXT NOT NULL DEFAULT 'APARTMENT',
ADD COLUMN "totalAreaSqm" DOUBLE PRECISION,
ADD COLUMN "builtAreaSqm" DOUBLE PRECISION,
ADD COLUMN "bedrooms" INTEGER,
ADD COLUMN "bathrooms" INTEGER,
ADD COLUMN "parkingSpaces" INTEGER,
ADD COLUMN "amenities" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "captureCommission" DECIMAL(5,2),
ADD COLUMN "captureExclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "captureContractUrl" TEXT,
ADD COLUMN "videoUrl" TEXT,
ADD COLUMN "floorPlanUrl" TEXT,
ADD COLUMN "virtualTourUrl" TEXT;


CREATE TABLE "PropertyKey" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "holderRole" TEXT NOT NULL,
    "keyCount" INTEGER NOT NULL DEFAULT 1,
    "accessCode" TEXT,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyVisit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT,
    "visitorEmail" TEXT,
    "purpose" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "visitedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyKey_propertyId_isActive_idx" ON "PropertyKey"("propertyId", "isActive");
CREATE INDEX "PropertyVisit_propertyId_scheduledAt_idx" ON "PropertyVisit"("propertyId", "scheduledAt");
ALTER TABLE "PropertyKey" ADD CONSTRAINT "PropertyKey_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyVisit" ADD CONSTRAINT "PropertyVisit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;