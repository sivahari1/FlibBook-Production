#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { getSignedUrl } from '@/lib/storage'

const prisma = new PrismaClient()

async function testPdfViewerDirect() {
  console.log('🔍 Testing PDF Viewer Direct Access')
  console.log('=' .repeat(50))

  try {
    // Get a PDF document
    const document = await prisma.document.findFirst({
      where: {
        contentType: 'PDF'
      },
      select: {
        id: true,
        title: true,
        storagePath: true,
        userId: true,
        mimeType: true
      }
    })

    if (!document) {
      console.log('❌ No PDF documents found')
      return
    }

    console.log(`\n📄 Testing PDF: ${document.title}`)
    console.log(`   ID: ${document.id}`)
    console.log(`   Storage Path: ${document.storagePath}`)
    console.log(`   MIME Type: ${document.mimeType}`)

    // Generate signed URL for the PDF
    const { url: signedUrl, error } = await getSignedUrl(
      document.storagePath,
      3600, // 1 hour
      'documents' // PDF bucket
    )

    if (error || !signedUrl) {
      console.log('❌ Failed to generate signed URL:', error)
      return
    }

    console.log(`\n✅ Generated signed URL successfully`)
    console.log(`   URL length: ${signedUrl.length} characters`)
    console.log(`   URL starts with: ${signedUrl.substring(0, 100)}...`)

    // Test if the URL is accessible
    try {
      const response = await fetch(signedUrl, { method: 'HEAD' })
      console.log(`\n🌐 URL accessibility test:`)
      console.log(`   Status: ${response.status} ${response.statusText}`)
      console.log(`   Content-Type: ${response.headers.get('content-type')}`)
      console.log(`   Content-Length: ${response.headers.get('content-length')}`)
      
      if (response.ok) {
        console.log(`   ✅ PDF file is accessible`)
      } else {
        console.log(`   ❌ PDF file is not accessible`)
      }
    } catch (fetchError) {
      console.log(`\n❌ Error testing URL accessibility:`, fetchError)
    }

    // Generate test URLs
    console.log(`\n🔗 Test URLs for browser:`)
    console.log(`   Direct PDF URL: ${signedUrl}`)
    console.log(`   Document View: http://localhost:3000/dashboard/documents/${document.id}/view`)
    console.log(`   Document Preview: http://localhost:3000/dashboard/documents/${document.id}/preview`)

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: document.userId },
      select: {
        email: true,
        userRole: true
      }
    })

    if (user) {
      console.log(`\n👤 Document owner: ${user.email} (${user.userRole})`)
      console.log(`\n💡 To test:`)
      console.log(`   1. Login as ${user.email}`)
      console.log(`   2. Open: http://localhost:3000/dashboard/documents/${document.id}/view`)
      console.log(`   3. The PDF should render using PDF.js`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPdfViewerDirect()