#!/usr/bin/env tsx

/**
 * Test script to make an actual HTTP request to the My jstudyroom API endpoint
 */

async function testMyJstudyroomHTTP() {
  console.log('🔍 Testing My jstudyroom HTTP endpoint...')

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const url = `${baseUrl}/api/member/my-jstudyroom`
    
    console.log(`📡 Making request to: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`📊 Response status: ${response.status} ${response.statusText}`)
    console.log(`📊 Response URL: ${response.url}`)
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log(`📄 Response body (first 500 chars):`)
    console.log(responseText.substring(0, 500))

    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        console.log('✅ Successfully parsed JSON response')
        console.log(`📚 Items count: ${data.items?.length || 0}`)
        console.log(`📊 Counts: ${JSON.stringify(data.counts)}`)
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError)
      }
    } else {
      console.log(`❌ Request failed with status ${response.status}`)
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(responseText)
        console.log('📄 Error details:', errorData)
      } catch (parseError) {
        console.log('📄 Raw error response:', responseText)
      }
    }

  } catch (error) {
    console.error('❌ Error testing HTTP endpoint:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
  }
}

// Run the test
testMyJstudyroomHTTP()