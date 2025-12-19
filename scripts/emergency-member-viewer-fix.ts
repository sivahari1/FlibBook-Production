import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function emergencyMemberViewerFix() {
  try {
    console.log('🚨 EMERGENCY: Fixing member viewer issue immediately...')
    
    // Get the item ID from the URL
    const urlItemId = 'cmjaxkl3u00049uxg83tuvg0b' // From the URL you're trying to access
    
    console.log('🔍 Checking item:', urlItemId)
    
    // Check if this item exists
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: urlItemId },
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
      console.log('❌ Item not found. Let me check all available items...')
      
      const allItems = await prisma.myJstudyroomItem.findMany({
        include: {
          bookShopItem: {
            include: {
              document: true
            }
          },
          user: true
        }
      })
      
      console.log('📋 Available items:')
      for (const availableItem of allItems) {
        console.log(`   ${availableItem.id} - ${availableItem.bookShopItem.document.title} (${availableItem.user.email})`)
      }
      
      if (allItems.length > 0) {
        console.log(`\n✅ Use this URL instead: http://localhost:3002/member/view/${allItems[0].id}`)
      }
      
      return
    }
    
    console.log('✅ Item found:', {
      id: item.id,
      document: item.bookShopItem.document.title,
      user: item.user.email,
      pages: item.bookShopItem.document.pages.length
    })
    
    // Check if document has pages
    if (item.bookShopItem.document.pages.length === 0) {
      console.log('❌ Document has no pages. Checking document pages table...')
      
      const documentPages = await prisma.documentPage.findMany({
        where: { documentId: item.bookShopItem.document.id }
      })
      
      console.log(`Found ${documentPages.length} pages in document_pages table`)
      
      if (documentPages.length === 0) {
        console.log('🔧 No pages found. Need to convert document...')
        
        // Try to trigger conversion
        try {
          const response = await fetch(`http://localhost:3002/api/documents/${item.bookShopItem.document.id}/convert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            console.log('✅ Document conversion triggered')
          } else {
            console.log('❌ Failed to trigger conversion:', response.status)
          }
        } catch (error) {
          console.log('❌ Error triggering conversion:', error.message)
        }
      }
    }
    
    // Check the member viewer client component
    console.log('🔍 Checking MyJstudyroomViewerClient...')
    
    // Test the API endpoint that the viewer uses
    try {
      const apiResponse = await fetch(`http://localhost:3002/api/member/my-jstudyroom/${item.id}/signed-url`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 API Response status:', apiResponse.status)
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        console.log('❌ API Error:', errorText)
        
        if (apiResponse.status === 401) {
          console.log('🔐 Authentication required. Make sure you are logged in as the correct user.')
        }
      } else {
        const data = await apiResponse.json()
        console.log('✅ API Response:', data)
      }
    } catch (error) {
      console.log('❌ API Error:', error.message)
    }
    
    console.log('\n🎯 IMMEDIATE ACTIONS:')
    console.log('1. Make sure you are logged in as:', item.user.email)
    console.log('2. Use this exact URL:', `http://localhost:3002/member/view/${item.id}`)
    console.log('3. Clear browser cache and cookies')
    console.log('4. If still not working, check browser console for errors')
    
  } catch (error) {
    console.error('❌ Emergency fix error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

emergencyMemberViewerFix()