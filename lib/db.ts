import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

/**
 * Prisma Client Configuration
 * 
 * DATABASE_URL: Used by the application at runtime (session pooler)
 * DIRECT_URL: Used by Prisma CLI for migrations (direct connection)
 * 
 * The datasource in schema.prisma automatically handles this:
 * - Runtime queries use DATABASE_URL (pooler)
 * - Migrations use DIRECT_URL (direct)
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Let Prisma use the datasource URLs from schema.prisma
    // Do NOT override the URL here - it breaks the pooler/direct URL separation
  })

// Default export for compatibility
export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Test database connection with retry logic
 * Returns true if connection succeeds, false otherwise
 */
export async function testDatabaseConnection(maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ Database connection successful')
      return true
    } catch (error: any) {
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error.message)
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ Retrying in ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  return false
}

/**
 * Safely disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting from database:', error)
  }
}
