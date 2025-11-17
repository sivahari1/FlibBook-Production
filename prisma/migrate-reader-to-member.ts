/**
 * Migration script to update READER_USER to MEMBER
 * Run this before applying the Prisma migration
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Migrating READER_USER to MEMBER...')

  // Update all users with READER_USER role to MEMBER
  const result = await prisma.$executeRaw`
    UPDATE "users" 
    SET "userRole" = 'MEMBER' 
    WHERE "userRole" = 'READER_USER'
  `

  console.log(`✅ Updated ${result} users from READER_USER to MEMBER`)
  
  // Also update any AccessRequest records
  const accessRequestResult = await prisma.$executeRaw`
    UPDATE "access_requests" 
    SET "requestedRole" = 'MEMBER' 
    WHERE "requestedRole" = 'READER_USER'
  `
  
  console.log(`✅ Updated ${accessRequestResult} access requests from READER_USER to MEMBER`)
}

main()
  .catch((error) => {
    console.error('❌ Error during migration:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
