-- CreateTable
CREATE TABLE "CustomerReview" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "comment" TEXT,
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "locationId" TEXT NOT NULL DEFAULT 'default',
    "externalId" TEXT,
    "reviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CustomerReview_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

-- CreateIndex
CREATE INDEX "CustomerReview_source_idx" ON "CustomerReview"("source");

-- CreateIndex
CREATE INDEX "CustomerReview_locationId_idx" ON "CustomerReview"("locationId");

-- CreateIndex
CREATE INDEX "CustomerReview_reviewDate_idx" ON "CustomerReview"("reviewDate");
