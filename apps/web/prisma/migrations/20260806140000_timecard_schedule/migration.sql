-- CreateTable
CREATE TABLE "TimeCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeCard_userId_workDate_idx" ON "TimeCard"("userId", "workDate");

-- CreateIndex
CREATE INDEX "TimeCard_workDate_idx" ON "TimeCard"("workDate");

-- CreateIndex
CREATE INDEX "TimeCard_userId_clockOut_idx" ON "TimeCard"("userId", "clockOut");

-- CreateIndex
CREATE INDEX "ShiftSchedule_weekStart_idx" ON "ShiftSchedule"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftSchedule_userId_weekStart_dayOfWeek_key" ON "ShiftSchedule"("userId", "weekStart", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "TimeCard" ADD CONSTRAINT "TimeCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
