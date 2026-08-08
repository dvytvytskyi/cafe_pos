-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChecklist" (
    "id" TEXT NOT NULL,
    "shiftType" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "locationKey" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "cashShiftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_taskKey_key" ON "ChecklistTemplate"("taskKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChecklist_shiftType_scheduledDate_locationKey_taskKey_key" ON "DailyChecklist"("shiftType", "scheduledDate", "locationKey", "taskKey");

-- CreateIndex
CREATE INDEX "DailyChecklist_scheduledDate_shiftType_idx" ON "DailyChecklist"("scheduledDate", "shiftType");
