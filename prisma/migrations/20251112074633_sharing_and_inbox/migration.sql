-- AlterTable
ALTER TABLE "share_links" ADD COLUMN     "canDownload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictToEmail" TEXT;

-- CreateTable
CREATE TABLE "document_shares" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "sharedWithUserId" TEXT,
    "sharedWithEmail" TEXT,
    "expiresAt" TIMESTAMP(3),
    "canDownload" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_shares_documentId_idx" ON "document_shares"("documentId");

-- CreateIndex
CREATE INDEX "document_shares_sharedByUserId_idx" ON "document_shares"("sharedByUserId");

-- CreateIndex
CREATE INDEX "document_shares_sharedWithUserId_idx" ON "document_shares"("sharedWithUserId");

-- CreateIndex
CREATE INDEX "document_shares_sharedWithEmail_idx" ON "document_shares"("sharedWithEmail");

-- CreateIndex
CREATE INDEX "share_links_restrictToEmail_idx" ON "share_links"("restrictToEmail");

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
