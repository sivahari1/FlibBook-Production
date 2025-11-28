import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

// Determine which connection URL to use
// Prefer DIRECT_URL for reliability since pooler can be intermittently unreachable
function getDatabaseUrl(): string {
  const poolerUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  
  // Use direct connection for both dev and production for reliability
  // The Supabase pooler has been intermittently unreachable
  if (directUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Using DIRECT_URL for development (pooler fallback)');
    }
    return directUrl;
  }
  
  // Fallback to pooler URL if DIRECT_URL is not available
  return poolerUrl || '';
}

export const prisma =
  globalForPrisma.prisma ||
  (process.env.DATABASE_URL || process.env.DIRECT_URL
    ? new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: getDatabaseUrl(),
          },
        },
      })
    : ({} as PrismaClient)) // Return empty object during build if no DATABASE_URL

if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL) {
  globalForPrisma.prisma = prisma
}

// Helper function to test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function to safely disconnect
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}
