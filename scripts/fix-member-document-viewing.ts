import { PrismaClient } from '@prisma/client';
import { getDocumentPageUrl } from '@/lib/supabase-storage';

const prisma = new PrismaClient();

async function fixMemberDocumentViewing() {
  try {
    console.log('🔍 Checking member documents...');
    
    // Get all MyJstudyroom items with their documents and pages
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        user: {
          select: { email: true, name: true }
        },
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: {
                  orderBy: { pageNumber: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    console.log(`📚 Found ${myJstudyroomItems.length} MyJstudyroom items`);

    for (const item of myJstudyroomItems) {
      const document = item.bookShopItem.document;
      console.log(`\n📖 Processing: ${item.bookShopItem.title} (${document.title})`);
      console.log(`   User: ${item.user.email}`);
      console.log(`   Pages: ${document.pages.length}`);

      if (document.pages.length === 0) {
        console.log('   ⚠️  No pages found - document may need conversion');
        continue;
      }

      // Check if pages have pageUrl set
      const pagesWithoutPageUrl = document.pages.filter(page => !page.pageUrl);
      
      if (pagesWithoutPageUrl.length > 0) {
        console.log(`   🔧 Fixing ${pagesWithoutPageUrl.length} pages without pageUrl...`);
        
        for (const page of pagesWithoutPageUrl) {
          // Generate pageUrl using Supabase storage helper
          const pageUrl = getDocumentPageUrl(document.id, page.pageNumber - 1, document.userId);
          
          // Update the page with the generated pageUrl
          await prisma.documentPage.update({
            where: { id: page.id },
            data: { pageUrl }
          });
          
          console.log(`     ✅ Updated page ${page.pageNumber}: ${pageUrl}`);
        }
      } else {
        console.log('   ✅ All pages have pageUrl set');
      }

      // Test if the first page is accessible
      if (document.pages.length > 0) {
        const firstPage = document.pages[0];
        const testUrl = firstPage.pageUrl || getDocumentPageUrl(document.id, 0, document.userId);
        
        try {
          const response = await fetch(testUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('   ✅ First page is accessible');
          } else {
            console.log(`   ⚠️  First page not accessible (${response.status})`);
          }
        } catch (error) {
          console.log('   ❌ Error accessing first page:', error.message);
        }
      }
    }

    console.log('\n🎉 Member document viewing fix completed!');

  } catch (error) {
    console.error('❌ Error fixing member document viewing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMemberDocumentViewing();