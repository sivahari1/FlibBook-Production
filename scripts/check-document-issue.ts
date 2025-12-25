import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocumentPages() {
  try {
    const urlDocId = 'crnpakd1c0004bwg8l3uwgb';
    
    console.log('🔍 Checking document pages for ID:', urlDocId);
    
    // First check if this is a direct document ID
    let document = await prisma.document.findUnique({
      where: { id: urlDocId },
      select: { id: true, title: true }
    });
    
    if (!document) {
      console.log('❌ Not found as direct document ID, checking as MyJstudyroomItem ID...');
      
      // Check if it's a MyJstudyroomItem ID
      const item = await prisma.myJstudyroomItem.findUnique({
        where: { id: urlDocId },
        include: {
          bookShopItem: {
            include: {
              document: {
                select: { id: true, title: true }
              }
            }
          }
        }
      });
      
      if (item?.bookShopItem?.document) {
        document = item.bookShopItem.document;
        console.log('✅ Found via MyJstudyroomItem:', document);
      } else {
        console.log('❌ Not found as MyJstudyroomItem either');
        return;
      }
    } else {
      console.log('✅ Found as direct document:', document);
    }
    
    // Check document pages
    const pages = await prisma.documentPage.findMany({
      where: { documentId: document.id },
      orderBy: { pageNumber: 'asc' },
      select: { pageNumber: true, pageUrl: true }
    });
    
    console.log('📄 Document pages found:', pages.length);
    if (pages.length > 0) {
      console.log('First few pages:', pages.slice(0, 3));
    } else {
      console.log('⚠️ No pages found for this document - need to convert it');
      
      // Check if there are any conversion jobs for this document
      const conversionJobs = await prisma.conversionJob.findMany({
        where: { documentId: document.id },
        orderBy: { createdAt: 'desc' },
        select: { 
          id: true, 
          status: true, 
          progress: true, 
          error: true,
          createdAt: true 
        }
      });
      
      console.log('🔄 Conversion jobs found:', conversionJobs.length);
      if (conversionJobs.length > 0) {
        console.log('Latest conversion job:', conversionJobs[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentPages();