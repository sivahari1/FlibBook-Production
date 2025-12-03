/**
 * Create DocumentPage table for caching converted PDF pages
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function createDocumentPagesTable() {
  console.log('🚀 Creating DocumentPage table...\n');

  try {
    // Create the table using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "DocumentPage" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "documentId" TEXT NOT NULL,
        "pageNumber" INTEGER NOT NULL,
        "pageUrl" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "DocumentPage_documentId_fkey" 
          FOREIGN KEY ("documentId") 
          REFERENCES "Document"("id") 
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      );
    `;

    console.log('✅ DocumentPage table created successfully!');

    // Create indexes for better performance
    console.log('\n📊 Creating indexes...');
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "DocumentPage_documentId_idx" 
      ON "DocumentPage"("documentId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "DocumentPage_expiresAt_idx" 
      ON "DocumentPage"("expiresAt");
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "DocumentPage_documentId_pageNumber_key" 
      ON "DocumentPage"("documentId", "pageNumber");
    `;

    console.log('✅ Indexes created successfully!');

    console.log('\n📋 Table structure:');
    console.log('  - id: TEXT (Primary Key)');
    console.log('  - documentId: TEXT (Foreign Key to Document)');
    console.log('  - pageNumber: INTEGER');
    console.log('  - pageUrl: TEXT');
    console.log('  - fileSize: INTEGER');
    console.log('  - createdAt: TIMESTAMP');
    console.log('  - expiresAt: TIMESTAMP');
    console.log('\n✅ Setup complete! The preview feature should now work.');

  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createDocumentPagesTable().catch((error) => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
