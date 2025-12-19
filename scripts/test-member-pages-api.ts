import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testMemberPagesAPI() {
  try {
    console.log('🔍 Testing member pages API...\n')
    
    // Get a document ID from jStudyRoom
    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: {
                  orderBy: {
                    pageNumber: 'asc'
                  },
                  take: 3
                }
              }
            }
          }
        }
      }
    })
    
    if (!myJstudyroomItem) {
      console.log('❌ No jStudyRoom items found')
      return
    }
    
    const documentId = myJstudyroomItem.bookShopItem.documentId
    console.log(`📖 Testing with document: ${documentId}`)
    console.log(`📚 Title: ${myJstudyroomItem.bookShopItem.title}`)
    
    // Test the member pages API
    console.log('\n🔗 Testing member pages API endpoint...')
    
    try {
      const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${documentId}/pages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Note: This won't have session auth, but we can see the structure
        }
      })
      
      console.log(`Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API Response:', JSON.stringify(data, null, 2))
      } else {
        const errorText = await response.text()
        console.log('❌ API Error:', errorText)
      }
    } catch (fetchError) {
      console.log('❌ Fetch Error:', fetchError)
    }
    
    // Check what the document pages look like in the database
    console.log('\n📄 Document pages in database:')
    const document = myJstudyroomItem.bookShopItem.document
    
    if (document && document.pages.length > 0) {
      for (const page of document.pages) {
        console.log(`   Page ${page.pageNumber}: ${page.pageUrl}`)
      }
    } else {
      console.log('   No pages found')
    }
    
    // Test if the page API endpoints work
    console.log('\n🔗 Testing individual page API endpoints...')
    
    if (document && document.pages.length > 0) {
      const firstPage = document.pages[0]
      const pageApiUrl = `http://localhost:3000${firstPage.pageUrl}`
      
      console.log(`Testing: ${pageApiUrl}`)
      
      try {
        const pageResponse = await fetch(pageApiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        console.log(`Page API Status: ${pageResponse.status}`)
        console.log(`Content-Type: ${pageResponse.headers.get('content-type')}`)
        
        if (pageResponse.ok) {
          const contentType = pageResponse.headers.get('content-type')
          if (contentType?.includes('image/svg')) {
            const svgContent = await pageResponse.text()
            console.log('✅ Got SVG content (first 200 chars):', svgContent.substring(0, 200))
          } else {
            console.log('✅ Got response, content type:', contentType)
          }
        } else {
          const errorText = await pageResponse.text()
          console.log('❌ Page API Error:', errorText)
        }
      } catch (pageError) {
        console.log('❌ Page API Fetch Error:', pageError)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testMemberPagesAPI()