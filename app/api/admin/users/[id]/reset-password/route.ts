import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getCurrentUser } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'
import { generateSecurePassword } from '@/lib/password-generator'
import { sendPasswordResetByAdmin } from '@/lib/email'
import { logPasswordReset, getClientIp } from '@/lib/audit-log'

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset user password
 * Admin only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    // Get current admin user for audit logging
    const adminUser = await getCurrentUser()
    const ipAddress = getClientIp(request)

    const { id: userId } = await params

    // Parse request body
    const body = await request.json()
    let { password } = body

    // Generate password if not provided
    if (!password) {
      password = generateSecurePassword(16)
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })

    logger.info('Password reset by admin', {
      userId: existingUser.id,
      email: existingUser.email
    })

    // Log audit event
    if (adminUser) {
      await logPasswordReset(
        adminUser.id,
        adminUser.email,
        existingUser.id,
        existingUser.email,
        ipAddress
      )
    }

    // Send password reset email to user
    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`
    const emailSent = await sendPasswordResetByAdmin({
      email: existingUser.email,
      name: existingUser.name || undefined,
      newPassword: password,
      loginUrl
    })

    if (!emailSent) {
      logger.warn('Failed to send password reset email', {
        userId: existingUser.id,
        email: existingUser.email
      })
    }

    return NextResponse.json({
      success: true,
      password, // Return plain password for admin to copy
      emailSent,
      message: 'Password reset successfully'
    })
  } catch (error) {
    logger.error('Error resetting password', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
