#!/usr/bin/env tsx

import { config } from 'dotenv'
config()

async function testDB() {
  try {
    const { prisma: db } = await import('../lib/db')
    
    console.log('Testing database connection...')
    
    // Test a simple query first
    const userCount = await db.user.count()
    console.log(`✅ Users count: ${userCount}`)
    
    // Test jstudyroom items
    const jstudyroomCount = await db.myJstudyroomItem.count()
    console.log(`✅ MyJstudyroom items count: ${jstudyroomCount}`)
    
    if (jstudyroomCount > 0) {
      const items = await db.myJstudyroomItem.findMany({
        take: 3,
        include: {
          user: true,
          bookShopItem: {
            include: {
              document: true
            }
          }
        }
      })
      
      console.log(`\nFound ${items.length} items:`)
      for (const item of items) {
        console.log(`- ${item.id}: ${item.bookShopItem?.document?.title || 'No title'}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  }
}

testDB()