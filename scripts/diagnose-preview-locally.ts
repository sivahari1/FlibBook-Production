import { prisma } from '../lib/db'

async function diagnosePreviewIssue() {
  console.log('🔍 Diagnosing Preview Issue Locally...\n')

  try {
    // 1. Check database connection
    console.log('1️⃣ Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully\n')

    // 2. Check if documents exist
    console.log('2️⃣ Checking for documents...')
    const documents = await prisma.document.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        contentType: true,
        userId: true,
        createdAt: true,
      }
    })

    if (documents.length === 0) {
      console.log('⚠️  No documents found in database')
      console.log('   Please upload a document first\n')
      return
    }

    console.log(`✅ Found ${documents.length} documents:`)
    documents.forEach(doc => {
      console.log(`   - ${doc.title} (${doc.contentType}) - ID: ${doc.id}`)
    })
    console.log('')

    // 3. Check document pages for first document
    const firstDoc = documents[0]
    console.log(`3️⃣ Checking pages for document: ${firstDoc.title}`)
    
    const pages = await prisma.documentPage.findMany({
      where: { documentId: firstDoc.id },
      orderBy: { pageNumber: 'asc' },
      take: 3,
    })

    if (pages.length === 0) {
      console.log('❌ No pages found for this document!')
      console.log('   This is likely the issue - document was uploaded but pages were not generated\n')
      console.log('   Possible causes:')
      console.log('   - PDF conversion failed')
      console.log('   - Document pages not stored in database')
      console.log('   - Supabase storage bucket not configured\n')
      return
    }

    console.log(`✅ Found ${pages.length} pages (showing first 3):`)
    pages.forEach(page => {
      console.log(`   Page ${page.pageNumber}: ${page.imageUrl}`)
    })
    console.log('')

    // 4. Check Supabase configuration
    console.log('4️⃣ Checking Supabase configuration...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      console.log('❌ NEXT_PUBLIC_SUPABASE_URL not set')
    } else {
      console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`)
    }

    if (!supabaseAnonKey) {
      console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
    } else {
      console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`)
    }

    if (!supabaseServiceKey) {
      console.log('❌ SUPABASE_SERVICE_ROLE_KEY not set')
    } else {
      console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey.substring(0, 20)}...`)
    }
    console.log('')

    // 5. Test image URL accessibility
    console.log('5️⃣ Testing image URL accessibility...')
    if (pages.length > 0) {
      const testUrl = pages[0].imageUrl
      console.log(`   Testing URL: ${testUrl}`)
      
      try {
        const response = await fetch(testUrl)
        if (response.ok) {
          console.log(`✅ Image URL is accessible (Status: ${response.status})`)
          console.log(`   Content-Type: ${response.headers.get('content-type')}`)
        } else {
          console.log(`❌ Image URL returned error: ${response.status} ${response.statusText}`)
          console.log('   This means the images are not accessible from Supabase storage')
        }
      } catch (error: any) {
        console.log(`❌ Failed to fetch image: ${error.message}`)
        console.log('   Network error or CORS issue')
      }
    }
    console.log('')

    // 6. Summary
    console.log('📋 SUMMARY:')
    console.log('─'.repeat(50))
    
    if (documents.length > 0 && pages.length > 0) {
      console.log('✅ Documents and pages exist in database')
      console.log(`\n🔗 Test preview URL:`)
      console.log(`   http://localhost:3000/dashboard/documents/${firstDoc.id}/preview`)
      console.log(`\n   Or try view directly:`)
      console.log(`   http://localhost:3000/dashboard/documents/${firstDoc.id}/view`)
    } else {
      console.log('❌ Issue detected - see details above')
    }

  } catch (error: any) {
    console.error('❌ Error during diagnosis:', error.message)
    console.error('\nFull error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnosePreviewIssue()
  .then(() => {
    console.log('\n✅ Diagnosis complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
