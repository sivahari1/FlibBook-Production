/*
  Warnings:

  - The values [READER_USER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'PLATFORM_USER', 'MEMBER');
ALTER TABLE "public"."users" ALTER COLUMN "userRole" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "userRole" TYPE "UserRole_new" USING ("userRole"::text::"UserRole_new");
ALTER TABLE "access_requests" ALTER COLUMN "requestedRole" TYPE "UserRole_new" USING ("requestedRole"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "userRole" SET DEFAULT 'MEMBER';
COMMIT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "freeDocumentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paidDocumentCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userRole" SET DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "book_shop_items" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "price" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "my_jstudyroom_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookShopItemId" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "my_jstudyroom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookShopItemId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_shop_items_documentId_idx" ON "book_shop_items"("documentId");

-- CreateIndex
CREATE INDEX "book_shop_items_category_idx" ON "book_shop_items"("category");

-- CreateIndex
CREATE INDEX "book_shop_items_isPublished_idx" ON "book_shop_items"("isPublished");

-- CreateIndex
CREATE INDEX "my_jstudyroom_items_userId_idx" ON "my_jstudyroom_items"("userId");

-- CreateIndex
CREATE INDEX "my_jstudyroom_items_bookShopItemId_idx" ON "my_jstudyroom_items"("bookShopItemId");

-- CreateIndex
CREATE UNIQUE INDEX "my_jstudyroom_items_userId_bookShopItemId_key" ON "my_jstudyroom_items"("userId", "bookShopItemId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayOrderId_key" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayPaymentId_key" ON "payments"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_bookShopItemId_idx" ON "payments"("bookShopItemId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_razorpayOrderId_idx" ON "payments"("razorpayOrderId");

-- AddForeignKey
ALTER TABLE "book_shop_items" ADD CONSTRAINT "book_shop_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "my_jstudyroom_items" ADD CONSTRAINT "my_jstudyroom_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "my_jstudyroom_items" ADD CONSTRAINT "my_jstudyroom_items_bookShopItemId_fkey" FOREIGN KEY ("bookShopItemId") REFERENCES "book_shop_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookShopItemId_fkey" FOREIGN KEY ("bookShopItemId") REFERENCES "book_shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
