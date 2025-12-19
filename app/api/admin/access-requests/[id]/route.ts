import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getCurrentUser } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { logAccessRequestAction, getClientIp } from '@/lib/audit-log'

/**
 * GET /api/admin/access-requests/[id]
 * Get single access request details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin role
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { id } = await params

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id }
    })

    if (!accessRequest) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      )
    }

    logger.info('Access request fetched', { requestId: id })

    return NextResponse.json({ request: accessRequest })
  } catch (error: unknown) {
    const { id: errorId } = await params
    logger.error('Error fetching access request', { error, id: errorId })
    return NextResponse.json(
      { error: 'Failed to fetch access request' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/access-requests/[id]
 * Update access request status and admin notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin role
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    const user = await getCurrentUser()
    const ipAddress = getClientIp(request)
    const body = await request.json()

    const { status, adminNotes } = body

    // Sanitize inputs
    const { sanitizeString } = await import('@/lib/sanitization')
    const sanitizedAdminNotes = adminNotes ? sanitizeString(adminNotes) : undefined

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CLOSED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Check if access request exists
    const existingRequest = await prisma.accessRequest.findUnique({
      where: { id }
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      )
    }

    // Update access request
    const updatedRequest = await prisma.accessRequest.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(adminNotes !== undefined && { adminNotes: sanitizedAdminNotes }),
        reviewedBy: user?.email,
        reviewedAt: new Date()
      }
    })

    logger.info('Access request updated', {
      requestId: id,
      status,
      reviewedBy: user?.email
    })

    // Log audit event for status changes
    if (user && status && ['APPROVED', 'REJECTED', 'CLOSED'].includes(status)) {
      const actionMap = {
        'APPROVED': 'admin_access_request_approved' as const,
        'REJECTED': 'admin_access_request_rejected' as const,
        'CLOSED': 'admin_access_request_closed' as const
      }
      
      await logAccessRequestAction(
        actionMap[status as keyof typeof actionMap],
        user.id,
        user.email,
        id,
        existingRequest.email,
        ipAddress
      )
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })
  } catch (error: unknown) {
    const { id: errorId } = await params
    logger.error('Error updating access request', { error, id: errorId })
    return NextResponse.json(
      { error: 'Failed to update access request' },
      { status: 500 }
    )
  }
}
