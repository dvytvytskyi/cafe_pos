-- Profile avatar + discount color tag
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

ALTER TABLE "DiscountPreset" ADD COLUMN IF NOT EXISTS "colorTag" TEXT DEFAULT 'bg-gray-100 text-gray-700';
