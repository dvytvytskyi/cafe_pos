-- Per-location inventory stock + item metadata
ALTER TABLE "MerchInventory" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'merch';
ALTER TABLE "MerchInventory" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'pcs';

CREATE TABLE IF NOT EXISTS "InventoryLocationStock" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLocationStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryLocationStock_itemId_locationId_key"
  ON "InventoryLocationStock"("itemId", "locationId");
CREATE INDEX IF NOT EXISTS "InventoryLocationStock_locationId_idx"
  ON "InventoryLocationStock"("locationId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryLocationStock_itemId_fkey') THEN
    ALTER TABLE "InventoryLocationStock"
      ADD CONSTRAINT "InventoryLocationStock_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "MerchInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryLocationStock_locationId_fkey') THEN
    ALTER TABLE "InventoryLocationStock"
      ADD CONSTRAINT "InventoryLocationStock_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: put existing global stock into Main WH when that location exists
INSERT INTO "InventoryLocationStock" ("id", "itemId", "locationId", "quantity", "updatedAt")
SELECT gen_random_uuid()::text, m."id", 'loc-main-wh', m."quantity", NOW()
FROM "MerchInventory" m
WHERE m."quantity" > 0
  AND EXISTS (SELECT 1 FROM "Location" WHERE "id" = 'loc-main-wh')
  AND NOT EXISTS (
    SELECT 1 FROM "InventoryLocationStock" s
    WHERE s."itemId" = m."id" AND s."locationId" = 'loc-main-wh'
  );

-- Fallback backfill into first location when Main WH is missing
INSERT INTO "InventoryLocationStock" ("id", "itemId", "locationId", "quantity", "updatedAt")
SELECT gen_random_uuid()::text, m."id", l."id", m."quantity", NOW()
FROM "MerchInventory" m
CROSS JOIN LATERAL (
  SELECT "id" FROM "Location" ORDER BY "name" ASC LIMIT 1
) l
WHERE m."quantity" > 0
  AND NOT EXISTS (SELECT 1 FROM "InventoryLocationStock" s WHERE s."itemId" = m."id");
