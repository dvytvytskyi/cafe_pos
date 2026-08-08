-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ratePercent" DOUBLE PRECISION NOT NULL,
    "locationId" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxRate_locationId_idx" ON "TaxRate"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_locationId_slug_key" ON "TaxRate"("locationId", "slug");
