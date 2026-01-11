-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "conversionStatus" "ConversionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "documents" ADD COLUMN "conversionError" TEXT;
ALTER TABLE "documents" ADD COLUMN "pageCount" INTEGER;
ALTER TABLE "documents" ADD COLUMN "convertedAt" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN "pagesUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "document_pages" ADD COLUMN "storageBucket" TEXT NOT NULL DEFAULT 'document-pages';
ALTER TABLE "document_pages" ADD COLUMN "width" INTEGER;
ALTER TABLE "document_pages" ADD COLUMN "height" INTEGER;
ALTER TABLE "document_pages" ALTER COLUMN "storagePath" SET NOT NULL;
ALTER TABLE "document_pages" DROP COLUMN "storage_path";

-- CreateIndex
CREATE INDEX "documents_conversionStatus_idx" ON "documents"("conversionStatus");