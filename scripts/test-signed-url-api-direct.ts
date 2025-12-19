import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSignedUrlApiDirect() {
  try {
    console.log('🧪 Testing signed URL API directly...')
    
    // Get the document ID from the item
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: 'cmjaxkl3u00049uxg83tuvg0b' },
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      }
    })
    
    if (!item) {
      console.log('❌ Item not found')
      return
    }
    
    const documentId = item.bookShopItem.document.id
    console.log('📄 Document ID:', documentId)
    console.log('📁 Storage Path:', item.bookShopItem.document.storagePath)
    
    // Test the API endpoint
    const apiUrl = `http://localhost:3002/api/member/my-jstudyroom/${documentId}/signed-url`
    console.log('🔗 Testing API:', apiUrl)
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API Response:', data)
      } else {
        const errorText = await response.text()
        console.log('❌ API Error:', errorText)
        
        if (response.status === 401) {
          console.log('🔐 Authentication issue - user not logged in')
        }
      }
    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message)
    }
    
    // Also test if we can access the document pages API
    console.log('\n🔄 Testing document pages API...')
    const pagesApiUrl = `http://localhost:3002/api/documents/${documentId}/pages`
    
    try {
      const pagesResponse = await fetch(pagesApiUrl)
      console.log('📄 Pages API status:', pagesResponse.status)
      
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json()
        console.log('📄 Pages data:', pagesData)
      } else {
        const pagesError = await pagesResponse.text()
        console.log('❌ Pages API error:', pagesError)
      }
    } catch (pagesError) {
      console.log('❌ Pages fetch error:', pagesError.message)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSignedUrlApiDirect()