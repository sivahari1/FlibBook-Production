-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "errorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "context" JSONB,
    "userId" TEXT,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "url" TEXT,
    "stack" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "error_logs_errorId_key" ON "error_logs"("errorId");

-- CreateIndex
CREATE INDEX "error_logs_severity_idx" ON "error_logs"("severity");

-- CreateIndex
CREATE INDEX "error_logs_timestamp_idx" ON "error_logs"("timestamp");

-- CreateIndex
CREATE INDEX "error_logs_userId_idx" ON "error_logs"("userId");
