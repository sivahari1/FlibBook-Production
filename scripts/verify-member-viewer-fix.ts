import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyMemberViewerFix() {
  try {
    console.log('🔍 Verifying member viewer fix...\n')
    
    // Get a member with jStudyRoom access
    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        user: true,
        bookShopItem: {
          include: {
            document: true
          }
        }
      }
    })
    
    if (!myJstudyroomItem) {
      console.log('❌ No jStudyRoom items found')
      return
    }
    
    const documentId = myJstudyroomItem.bookShopItem.documentId
    const userEmail = myJstudyroomItem.user.email
    
    console.log(`📖 Testing document: ${myJstudyroomItem.bookShopItem.title}`)
    console.log(`👤 Member: ${userEmail}`)
    console.log(`🆔 Document ID: ${documentId}\n`)
    
    // Test the new member pages API
    console.log('🔗 Testing new member pages API structure...')
    
    try {
      // This will fail without auth, but we can check the URL structure
      const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${documentId}/pages`)
      
      console.log(`Status: ${response.status}`)
      
      if (response.status === 401) {
        console.log('✅ API requires authentication (expected)')
      }
      
      // Test the new member page endpoint
      console.log('\n🔗 Testing new member page endpoint...')
      const pageResponse = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${documentId}/pages/1`)
      
      console.log(`Page API Status: ${pageResponse.status}`)
      
      if (pageResponse.status === 401) {
        console.log('✅ Page API requires authentication (expected)')
      }
      
    } catch (fetchError) {
      console.log('❌ Fetch Error:', fetchError)
    }
    
    console.log('\n📋 Fix Summary:')
    console.log('✅ Created member-specific page API endpoints')
    console.log('✅ Modified member viewer to use fetch with credentials')
    console.log('✅ Added blob URL creation for direct image loading')
    console.log('✅ Added proper cleanup for blob URLs')
    
    console.log('\n🎯 Expected Behavior:')
    console.log('1. Member logs in and navigates to jStudyRoom')
    console.log('2. Clicks on a document to view')
    console.log('3. Viewer loads pages using authenticated fetch requests')
    console.log('4. Creates blob URLs from SVG responses')
    console.log('5. Images display without "Image load error" console errors')
    
    console.log('\n🧪 To test manually:')
    console.log('1. Open http://localhost:3000')
    console.log(`2. Login as: ${userEmail}`)
    console.log('3. Go to Member Dashboard > My jStudyRoom')
    console.log(`4. Click "View" on "${myJstudyroomItem.bookShopItem.title}"`)
    console.log('5. Check browser console - should see no "Image load error" messages')
    console.log('6. Should see "✅ Loaded pages with blob URLs: X" message instead')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyMemberViewerFix()