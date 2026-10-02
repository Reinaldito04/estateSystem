-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "receipt_number" TEXT;
ALTER TABLE "transactions" ADD COLUMN "receipt_issued_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_receipt_number_key" ON "transactions"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_key_key" ON "document_sequences"("key");
