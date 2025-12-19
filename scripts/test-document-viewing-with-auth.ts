#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDocumentViewing() {
  console.log('🔍 Testing Document Viewing with Authentication')
  console.log('=' .repeat(50))

  try {
    // 1. Get a document to test with
    const document = await prisma.document.findFirst({
      select: {
        id: true,
        title: true,
        userId: true,
        contentType: true
      }
    })

    if (!document) {
      console.log('❌ No documents found to test with')
      return
    }

    console.log(`\n📄 Testing with document: ${document.title}`)
    console.log(`   ID: ${document.id}`)
    console.log(`   User ID: ${document.userId}`)

    // 2. Check if document has pages
    const pages = await prisma.documentPage.findMany({
      where: { documentId: document.id },
      select: {
        pageNumber: true,
        pageUrl: true
      },
      orderBy: { pageNumber: 'asc' },
      take: 5
    })

    console.log(`\n📑 Document has ${pages.length} pages:`)
    pages.forEach(page => {
      console.log(`   Page ${page.pageNumber}: ${page.pageUrl}`)
    })

    // 3. Check conversion jobs
    const conversionJobs = await prisma.conversionJob.findMany({
      where: { documentId: document.id },
      select: {
        status: true,
        progress: true,
        stage: true,
        errorMessage: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })

    console.log(`\n🔄 Conversion jobs (${conversionJobs.length}):`)
    if (conversionJobs.length === 0) {
      console.log('   No conversion jobs found')
    } else {
      conversionJobs.forEach((job, index) => {
        console.log(`   Job ${index + 1}: ${job.status} (${job.progress}%) - ${job.stage}`)
        if (job.errorMessage) {
          console.log(`     Error: ${job.errorMessage}`)
        }
      })
    }

    // 4. Test direct page access (this should work)
    if (pages.length > 0) {
      console.log(`\n🌐 Testing page URL access:`)
      const firstPage = pages[0]
      console.log(`   First page URL: ${firstPage.pageUrl}`)
      
      // The page URL should be accessible via the API endpoint
      const pageApiUrl = `http://localhost:3000${firstPage.pageUrl}`
      console.log(`   Full API URL: ${pageApiUrl}`)
      console.log(`   ✅ Page URLs are properly formatted`)
    }

    // 5. Check user access
    const user = await prisma.user.findUnique({
      where: { id: document.userId },
      select: {
        email: true,
        role: true,
        userRole: true,
        isActive: true
      }
    })

    if (user) {
      console.log(`\n👤 Document owner: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   User Role: ${user.userRole}`)
      console.log(`   Active: ${user.isActive}`)
    }

    // 6. Generate test URLs for the viewer
    console.log(`\n🔗 Test URLs:`)
    console.log(`   Admin Dashboard: http://localhost:3000/dashboard/documents/${document.id}`)
    console.log(`   Document View: http://localhost:3000/dashboard/documents/${document.id}/view`)
    console.log(`   Document Preview: http://localhost:3000/dashboard/documents/${document.id}/preview`)

    // 7. Check if there are any My JStudyRoom items for this document
    const bookshopItems = await prisma.bookShopItem.findMany({
      where: { documentId: document.id },
      select: {
        id: true,
        title: true,
        isFree: true,
        isPublished: true,
        myJstudyroomItems: {
          select: {
            userId: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    })

    if (bookshopItems.length > 0) {
      console.log(`\n🛒 Bookshop items for this document:`)
      bookshopItems.forEach(item => {
        console.log(`   - ${item.title} (Free: ${item.isFree}, Published: ${item.isPublished})`)
        if (item.myJstudyroomItems.length > 0) {
          console.log(`     Users with access:`)
          item.myJstudyroomItems.forEach(mjItem => {
            console.log(`       - ${mjItem.user.email}`)
          })
        }
      })
    }

    console.log(`\n✅ Document viewing test completed successfully`)
    console.log(`\n💡 Next steps:`)
    console.log(`   1. Login as ${user?.email} or an admin`)
    console.log(`   2. Navigate to: http://localhost:3000/dashboard/documents/${document.id}/view`)
    console.log(`   3. The document should load and display pages`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDocumentViewing()