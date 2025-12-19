#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDocumentViewingFix() {
  console.log('🔍 Document Viewing Fix Verification')
  console.log('=' .repeat(50))

  try {
    // 1. Check if development server is running
    console.log('\n1. Development Server Check:')
    try {
      const response = await fetch('http://localhost:3000/api/health')
      if (response.ok) {
        console.log('✅ Development server is running')
      } else {
        console.log('❌ Development server responded with error:', response.status)
      }
    } catch (error) {
      console.log('❌ Development server is not running')
      console.log('   Please run: npm run dev')
      return
    }

    // 2. Check database connection
    console.log('\n2. Database Connection:')
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful')

    // 3. Check documents exist
    console.log('\n3. Documents Check:')
    const documentCount = await prisma.document.count()
    console.log(`Found ${documentCount} documents in database`)

    if (documentCount === 0) {
      console.log('❌ No documents found - please upload a test document')
      return
    }

    // 4. Get a test document
    const testDoc = await prisma.document.findFirst({
      select: {
        id: true,
        title: true,
        userId: true,
        contentType: true
      }
    })

    if (!testDoc) {
      console.log('❌ No test document available')
      return
    }

    console.log(`✅ Test document: ${testDoc.title} (${testDoc.id})`)

    // 5. Check document owner
    const owner = await prisma.user.findUnique({
      where: { id: testDoc.userId },
      select: {
        email: true,
        userRole: true,
        isActive: true
      }
    })

    if (!owner) {
      console.log('❌ Document owner not found')
      return
    }

    console.log(`✅ Document owner: ${owner.email} (${owner.userRole})`)

    // 6. Check PDF.js worker file
    console.log('\n4. PDF.js Worker Check:')
    try {
      const fs = await import('fs')
      const workerExists = fs.existsSync('public/pdf.worker.min.js')
      if (workerExists) {
        console.log('✅ PDF.js worker file exists')
      } else {
        console.log('❌ PDF.js worker file missing')
        console.log('   Please copy from node_modules/pdfjs-dist/build/pdf.worker.min.js')
      }
    } catch (error) {
      console.log('⚠️  Could not check PDF.js worker file')
    }

    // 7. Generate test URLs
    console.log('\n5. Test URLs:')
    console.log(`   Test Page: http://localhost:3000/test-pdf-simple`)
    console.log(`   Document View: http://localhost:3000/dashboard/documents/${testDoc.id}/view`)
    console.log(`   Dashboard: http://localhost:3000/dashboard`)

    // 8. Next steps
    console.log('\n6. Next Steps:')
    console.log(`   1. Login as: ${owner.email}`)
    console.log(`   2. Visit test page: http://localhost:3000/test-pdf-simple`)
    console.log(`   3. Check browser console for errors`)
    console.log(`   4. Try document viewer: http://localhost:3000/dashboard/documents/${testDoc.id}/view`)

    console.log('\n✅ Verification complete - system appears ready for testing')

  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyDocumentViewingFix()