-- CreateTable
CREATE TABLE "BoardSettings" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "locationId" TEXT NOT NULL DEFAULT 'default',
    "stages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardSettings_type_locationId_key" ON "BoardSettings"("type", "locationId");

-- CreateIndex
CREATE INDEX "BoardSettings_type_idx" ON "BoardSettings"("type");
