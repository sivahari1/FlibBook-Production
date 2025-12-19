-- Add conversion analytics tables for tracking performance metrics and user experience

-- Table for tracking conversion performance metrics
CREATE TABLE "conversion_analytics" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "conversion_job_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'started',
    "error_type" TEXT,
    "error_message" TEXT,
    "pages_processed" INTEGER DEFAULT 0,
    "total_pages" INTEGER DEFAULT 0,
    "file_size_bytes" BIGINT,
    "processing_method" TEXT DEFAULT 'standard',
    "quality_level" TEXT DEFAULT 'standard',
    "retry_count" INTEGER DEFAULT 0,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_analytics_pkey" PRIMARY KEY ("id")
);

-- Table for tracking document loading performance
CREATE TABLE "document_load_analytics" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "first_page_loaded_at" TIMESTAMP(3),
    "fully_loaded_at" TIMESTAMP(3),
    "load_duration_ms" INTEGER,
    "first_page_duration_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'started',
    "error_type" TEXT,
    "error_message" TEXT,
    "pages_loaded" INTEGER DEFAULT 0,
    "total_pages" INTEGER DEFAULT 0,
    "cache_hit_rate" DECIMAL(5,2),
    "network_type" TEXT,
    "device_type" TEXT,
    "browser_info" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_load_analytics_pkey" PRIMARY KEY ("id")
);

-- Table for tracking user experience metrics
CREATE TABLE "user_experience_analytics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "session_id" TEXT,
    "action_type" TEXT NOT NULL, -- 'view_start', 'page_change', 'error_encountered', 'retry_attempt', 'session_end'
    "action_timestamp" TIMESTAMP(3) NOT NULL,
    "page_number" INTEGER,
    "time_spent_ms" INTEGER,
    "error_type" TEXT,
    "user_agent" TEXT,
    "viewport_width" INTEGER,
    "viewport_height" INTEGER,
    "connection_speed" TEXT,
    "satisfaction_score" INTEGER, -- 1-5 rating if provided
    "feedback_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_experience_analytics_pkey" PRIMARY KEY ("id")
);

-- Table for system performance metrics
CREATE TABLE "system_performance_metrics" (
    "id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL, -- 'conversion_queue_depth', 'storage_usage', 'cache_hit_rate', 'error_rate'
    "metric_value" DECIMAL(10,2) NOT NULL,
    "metric_unit" TEXT NOT NULL, -- 'count', 'percentage', 'bytes', 'milliseconds'
    "time_period" TEXT NOT NULL, -- 'hourly', 'daily', 'weekly'
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX "conversion_analytics_document_id_idx" ON "conversion_analytics"("document_id");
CREATE INDEX "conversion_analytics_status_idx" ON "conversion_analytics"("status");
CREATE INDEX "conversion_analytics_started_at_idx" ON "conversion_analytics"("started_at");
CREATE INDEX "conversion_analytics_user_id_idx" ON "conversion_analytics"("user_id");
CREATE INDEX "conversion_analytics_error_type_idx" ON "conversion_analytics"("error_type");
CREATE INDEX "conversion_analytics_duration_idx" ON "conversion_analytics"("duration_ms");

CREATE INDEX "document_load_analytics_document_id_idx" ON "document_load_analytics"("document_id");
CREATE INDEX "document_load_analytics_user_id_idx" ON "document_load_analytics"("user_id");
CREATE INDEX "document_load_analytics_status_idx" ON "document_load_analytics"("status");
CREATE INDEX "document_load_analytics_started_at_idx" ON "document_load_analytics"("started_at");
CREATE INDEX "document_load_analytics_session_id_idx" ON "document_load_analytics"("session_id");
CREATE INDEX "document_load_analytics_load_duration_idx" ON "document_load_analytics"("load_duration_ms");

CREATE INDEX "user_experience_analytics_user_id_idx" ON "user_experience_analytics"("user_id");
CREATE INDEX "user_experience_analytics_document_id_idx" ON "user_experience_analytics"("document_id");
CREATE INDEX "user_experience_analytics_action_type_idx" ON "user_experience_analytics"("action_type");
CREATE INDEX "user_experience_analytics_action_timestamp_idx" ON "user_experience_analytics"("action_timestamp");
CREATE INDEX "user_experience_analytics_session_id_idx" ON "user_experience_analytics"("session_id");

CREATE INDEX "system_performance_metrics_metric_type_idx" ON "system_performance_metrics"("metric_type");
CREATE INDEX "system_performance_metrics_recorded_at_idx" ON "system_performance_metrics"("recorded_at");
CREATE INDEX "system_performance_metrics_time_period_idx" ON "system_performance_metrics"("time_period");

-- Add foreign key constraints
ALTER TABLE "conversion_analytics" ADD CONSTRAINT "conversion_analytics_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversion_analytics" ADD CONSTRAINT "conversion_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversion_analytics" ADD CONSTRAINT "conversion_analytics_conversion_job_id_fkey" FOREIGN KEY ("conversion_job_id") REFERENCES "conversion_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_load_analytics" ADD CONSTRAINT "document_load_analytics_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_load_analytics" ADD CONSTRAINT "document_load_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_experience_analytics" ADD CONSTRAINT "user_experience_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_experience_analytics" ADD CONSTRAINT "user_experience_analytics_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;