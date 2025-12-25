import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDocumentViewingIssue() {
  try {
    console.log('🔧 Fixing document viewing issue...\n');
    
    // Get all available MyJstudyroomItems with their documents
    const items = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: {
              select: { 
                id: true, 
                title: true, 
                filename: true,
                _count: {
                  select: { pages: true }
                }
              }
            }
          }
        }
      },
      orderBy: { addedAt: 'desc' }
    });
    
    console.log('📋 Available documents in MyJstudyroom:');
    console.log('='.repeat(60));
    
    items.forEach((item, index) => {
      const doc = item.bookShopItem.document;
      const pageCount = doc?._count?.pages || 0;
      const status = pageCount > 0 ? '✅ Ready' : '⚠️ No pages';
      
      console.log(`${index + 1}. ${item.bookShopItem.title}`);
      console.log(`   Item ID: ${item.id}`);
      console.log(`   Document: ${doc?.title || 'N/A'}`);
      console.log(`   Pages: ${pageCount}`);
      console.log(`   Status: ${status}`);
      console.log(`   URL: http://localhost:3001/member/view/${item.id}`);
      console.log('');
    });
    
    // Find items with pages
    const workingItems = items.filter(item => 
      item.bookShopItem.document?._count?.pages && 
      item.bookShopItem.document._count.pages > 0
    );
    
    if (workingItems.length > 0) {
      console.log('🎯 WORKING DOCUMENTS (with pages):');
      console.log('='.repeat(60));
      
      workingItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.bookShopItem.title}`);
        console.log(`   ✅ URL: http://localhost:3001/member/view/${item.id}`);
        console.log('');
      });
      
      console.log('💡 SOLUTION:');
      console.log('Instead of the URL you were trying to access, use one of the working URLs above.');
      console.log('The document ID in your URL (crnpakd1c0004bwg8l3uwgb) does not exist in the database.');
    } else {
      console.log('⚠️ No documents with pages found. You may need to convert some documents first.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixDocumentViewingIssue();