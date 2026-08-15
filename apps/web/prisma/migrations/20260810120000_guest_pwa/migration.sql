-- Guest PWA: menu i18n, guest sessions, merch visibility, order item extensions

ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "MenuItemTranslation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MenuItemTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuItemTranslation_itemId_locale_key" ON "MenuItemTranslation"("itemId", "locale");
CREATE INDEX IF NOT EXISTS "MenuItemTranslation_locale_idx" ON "MenuItemTranslation"("locale");

ALTER TABLE "MenuItemTranslation" DROP CONSTRAINT IF EXISTS "MenuItemTranslation_itemId_fkey";
ALTER TABLE "MenuItemTranslation" ADD CONSTRAINT "MenuItemTranslation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'food';
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "menuItemId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "merchSkuId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "modifierSnapshot" JSONB;

ALTER TABLE "MerchInventory" ADD COLUMN IF NOT EXISTS "guestVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MerchInventory" ADD COLUMN IF NOT EXISTS "guestImageUrl" TEXT;
ALTER TABLE "MerchInventory" ADD COLUMN IF NOT EXISTS "guestDescription" TEXT;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "guestRegisteredAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "GuestSession" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestSession_tokenHash_key" ON "GuestSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "GuestSession_customerId_idx" ON "GuestSession"("customerId");
CREATE INDEX IF NOT EXISTS "GuestSession_expiresAt_idx" ON "GuestSession"("expiresAt");

ALTER TABLE "GuestSession" DROP CONSTRAINT IF EXISTS "GuestSession_customerId_fkey";
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "GuestOtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GuestOtpChallenge_phone_idx" ON "GuestOtpChallenge"("phone");
CREATE INDEX IF NOT EXISTS "GuestOtpChallenge_expiresAt_idx" ON "GuestOtpChallenge"("expiresAt");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pointsToSpend" DOUBLE PRECISION NOT NULL DEFAULT 0;
