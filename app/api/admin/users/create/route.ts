import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getCurrentUser } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'
import { sendUserApprovalEmail } from '@/lib/email'
import { logUserCreation, getClientIp } from '@/lib/audit-log'

/**
 * POST /api/admin/users/create
 * Create a new user from an access request
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    // Get current admin user for audit logging
    const adminUser = await getCurrentUser()
    const ipAddress = getClientIp(request)

    // Parse request body
    const body = await request.json()
    const {
      accessRequestId,
      email,
      name,
      role,
      password,
      pricePlan,
      notes
    } = body

    // Sanitize inputs
    const { sanitizeString, sanitizeEmail } = await import('@/lib/sanitization')
    const sanitizedEmail = sanitizeEmail(email)
    const sanitizedName = name ? sanitizeString(name) : undefined
    const sanitizedPricePlan = pricePlan ? sanitizeString(pricePlan) : undefined
    const sanitizedNotes = notes ? sanitizeString(notes) : undefined

    // Validate required fields
    if (!accessRequestId || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: accessRequestId, email, role, password' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['PLATFORM_USER', 'READER_USER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be PLATFORM_USER, READER_USER, or ADMIN' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if access request exists
    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: accessRequestId }
    })

    if (!accessRequest) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user and update access request in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: sanitizedEmail,
          name: sanitizedName || null,
          passwordHash,
          userRole: role,
          pricePlan: sanitizedPricePlan || null,
          notes: sanitizedNotes || null,
          emailVerified: true, // Auto-verify admin-created users
          emailVerifiedAt: new Date(),
          isActive: true
        }
      })

      // Update access request status
      await tx.accessRequest.update({
        where: { id: accessRequestId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date()
        }
      })

      return user
    })

    logger.info('User created by admin', {
      userId: result.id,
      email: result.email,
      userRole: result.userRole,
      accessRequestId
    })

    // Log audit event
    if (adminUser) {
      await logUserCreation(
        adminUser.id,
        adminUser.email,
        result.id,
        result.email,
        result.userRole,
        ipAddress
      )
    }

    // Send approval email to user
    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`
    const emailSent = await sendUserApprovalEmail({
      email: result.email,
      name: result.name || undefined,
      password, // Send plain password in email
      userRole: result.userRole,
      pricePlan: result.pricePlan || undefined,
      loginUrl
    })

    if (!emailSent) {
      logger.warn('Failed to send approval email', {
        userId: result.id,
        email: result.email
      })
    }

    // Return user data (without password hash) and plain password
    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        userRole: result.userRole,
        pricePlan: result.pricePlan || undefined,
        notes: result.notes || undefined,
        createdAt: result.createdAt
      },
      password, // Return plain password for admin to copy
      emailSent
    })
  } catch (error: unknown) {
    logger.error('Error creating user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
