-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewRejectReason" AS ENUM ('ABUSIVE', 'PERSONAL_INFO', 'MEDICAL_CLAIM', 'SPAM', 'NOT_ABOUT_PRODUCT');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsentText" TEXT,
ADD COLUMN     "marketingOptOutAt" TIMESTAMP(3),
ALTER COLUMN "marketingConsent" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sampleAddedAt" TIMESTAMP(3),
ADD COLUMN     "sampleNote" TEXT;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "city" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" "ReviewRejectReason",
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "ownerReply" TEXT,
    "ownerReplyAt" TIMESTAMP(3),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_productId_key" ON "Review"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_reviewId_voterKey_key" ON "ReviewVote"("reviewId", "voterKey");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- No recorded consent means no consent: clear the old default for every
-- customer who never actually opted in.
UPDATE "Customer" SET "marketingConsent" = false WHERE "marketingConsentAt" IS NULL;
