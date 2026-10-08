-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('DISTRIBUTOR', 'STOCKIST', 'RETAILER', 'SALES_AGENT');

-- CreateEnum
CREATE TYPE "PartnerBackground" AS ENUM ('NEW_TO_BUSINESS', 'RETAIL_SHOP', 'FMCG_DISTRIBUTION', 'AYURVEDA_OR_COSMETICS', 'SALON_OR_PARLOUR', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnerInvestment" AS ENUM ('UNDER_50K', 'FROM_50K_TO_2L', 'FROM_2L_TO_5L', 'ABOVE_5L');

-- CreateEnum
CREATE TYPE "PartnerEnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_DISCUSSION', 'APPOINTED', 'NOT_SUITABLE');

-- CreateTable
CREATE TABLE "PartnerEnquiry" (
    "id" TEXT NOT NULL,
    "partnerType" "PartnerType" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "businessName" TEXT,
    "city" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "pincode" TEXT,
    "gstin" TEXT,
    "background" "PartnerBackground",
    "investment" "PartnerInvestment",
    "message" TEXT,
    "status" "PartnerEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerEnquiry_status_idx" ON "PartnerEnquiry"("status");

-- CreateIndex
CREATE INDEX "PartnerEnquiry_createdAt_idx" ON "PartnerEnquiry"("createdAt");

-- CreateIndex
CREATE INDEX "PartnerEnquiry_phone_idx" ON "PartnerEnquiry"("phone");

-- CreateIndex
CREATE INDEX "PartnerEnquiry_stateCode_idx" ON "PartnerEnquiry"("stateCode");
