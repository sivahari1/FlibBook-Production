-- CreateTable
CREATE TABLE IF NOT EXISTS "document_pages" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "document_pages_documentId_pageNumber_key" ON "document_pages"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_pages_documentId_idx" ON "document_pages"("documentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_pages_expiresAt_idx" ON "document_pages"("expiresAt");
