-- CreateTable
CREATE TABLE "conversion_jobs" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "estimated_completion" TIMESTAMP(3),
    "total_pages" INTEGER,
    "processed_pages" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversion_jobs_document_id_idx" ON "conversion_jobs"("document_id");

-- CreateIndex
CREATE INDEX "conversion_jobs_status_idx" ON "conversion_jobs"("status");

-- CreateIndex
CREATE INDEX "conversion_jobs_created_at_idx" ON "conversion_jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversion_jobs_document_id_status_key" ON "conversion_jobs"("document_id", "status") WHERE "status" IN ('queued', 'processing');

-- Add foreign key constraint
ALTER TABLE "conversion_jobs" ADD CONSTRAINT "conversion_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;