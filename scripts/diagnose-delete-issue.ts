import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDeleteIssue() {
  console.log('🔍 Diagnosing document deletion issue...\n');

  try {
    // Get a sample document
    const documents = await prisma.document.findMany({
      take: 1,
      include: {
        documentPages: true,
        shares: true,
        emailShares: true,
      }
    });

    if (documents.length === 0) {
      console.log('❌ No documents found in database');
      return;
    }

    const doc = documents[0];
    console.log('📄 Sample Document:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Title: ${doc.title}`);
    console.log(`   Type: ${doc.contentType}`);
    console.log(`   Pages: ${doc.documentPages?.length || 0}`);
    console.log(`   Shares: ${doc.shares?.length || 0}`);
    console.log(`   Email Shares: ${doc.emailShares?.length || 0}`);
    console.log();

    // Check for foreign key constraints
    console.log('🔗 Checking foreign key relationships:');
    
    const relatedData = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM "DocumentPage" WHERE "documentId" = ${doc.id}) as pages,
        (SELECT COUNT(*) FROM "ShareLink" WHERE "documentId" = ${doc.id}) as share_links,
        (SELECT COUNT(*) FROM "EmailShare" WHERE "documentId" = ${doc.id}) as email_shares,
        (SELECT COUNT(*) FROM "Analytics" WHERE "documentId" = ${doc.id}) as analytics,
        (SELECT COUNT(*) FROM "BookShopItem" WHERE "documentId" = ${doc.id}) as bookshop_items,
        (SELECT COUNT(*) FROM "MyJstudyroomItem" WHERE "documentId" = ${doc.id}) as jstudyroom_items
    `;
    
    console.log('   Related records:', relatedData);
    console.log();

    // Test deletion with proper cascade
    console.log('🧪 Testing deletion process...');
    console.log('   This will NOT actually delete, just simulate');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDeleteIssue();
