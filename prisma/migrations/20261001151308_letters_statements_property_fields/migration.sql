-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NoticeRecipient" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "AccountStatementAudience" AS ENUM ('OWNER', 'TENANT');

-- AlterTable
ALTER TABLE "lease_proposals_and_notices" ADD COLUMN     "body" TEXT,
ADD COLUMN     "recipient_type" "NoticeRecipient",
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "condo_administration" TEXT,
ADD COLUMN     "condo_contact" TEXT,
ADD COLUMN     "condo_fee_amount" DECIMAL(10,2),
ADD COLUMN     "electricity_meter_number" TEXT,
ADD COLUMN     "electricity_provider" TEXT,
ADD COLUMN     "electricity_tariff" TEXT;

-- CreateTable
CREATE TABLE "account_statements" (
    "id" TEXT NOT NULL,
    "audience" "AccountStatementAudience" NOT NULL DEFAULT 'OWNER',
    "property_id" TEXT,
    "client_id" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "summary" JSONB NOT NULL DEFAULT '{}',
    "document_url" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_statements_property_id_created_at_idx" ON "account_statements"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "account_statements_client_id_created_at_idx" ON "account_statements"("client_id", "created_at");

-- AddForeignKey
ALTER TABLE "account_statements" ADD CONSTRAINT "account_statements_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_statements" ADD CONSTRAINT "account_statements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_statements" ADD CONSTRAINT "account_statements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
