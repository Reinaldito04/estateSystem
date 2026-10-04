-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "asking_rent_amount" DECIMAL(12,2),
ADD COLUMN     "asking_rent_currency" "CurrencyCode" NOT NULL DEFAULT 'USD';
