import { PrismaClient } from '@prisma/client';
import { getDocumentPageUrl } from '@/lib/supabase-storage';

const prisma = new PrismaClient();

async function convertApiUrlsToStorageUrls() {
  try {
    console.log('🔍 Converting API URLs to direct storage URLs...');
    
    // Find all document pages with API URLs
    const pagesWithApiUrls = await prisma.documentPage.findMany({
      where: {
        pageUrl: {
          startsWith: '/api/'
        }
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            userId: true
          }
        }
      }
    });

    console.log(`📄 Found ${pagesWithApiUrls.length} pages with API URLs`);

    for (const page of pagesWithApiUrls) {
      const document = page.document;
      console.log(`\n🔧 Converting page ${page.pageNumber} of "${document.title}"`);
      console.log(`   Old URL: ${page.pageUrl}`);
      
      // Generate direct storage URL
      const newPageUrl = getDocumentPageUrl(document.id, page.pageNumber - 1, document.userId);
      console.log(`   New URL: ${newPageUrl}`);
      
      // Update the page
      await prisma.documentPage.update({
        where: { id: page.id },
        data: { pageUrl: newPageUrl }
      });
      
      console.log('   ✅ Updated successfully');
    }

    console.log('\n🎉 URL conversion completed!');

    // Now test a few URLs to see if they're accessible
    console.log('\n🧪 Testing converted URLs...');
    
    const testPages = await prisma.documentPage.findMany({
      take: 3,
      include: {
        document: {
          select: {
            title: true
          }
        }
      }
    });

    for (const page of testPages) {
      console.log(`\n🔍 Testing page ${page.pageNumber} of "${page.document.title}"`);
      console.log(`   URL: ${page.pageUrl}`);
      
      try {
        const response = await fetch(page.pageUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('   ✅ Accessible');
        } else {
          console.log(`   ⚠️  Not accessible (${response.status})`);
        }
      } catch (error) {
        console.log('   ❌ Error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error converting URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertApiUrlsToStorageUrls();