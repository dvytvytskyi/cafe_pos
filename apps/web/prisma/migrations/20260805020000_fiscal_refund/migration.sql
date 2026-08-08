-- Module 4: refunds / rectificativa fiscal records
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "refundedQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "FiscalRecord" DROP CONSTRAINT IF EXISTS "FiscalRecord_orderId_key";
DROP INDEX IF EXISTS "FiscalRecord_orderId_key";

ALTER TABLE "FiscalRecord" ADD COLUMN IF NOT EXISTS "recordType" TEXT NOT NULL DEFAULT 'invoice';
ALTER TABLE "FiscalRecord" ADD COLUMN IF NOT EXISTS "originalFiscalRecordId" TEXT;
ALTER TABLE "FiscalRecord" ADD COLUMN IF NOT EXISTS "refundReason" TEXT;

ALTER TABLE "FiscalRecord"
  ADD CONSTRAINT "FiscalRecord_originalFiscalRecordId_fkey"
  FOREIGN KEY ("originalFiscalRecordId") REFERENCES "FiscalRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
