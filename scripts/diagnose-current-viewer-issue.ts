#!/usr/bin/env tsx

/**
 * Diagnose Current Viewer Issue
 * 
 * Based on the browser console errors, let's identify and fix the specific issues
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseCurrentViewerIssue() {
  console.log('🔍 Diagnosing current viewer issue based on console errors...')
  
  try {
    // 1. Check the specific document that's failing
    const testItemId = 'cmj8rkgdx00019uaweqdedxk8' // From the URL in browser
    
    console.log(`\n1. Checking item: ${testItemId}`)
    
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: testItemId },
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: true
              }
            }
          }
        },
        user: true
      }
    })
    
    if (!item) {
      console.log('❌ Item not found!')
      return
    }
    
    const document = item.bookShopItem?.document
    if (!document) {
      console.log('❌ Document not found!')
      return
    }
    
    console.log(`📄 Document: ${document.title}`)
    console.log(`   ID: ${document.id}`)
    console.log(`   Storage Path: ${document.storagePath}`)
    console.log(`   Content Type: ${document.contentType}`)
    console.log(`   MIME Type: ${document.mimeType}`)
    console.log(`   Pages: ${document.pages?.length || 0}`)
    
    // 2. Test the pages API endpoint directly
    console.log(`\n2. Testing pages API endpoint...`)
    
    try {
      const response = await fetch(`http://localhost:3000/api/documents/${document.id}/pages`)
      console.log(`   Status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log(`   Error: ${errorText}`)
      } else {
        const data = await response.json()
        console.log(`   Success: ${data.success}`)
        console.log(`   Total Pages: ${data.totalPages}`)
        console.log(`   Message: ${data.message || 'None'}`)
      }
    } catch (err) {
      console.log(`   ❌ Fetch error: ${err}`)
    }
    
    // 3. Test individual page endpoint
    console.log(`\n3. Testing individual page endpoint...`)
    
    try {
      const response = await fetch(`http://localhost:3000/api/documents/${document.id}/pages/1`)
      console.log(`   Status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log(`   Error: ${errorText}`)
      } else {
        console.log(`   ✅ Page endpoint working`)
        console.log(`   Content-Type: ${response.headers.get('content-type')}`)
      }
    } catch (err) {
      console.log(`   ❌ Fetch error: ${err}`)
    }
    
    // 4. Check conversion status
    console.log(`\n4. Testing conversion status endpoint...`)
    
    try {
      const response = await fetch(`http://localhost:3000/api/documents/${document.id}/conversion-status`)
      console.log(`   Status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log(`   Error: ${errorText}`)
      } else {
        const data = await response.json()
        console.log(`   Conversion Status: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (err) {
      console.log(`   ❌ Fetch error: ${err}`)
    }
    
    // 5. Check if the document file exists in Supabase
    console.log(`\n5. Checking document file in Supabase...`)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseServiceKey) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(document.storagePath)
        
        if (error) {
          console.log(`   ❌ File not found: ${error.message}`)
        } else {
          console.log(`   ✅ File exists: ${data?.size} bytes`)
        }
      } catch (err) {
        console.log(`   ❌ Storage error: ${err}`)
      }
    } else {
      console.log(`   ❌ Missing Supabase environment variables`)
    }
    
    console.log('\n📋 DIAGNOSIS SUMMARY:')
    console.log('Based on the browser console errors, the main issues are:')
    console.log('1. HTTP 500 errors from conversion API endpoints')
    console.log('2. Document conversion is failing')
    console.log('3. No actual page images are being generated')
    console.log('\nThe placeholder pages we created are not sufficient - we need real conversion.')
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run diagnosis
diagnoseCurrentViewerIssue().catch(console.error)