#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function diagnoseDocumentViewing() {
  console.log('🔍 Comprehensive Document Viewing Diagnosis')
  console.log('=' .repeat(50))

  try {
    // 1. Check database connection
    console.log('\n1. Database Connection Test:')
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connected successfully')

    // 2. Check documents in database
    console.log('\n2. Documents in Database:')
    const documents = await prisma.document.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        contentType: true,
        createdAt: true,
        userId: true
      }
    })
    
    console.log(`Found ${documents.length} documents:`)
    documents.forEach(doc => {
      console.log(`  - ${doc.title} (${doc.contentType})`)
    })

    if (documents.length === 0) {
      console.log('❌ No documents found in database')
      return
    }

    // 3. Check document pages for first document
    const firstDoc = documents[0]
    console.log(`\n3. Checking pages for document: ${firstDoc.title}`)
    
    const pages = await prisma.documentPage.findMany({
      where: { documentId: firstDoc.id },
      take: 3,
      select: {
        pageNumber: true,
        pageUrl: true,
        createdAt: true
      }
    })

    console.log(`Found ${pages.length} pages for document ${firstDoc.id}:`)
    pages.forEach(page => {
      console.log(`  - Page ${page.pageNumber}: ${page.pageUrl}`)
    })

    if (pages.length === 0) {
      console.log('❌ No pages found for document - this is the issue!')
      
      // Check conversion jobs for this document
      console.log('\n4. Checking conversion jobs:')
      const conversionJobs = await prisma.conversionJob.findMany({
        where: { documentId: firstDoc.id },
        select: {
          status: true,
          progress: true,
          stage: true,
          errorMessage: true,
          createdAt: true
        }
      })
      
      if (conversionJobs.length === 0) {
        console.log('No conversion jobs found - document needs conversion')
        
        // Try to convert the document
        console.log('Attempting to convert document...')
        const response = await fetch(`http://localhost:3000/api/documents/${firstDoc.id}/convert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          console.log('✅ Document conversion initiated')
        } else {
          console.log('❌ Document conversion failed:', await response.text())
        }
      } else {
        console.log('Conversion jobs found:')
        conversionJobs.forEach(job => {
          console.log(`  - Status: ${job.status}, Progress: ${job.progress}%, Stage: ${job.stage}`)
          if (job.errorMessage) {
            console.log(`    Error: ${job.errorMessage}`)
          }
        })
      }
    }

    // 4. Check Supabase storage
    console.log('\n5. Supabase Storage Test:')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.log('❌ Supabase storage error:', bucketsError.message)
    } else {
      console.log('✅ Supabase storage connected')
      console.log('Available buckets:', buckets.map(b => b.name))
      
      // Check document-pages bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('document-pages')
        .list('', { limit: 5 })
      
      if (filesError) {
        console.log('❌ Error accessing document-pages bucket:', filesError.message)
      } else {
        console.log(`Found ${files.length} files in document-pages bucket`)
      }
    }

    // 5. Test API endpoints
    console.log('\n6. Testing API Endpoints:')
    
    // Test documents API
    try {
      const docsResponse = await fetch('http://localhost:3000/api/documents')
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        console.log(`✅ Documents API working - returned ${docsData.documents?.length || 0} documents`)
      } else {
        console.log('❌ Documents API failed:', docsResponse.status)
      }
    } catch (error) {
      console.log('❌ Documents API error:', error)
    }

    // Test pages API for first document
    if (firstDoc) {
      try {
        const pagesResponse = await fetch(`http://localhost:3000/api/documents/${firstDoc.id}/pages`)
        if (pagesResponse.ok) {
          const pagesData = await pagesResponse.json()
          console.log(`✅ Pages API working - returned ${pagesData.pages?.length || 0} pages`)
        } else {
          console.log('❌ Pages API failed:', pagesResponse.status, await pagesResponse.text())
        }
      } catch (error) {
        console.log('❌ Pages API error:', error)
      }
    }

    // 6. Check user permissions
    console.log('\n7. User Permissions Check:')
    const users = await prisma.user.findMany({
      take: 3,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    })
    
    console.log('Users in system:')
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Active: ${user.isActive}`)
    })

  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseDocumentViewing()