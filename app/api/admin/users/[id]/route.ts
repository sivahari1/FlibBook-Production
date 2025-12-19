import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getCurrentUser } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { logUserUpdate, getClientIp } from '@/lib/audit-log'
import type { UserUpdateData } from '@/lib/types/api'

/**
 * PATCH /api/admin/users/[id]
 * Update user details
 * Admin only
 */
export async function PATCH(
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
    const { userRole, pricePlan, notes, isActive } = body

    // Sanitize inputs
    const { sanitizeString } = await import('@/lib/sanitization')
    const sanitizedPricePlan = pricePlan ? sanitizeString(pricePlan) : undefined
    const sanitizedNotes = notes ? sanitizeString(notes) : undefined

    // Validate role if provided
    if (userRole && !['ADMIN', 'PLATFORM_USER', 'READER_USER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, PLATFORM_USER, or READER_USER' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: UserUpdateData = {}
    
    if (userRole !== undefined) {
      updateData.userRole = userRole
    }
    
    if (pricePlan !== undefined) {
      updateData.pricePlan = sanitizedPricePlan || null
    }
    
    if (notes !== undefined) {
      updateData.notes = sanitizedNotes || null
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        pricePlan: true,
        notes: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })

    logger.info('User updated by admin', {
      userId: user.id,
      email: user.email,
      changes: updateData
    })

    // Log audit event
    if (adminUser) {
      await logUserUpdate(
        adminUser.id,
        adminUser.email,
        user.id,
        user.email,
        updateData,
        ipAddress
      )
    }

    return NextResponse.json({
      success: true,
      user
    })
  } catch (error: unknown) {
    logger.error('Error updating user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
