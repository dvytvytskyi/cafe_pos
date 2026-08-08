-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "type" TEXT NOT NULL,
    "locationId" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Printer_locationId_idx" ON "Printer"("locationId");

-- Seed default network printers
INSERT INTO "Printer" ("id", "name", "ipAddress", "port", "type", "locationId", "createdAt", "updatedAt")
VALUES
  ('printer-seed-bar', 'Bar Printer', '192.168.1.151', 9100, 'bar', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('printer-seed-kitchen', 'Kitchen Printer', '192.168.1.150', 9100, 'kitchen', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('printer-seed-receipt', 'Cash Register Printer', '192.168.1.152', 9100, 'receipt', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
