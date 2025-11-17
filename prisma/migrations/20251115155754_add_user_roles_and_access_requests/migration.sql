-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PLATFORM_USER', 'READER_USER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pricePlan" TEXT,
ADD COLUMN     "userRole" "UserRole" NOT NULL DEFAULT 'READER_USER';

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "purpose" TEXT NOT NULL,
    "numDocuments" INTEGER,
    "numUsers" INTEGER,
    "requestedRole" "UserRole",
    "extraMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_createdAt_idx" ON "access_requests"("createdAt");

-- CreateIndex
CREATE INDEX "users_userRole_idx" ON "users"("userRole");
