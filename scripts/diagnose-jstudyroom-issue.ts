#!/usr/bin/env tsx

/**
 * Diagnostic script to check jStudyRoom document viewing issues
 */

import { prisma } from '../lib/db';

async function diagnoseJStudyRoomIssue() {
  console.log('🔍 Diagnosing jStudyRoom document viewing issues...\n');

  try {
    // 1. Check if there are any MyJstudyroom items
    console.log('📚 Checking MyJstudyroom items...');
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        bookShopItem: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                contentType: true,
                storagePath: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    console.log(`Found ${myJstudyroomItems.length} MyJstudyroom items\n`);

    if (myJstudyroomItems.length === 0) {
      console.log('❌ No MyJstudyroom items found. Users need to add documents from bookshop first.');
      
      // Check if there are any bookshop items available
      console.log('\n📖 Checking available bookshop items...');
      const bookshopItems = await prisma.bookShopItem.findMany({
        where: {
          isPublished: true
        },
        include: {
          document: {
            select: {
              title: true,
              contentType: true
            }
          }
        },
        take: 5
      });

      console.log(`Found ${bookshopItems.length} published bookshop items:`);
      bookshopItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} (${item.document.contentType}) - ${item.isFree ? 'FREE' : `₹${item.price}`}`);
      });

      if (bookshopItems.length > 0) {
        console.log('\n💡 Solution: Users need to visit the bookshop and add documents to their jStudyRoom');
      }
    } else {
      console.log('✅ MyJstudyroom items found:');
      myJstudyroomItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.bookShopItem.title}`);
        console.log(`      User: ${item.user.email} (${item.user.role})`);
        console.log(`      Document: ${item.bookShopItem.document.title} (${item.bookShopItem.document.contentType})`);
        console.log(`      Added: ${item.addedAt}`);
        console.log(`      Free: ${item.isFree}`);
        console.log('');
      });
    }

    // 2. Check for conversion status issues
    console.log('🔄 Checking document conversion status...');
    const documentsNeedingConversion = await prisma.document.findMany({
      where: {
        contentType: 'PDF',
        bookShopItems: {
          some: {
            myJstudyroomItems: {
              some: {}
            }
          }
        }
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        storagePath: true,
        createdAt: true
      },
      take: 5
    });

    console.log(`Found ${documentsNeedingConversion.length} PDF documents in jStudyRoom that may need conversion:`);
    documentsNeedingConversion.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title} (ID: ${doc.id})`);
    });

    // 3. Check conversion jobs
    console.log('\n⚙️ Checking conversion jobs...');
    const conversionJobs = await prisma.conversionJob.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${conversionJobs.length} conversion jobs:`);
    conversionJobs.forEach((job, index) => {
      console.log(`   ${index + 1}. Document ${job.documentId}`);
      console.log(`      Status: ${job.status}`);
      console.log(`      Stage: ${job.stage}`);
      console.log(`      Progress: ${job.progress}%`);
      console.log(`      Created: ${job.createdAt}`);
      console.log(`      Updated: ${job.updatedAt}`);
      if (job.errorMessage) {
        console.log(`      Error: ${job.errorMessage}`);
      }
      console.log('');
    });

    // 4. Check users and their document counts
    console.log('👥 Checking users and their document counts...');
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['MEMBER', 'ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        freeDocumentCount: true,
        paidDocumentCount: true,
        _count: {
          select: {
            myJstudyroomItems: true
          }
        }
      }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role})`);
      console.log(`      Free docs: ${user.freeDocumentCount || 0}/5`);
      console.log(`      Paid docs: ${user.paidDocumentCount || 0}/5`);
      console.log(`      MyJstudyroom items: ${user._count.myJstudyroomItems}`);
      console.log('');
    });

    // 5. Test the API endpoint
    console.log('🔗 Testing MyJstudyroom API endpoint...');
    
    // Find a user with MyJstudyroom items
    const userWithItems = users.find(user => user._count.myJstudyroomItems > 0);
    
    if (userWithItems) {
      console.log(`Testing API for user: ${userWithItems.email}`);
      
      // Simulate API call
      const apiItems = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: userWithItems.id,
        },
        include: {
          bookShopItem: {
            include: {
              document: {
                select: {
                  id: true,
                  title: true,
                  filename: true,
                  contentType: true,
                  metadata: true,
                },
              },
            },
          },
        },
        orderBy: {
          addedAt: 'desc',
        },
      });

      console.log(`API would return ${apiItems.length} items for this user`);
      
      if (apiItems.length > 0) {
        console.log('Sample API response structure:');
        const sampleItem = apiItems[0];
        console.log({
          id: sampleItem.id,
          bookShopItemId: sampleItem.bookShopItemId,
          title: sampleItem.bookShopItem.title,
          category: sampleItem.bookShopItem.category,
          isFree: sampleItem.isFree,
          addedAt: sampleItem.addedAt,
          documentId: sampleItem.bookShopItem.document.id,
          documentTitle: sampleItem.bookShopItem.document.title,
          contentType: sampleItem.bookShopItem.document.contentType,
        });
      }
    } else {
      console.log('❌ No users found with MyJstudyroom items to test API');
    }

    // 6. Summary and recommendations
    console.log('\n📋 Summary and Recommendations:');
    
    if (myJstudyroomItems.length === 0) {
      console.log('❌ ISSUE: No documents in any user\'s jStudyRoom');
      console.log('💡 SOLUTION: Users need to:');
      console.log('   1. Visit the bookshop (/member/bookshop)');
      console.log('   2. Add documents to their jStudyRoom');
      console.log('   3. Then visit My jStudyRoom (/member/my-jstudyroom)');
    } else {
      console.log('✅ Documents found in jStudyRoom');
      
      // Check for conversion issues
      const failedJobs = conversionJobs.filter(job => job.status === 'failed');
      if (failedJobs.length > 0) {
        console.log(`⚠️  WARNING: ${failedJobs.length} failed conversion jobs found`);
        console.log('💡 SOLUTION: Check conversion service and retry failed conversions');
      }
      
      const stuckJobs = conversionJobs.filter(job => 
        job.status === 'processing' && 
        new Date().getTime() - new Date(job.updatedAt).getTime() > 5 * 60 * 1000 // 5 minutes
      );
      
      if (stuckJobs.length > 0) {
        console.log(`⚠️  WARNING: ${stuckJobs.length} stuck conversion jobs found`);
        console.log('💡 SOLUTION: Restart conversion service or cancel stuck jobs');
      }
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseJStudyRoomIssue().catch(console.error);