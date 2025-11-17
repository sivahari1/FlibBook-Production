import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { generateVerificationToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'

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

    // Get member
    const member = await prisma.user.findUnique({
      where: {
        id: memberId,
        userRole: 'MEMBER'
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Generate password reset token
    const tokenData = await generateVerificationToken(member.id, 'PASSWORD_RESET')
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${tokenData.token}`

    // Send password reset email
    await sendPasswordResetEmail(member.email, {
      userName: member.name || 'User',
      resetUrl
    })

    logger.info('Password reset email sent by admin', {
      adminId: session.user.id,
      memberId: member.id,
      memberEmail: member.email
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent'
    })
  } catch (error) {
    logger.error('Error sending password reset email:', error)
    return NextResponse.json(
      { error: 'Failed to send password reset email' },
      { status: 500 }
    )
  }
}
