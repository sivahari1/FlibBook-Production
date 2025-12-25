import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testValidDocument() {
  try {
    // Use a valid MyJstudyroomItem ID from the list
    const validItemId = 'cmjaxkl3u00049uxg83tuvg0b'; // TPIPR document
    
    console.log('🔍 Testing with valid MyJstudyroomItem ID:', validItemId);
    
    // Test the same logic as the API
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: validItemId },
      include: {
        bookShopItem: {
          include: {
            document: {
              select: { id: true, title: true, filename: true }
            }
          }
        }
      }
    });
    
    if (!item) {
      console.log('❌ Item not found');
      return;
    }
    
    console.log('✅ Found item:', {
      itemId: item.id,
      bookShopTitle: item.bookShopItem.title,
      documentId: item.bookShopItem.document?.id,
      documentTitle: item.bookShopItem.document?.title
    });
    
    const documentId = item.bookShopItem.document?.id;
    if (!documentId) {
      console.log('❌ No document associated with this item');
      return;
    }
    
    // Check document pages
    const pages = await prisma.documentPage.findMany({
      where: { documentId },
      orderBy: { pageNumber: 'asc' },
      select: { pageNumber: true, pageUrl: true }
    });
    
    console.log('📄 Document pages found:', pages.length);
    if (pages.length > 0) {
      console.log('✅ Pages available:');
      pages.forEach(page => {
        console.log(`   Page ${page.pageNumber}: ${page.pageUrl}`);
      });
      
      console.log('\n🌐 Test URL:');
      console.log(`http://localhost:3001/member/view/${validItemId}`);
    } else {
      console.log('⚠️ No pages found for this document');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testValidDocument();