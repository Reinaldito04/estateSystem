-- CreateEnum
CREATE TYPE "LateFeeType" AS ENUM ('NONE', 'FIXED', 'PERCENT_DAILY', 'PERCENT_MONTHLY');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "leases" ADD COLUMN "late_fee_type" "LateFeeType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "leases" ADD COLUMN "late_fee_value" DECIMAL(8,4);
ALTER TABLE "leases" ADD COLUMN "late_fee_grace_days" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "owner_settlements" (
    "id" TEXT NOT NULL,
    "settlement_number" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
    "gross_income" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "agency_commission" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "commission_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.00,
    "expenses" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "late_fees" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "net_payout" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "document_url" TEXT,
    "created_by_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_settlements_settlement_number_key" ON "owner_settlements"("settlement_number");

-- CreateIndex
CREATE INDEX "owner_settlements_owner_id_period_end_idx" ON "owner_settlements"("owner_id", "period_end");

-- CreateIndex
CREATE INDEX "owner_settlements_status_period_end_idx" ON "owner_settlements"("status", "period_end");

-- AddForeignKey
ALTER TABLE "owner_settlements" ADD CONSTRAINT "owner_settlements_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settlements" ADD CONSTRAINT "owner_settlements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
