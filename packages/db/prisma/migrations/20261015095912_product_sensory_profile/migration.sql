-- CreateEnum
CREATE TYPE "ProductTexture" AS ENUM ('LIGHTWEIGHT_GEL', 'RICH_BODY_BUTTER', 'NOURISHING_OIL', 'NON_GREASY_LOTION', 'REFRESHING_MIST', 'FOAMING_SHAMPOO', 'POWDER_PACK', 'EXFOLIATING_SCRUB');

-- CreateEnum
CREATE TYPE "ProductAroma" AS ENUM ('HERBAL', 'EARTHY', 'FLORAL', 'CITRUS', 'CAMPHOR', 'WARM', 'MILD_NATURAL');

-- CreateEnum
CREATE TYPE "ProductFinish" AS ENUM ('SKIN_MATTE', 'SKIN_DEWY', 'SKIN_NOURISHING', 'SKIN_FRESH', 'HAIR_SOFT_SMOOTH', 'HAIR_VOLUMINOUS', 'HAIR_CONDITIONED', 'HAIR_CLEAN_FRESH');

-- CreateEnum
CREATE TYPE "ProductRoutine" AS ENUM ('LEAVE_ON', 'RINSE_OFF');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "aromas" "ProductAroma"[] DEFAULT ARRAY[]::"ProductAroma"[],
ADD COLUMN     "finish" "ProductFinish",
ADD COLUMN     "routine" "ProductRoutine",
ADD COLUMN     "routineNote" TEXT,
ADD COLUMN     "routineNoteGu" TEXT,
ADD COLUMN     "texture" "ProductTexture";
