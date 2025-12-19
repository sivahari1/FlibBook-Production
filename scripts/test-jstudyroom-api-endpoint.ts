#!/usr/bin/env tsx

/**
 * Test the jStudyRoom signed URL API endpoint
 */

import { config } from 'dotenv'
config()

async function testAPIEndpoint(): Promise<void> {
  console.log('🧪 Testing jStudyRoom API Endpoint...\n')

  try {
    // Get a test document ID
    const { prisma: db } = await import('../lib/db')
    
    const jstudyroomItem = await db.myJstudyroomItem.findFirst({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      }
    })

    if (!jstudyroomItem) {
      console.log('❌ No jStudyRoom items found for testing')
      return
    }

    console.log(`📄 Testing with document: ${jstudyroomItem.bookShopItem?.document?.title}`)
    console.log(`   Item ID: ${jstudyroomItem.id}`)
    console.log(`   User: ${jstudyroomItem.user.email}`)

    // Test the API endpoint structure
    const apiPath = `/api/member/my-jstudyroom/${jstudyroomItem.id}/signed-url`
    console.log(`   API Path: ${apiPath}`)

    // Import the API handler directly to test it
    console.log('\n🔗 Testing API handler directly...')
    
    // Create a mock request and params
    const mockRequest = new Request('http://localhost:3000' + apiPath)
    const mockParams = { params: { id: jstudyroomItem.id } }

    // Import and test the API handler
    const { GET } = await import('../app/api/member/my-jstudyroom/[id]/signed-url/route')
    
    // Note: This will fail because we don't have a session, but we can check the error
    try {
      const response = await GET(mockRequest, mockParams)
      const data = await response.json()
      
      if (response.status === 401) {
        console.log('✅ API handler works - returned 401 (authentication required) as expected')
        console.log(`   Response: ${JSON.stringify(data)}`)
      } else {
        console.log(`⚠️  Unexpected response status: ${response.status}`)
        console.log(`   Response: ${JSON.stringify(data)}`)
      }
    } catch (error) {
      console.log('❌ API handler error:', error)
    }

    console.log('\n📋 Next Steps:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Login as sivaramj83@gmail.com')
    console.log('3. Navigate to jStudyRoom and try to view a document')
    console.log('4. The "Missing Supabase environment variables" error should be resolved')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testAPIEndpoint()