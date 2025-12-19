#!/usr/bin/env tsx

/**
 * Diagnose Current JStudyRoom Document Viewing Issue
 * 
 * This script will identify and fix the current document viewing problems
 * based on the errors shown in the browser console.
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function diagnoseCurrentIssue() {
  console.log('🔍 Diagnosing current JStudyRoom document viewing issue...')
  
  try {
    // 1. Check database connection
    console.log('\n1. Testing database connection...')
    const userCount = await prisma.user.count()
    console.log(`✅ Database connected. Found ${userCount} users.`)
    
    // 2. Check for documents in My JStudyRoom
    console.log('\n2. Checking My JStudyRoom documents...')
    const myJStudyRoomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      }
    })
    
    console.log(`📚 Found ${myJStudyRoomItems.length} items in My JStudyRoom`)
    
    if (myJStudyRoomItems.length > 0) {
      const item = myJStudyRoomItems[0]
      const document = item.bookShopItem?.document
      console.log(`\n📄 Sample item:`)
      console.log(`- ID: ${item.id}`)
      console.log(`- BookShop Item ID: ${item.bookShopItemId}`)
      console.log(`- Document ID: ${document?.id || 'N/A'}`)
      console.log(`- Document Title: ${document?.title || 'N/A'}`)
      console.log(`- Document Type: ${document?.contentType || 'N/A'}`)
      console.log(`- User: ${item.user?.email || 'N/A'}`)
      console.log(`- Is Free: ${item.isFree}`)
      
      // 3. Check document conversion status
      console.log('\n3. Checking document conversion status...')
      if (document) {
        console.log(`- Storage Path: ${document.storagePath || 'N/A'}`)
        console.log(`- MIME Type: ${document.mimeType || 'N/A'}`)
        
        // Check for document pages
        const pages = await prisma.documentPage.findMany({
          where: { documentId: document.id }
        })
        console.log(`- Pages: ${pages.length}`)
        
        if (pages.length === 0) {
          console.log('❌ No pages found - document needs conversion!')
        } else {
          console.log(`✅ Found ${pages.length} pages`)
          console.log(`- Sample page URL: ${pages[0]?.pageUrl || 'N/A'}`)
        }
      }
    }
    
    // 4. Check Supabase connection
    console.log('\n4. Testing Supabase connection...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase environment variables missing!')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    try {
      const { data, error } = await supabase.storage.listBuckets()
      if (error) {
        console.log('❌ Supabase connection error:', error.message)
      } else {
        console.log('✅ Supabase connected successfully')
        console.log(`📦 Found ${data?.length || 0} storage buckets`)
      }
    } catch (err) {
      console.log('❌ Supabase connection failed:', err)
    }
    
    // 5. Check API endpoints
    console.log('\n5. Testing API endpoints...')
    
    if (myJStudyRoomItems.length > 0) {
      const testItemId = myJStudyRoomItems[0].id
      
      try {
        const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${testItemId}`)
        console.log(`API /api/member/my-jstudyroom/${testItemId}: ${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log('❌ API Error:', errorText)
        } else {
          console.log('✅ API endpoint working')
        }
      } catch (err) {
        console.log('❌ API test failed:', err)
      }
    }
    
    // 6. Provide recommendations
    console.log('\n📋 RECOMMENDATIONS:')
    
    if (myJStudyRoomItems.length === 0) {
      console.log('1. No documents in My JStudyRoom - add some documents first')
    } else {
      // Check for documents that might need conversion
      const documentsNeedingConversion = myJStudyRoomItems.filter(item => {
        const doc = item.bookShopItem?.document
        return doc && doc.contentType === 'PDF'
      })
      
      if (documentsNeedingConversion.length > 0) {
        console.log(`1. Found ${documentsNeedingConversion.length} PDF documents that may need conversion`)
      }
      
      const docsWithoutPages = await Promise.all(
        myJStudyRoomItems.map(async (item) => {
          const documentId = item.bookShopItem?.document?.id
          if (!documentId) return { item, pageCount: 0 }
          
          const pageCount = await prisma.documentPage.count({
            where: { documentId }
          })
          return { item, pageCount }
        })
      )
      
      const needPages = docsWithoutPages.filter(d => d.pageCount === 0)
      if (needPages.length > 0) {
        console.log(`2. ${needPages.length} documents have no pages - need reconversion`)
      }
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run diagnosis
diagnoseCurrentIssue().catch(console.error)