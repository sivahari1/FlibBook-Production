import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Temporary debug endpoint - REMOVE after fixing production issue
export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Count users
    const userCount = await prisma.user.count();
    
    // Check if test users exist
    const sivaExists = await prisma.user.findUnique({
      where: { email: 'sivaramj83@gmail.com' },
      select: { id: true, email: true, name: true, userRole: true, isActive: true }
    });
    
    const hariExists = await prisma.user.findUnique({
      where: { email: 'hariharanr@gmail.com' },
      select: { id: true, email: true, name: true, userRole: true, isActive: true }
    });
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        queryTest: result,
        totalUsers: userCount
      },
      users: {
        siva: sivaExists ? {
          exists: true,
          name: sivaExists.name,
          role: sivaExists.userRole,
          active: sivaExists.isActive
        } : { exists: false },
        hari: hariExists ? {
          exists: true,
          name: hariExists.name,
          role: hariExists.userRole,
          active: hariExists.isActive
        } : { exists: false }
      },
      warning: 'This endpoint should be removed after debugging'
    });
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
