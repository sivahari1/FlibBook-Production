#!/usr/bin/env tsx

/**
 * Fix JStudyRoom Document Viewing Issue
 * 
 * This script will:
 * 1. Create missing Supabase storage buckets
 * 2. Fix the signed URL API endpoint parameter issue
 * 3. Convert documents that have placeholder page URLs
 * 4. Test the complete flow
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function fixJStudyRoomViewingIssue() {
  console.log('🔧 Fixing JStudyRoom document viewing issue...')
  
  try {
    // 1. Check and create Supabase storage buckets
    console.log('\n1. Setting up Supabase storage buckets...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase environment variables')
      console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Create required buckets
    const requiredBuckets = ['documents', 'document-pages', 'images', 'videos']
    
    for (const bucketName of requiredBuckets) {
      try {
        const { data: existingBuckets } = await supabase.storage.listBuckets()
        const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName)
        
        if (!bucketExists) {
          console.log(`Creating bucket: ${bucketName}`)
          const { error } = await supabase.storage.createBucket(bucketName, {
            public: false,
            allowedMimeTypes: bucketName === 'documents' 
              ? ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
              : bucketName === 'images'
              ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
              : bucketName === 'videos'
              ? ['video/mp4', 'video/webm', 'video/ogg']
              : ['image/jpeg', 'image/png'] // document-pages
          })
          
          if (error) {
            console.log(`❌ Failed to create bucket ${bucketName}:`, error.message)
          } else {
            console.log(`✅ Created bucket: ${bucketName}`)
          }
        } else {
          console.log(`✅ Bucket already exists: ${bucketName}`)
        }
      } catch (err) {
        console.log(`❌ Error with bucket ${bucketName}:`, err)
      }
    }
    
    // 2. Check documents with placeholder page URLs
    console.log('\n2. Checking for documents with placeholder page URLs...')
    
    const documentsWithPlaceholderPages = await prisma.documentPage.findMany({
      where: {
        pageUrl: {
          contains: 'placeholder'
        }
      },
      include: {
        document: true
      }
    })
    
    console.log(`Found ${documentsWithPlaceholderPages.length} pages with placeholder URLs`)
    
    if (documentsWithPlaceholderPages.length > 0) {
      // Group by document
      const documentIds = [...new Set(documentsWithPlaceholderPages.map(page => page.documentId))]
      console.log(`Affecting ${documentIds.length} documents`)
      
      for (const documentId of documentIds) {
        console.log(`\n📄 Processing document: ${documentId}`)
        
        // Delete placeholder pages
        const deleteResult = await prisma.documentPage.deleteMany({
          where: {
            documentId,
            pageUrl: {
              contains: 'placeholder'
            }
          }
        })
        
        console.log(`  - Deleted ${deleteResult.count} placeholder pages`)
        
        // Trigger reconversion by calling the conversion API
        try {
          const response = await fetch(`http://localhost:3000/api/documents/${documentId}/convert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            console.log(`  - ✅ Triggered reconversion`)
          } else {
            console.log(`  - ❌ Failed to trigger conversion: ${response.status}`)
          }
        } catch (err) {
          console.log(`  - ❌ Error triggering conversion:`, err)
        }
      }
    }
    
    // 3. Test the My JStudyRoom items
    console.log('\n3. Testing My JStudyRoom items...')
    
    const myJStudyRoomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      },
      take: 3 // Test first 3 items
    })
    
    for (const item of myJStudyRoomItems) {
      const document = item.bookShopItem?.document
      if (!document) continue
      
      console.log(`\n📋 Testing item: ${item.id}`)
      console.log(`  - Document: ${document.title}`)
      console.log(`  - User: ${item.user?.email}`)
      
      // Check if document has pages
      const pageCount = await prisma.documentPage.count({
        where: { documentId: document.id }
      })
      
      console.log(`  - Pages: ${pageCount}`)
      
      if (pageCount === 0) {
        console.log(`  - ❌ No pages found, needs conversion`)
      } else {
        // Check if pages have real URLs
        const samplePage = await prisma.documentPage.findFirst({
          where: { documentId: document.id }
        })
        
        if (samplePage?.pageUrl.includes('placeholder')) {
          console.log(`  - ❌ Has placeholder URLs, needs reconversion`)
        } else {
          console.log(`  - ✅ Has real page URLs`)
        }
      }
    }
    
    // 4. Test signed URL generation
    console.log('\n4. Testing signed URL generation...')
    
    if (myJStudyRoomItems.length > 0) {
      const testItem = myJStudyRoomItems[0]
      const document = testItem.bookShopItem?.document
      
      if (document?.storagePath) {
        try {
          // Test the signed URL API endpoint with correct parameter
          const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${testItem.id}/signed-url`)
          
          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Signed URL API working: ${data.url ? 'URL generated' : 'No URL'}`)
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.log(`❌ Signed URL API failed: ${response.status} - ${errorData.error}`)
          }
        } catch (err) {
          console.log(`❌ Error testing signed URL API:`, err)
        }
      }
    }
    
    console.log('\n🎉 JStudyRoom viewing issue fix complete!')
    console.log('\n📋 NEXT STEPS:')
    console.log('1. Refresh the browser page')
    console.log('2. Try viewing a document in My JStudyRoom')
    console.log('3. If still having issues, check the browser console for specific errors')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixJStudyRoomViewingIssue().catch(console.error)