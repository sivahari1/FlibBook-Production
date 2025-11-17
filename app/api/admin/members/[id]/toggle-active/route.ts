import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const memberId = params.id

    // Get current member status
    const member = await prisma.user.findUnique({
      where: {
        id: memberId,
        userRole: 'MEMBER'
      },
      select: {
        isActive: true,
        email: true,
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Toggle active status
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        isActive: !member.isActive
      }
    })

    logger.info('Member status toggled', {
      adminId: session.user.id,
      memberId,
      memberEmail: member.email,
      newStatus: updatedMember.isActive ? 'active' : 'inactive'
    })

    return NextResponse.json({
      success: true,
      isActive: updatedMember.isActive
    })
  } catch (error) {
    logger.error('Error toggling member status:', error)
    return NextResponse.json(
      { error: 'Failed to update member status' },
      { status: 500 }
    )
  }
}
