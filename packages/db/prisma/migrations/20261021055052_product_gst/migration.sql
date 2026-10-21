-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "gstRateBps" INTEGER,
ADD COLUMN     "hsnCode" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "gstRateBps" INTEGER,
ADD COLUMN     "hsnCode" TEXT;
