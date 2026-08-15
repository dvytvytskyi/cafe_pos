-- AlterTable
ALTER TABLE "Order" ADD COLUMN "loyaltyGuestIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from existing primary guest
UPDATE "Order" SET "loyaltyGuestIds" = ARRAY["customerId"]::TEXT[] WHERE "customerId" IS NOT NULL;
