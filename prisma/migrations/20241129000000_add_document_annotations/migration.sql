-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "document_annotations" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "selectedText" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "mediaUrl" TEXT,
    "externalUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_annotations_documentId_pageNumber_idx" ON "document_annotations"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "document_annotations_userId_idx" ON "document_annotations"("userId");

-- CreateIndex
CREATE INDEX "document_annotations_documentId_idx" ON "document_annotations"("documentId");

-- AddForeignKey
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
