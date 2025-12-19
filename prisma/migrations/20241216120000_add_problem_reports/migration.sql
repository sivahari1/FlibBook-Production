-- CreateTable
CREATE TABLE "problem_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "steps_to_reproduce" TEXT,
    "urgency" VARCHAR(10) NOT NULL DEFAULT 'medium',
    "contact_method" VARCHAR(10) NOT NULL DEFAULT 'email',
    "contact_info" VARCHAR(255),
    "error_type" VARCHAR(50),
    "error_message" TEXT,
    "error_context" JSONB,
    "user_agent" TEXT,
    "url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "assigned_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "problem_reports_user_id_idx" ON "problem_reports"("user_id");

-- CreateIndex
CREATE INDEX "problem_reports_document_id_idx" ON "problem_reports"("document_id");

-- CreateIndex
CREATE INDEX "problem_reports_category_idx" ON "problem_reports"("category");

-- CreateIndex
CREATE INDEX "problem_reports_status_idx" ON "problem_reports"("status");

-- CreateIndex
CREATE INDEX "problem_reports_urgency_idx" ON "problem_reports"("urgency");

-- CreateIndex
CREATE INDEX "problem_reports_reported_at_idx" ON "problem_reports"("reported_at");

-- AddForeignKey
ALTER TABLE "problem_reports" ADD CONSTRAINT "problem_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_reports" ADD CONSTRAINT "problem_reports_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;