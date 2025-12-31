import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { deleteDocumentCompletely, removeFromBookshopOnly } from '@/lib/document-deletion'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * DELETE /api/admin/documents/[id]/delete
 * Safe server-side document deletion with options
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    const { id: documentId } = await params
    const { searchParams } = new URL(request.url)
    const deleteType = searchParams.get('type') || 'complete' // 'complete' or 'bookshop-only'

    if (deleteType === 'bookshop-only') {
      // Remove from bookshop but keep document
      const result = await removeFromBookshopOnly(documentId)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.statusCode || 500 }
        )
      }

      return NextResponse.json({
        message: 'Document removed from bookshop successfully',
        deletedItems: result.deletedItems
      })
    } else {
      // Complete document deletion
      const result = await deleteDocumentCompletely(documentId)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.statusCode || 500 }
        )
      }

      return NextResponse.json({
        message: 'Document deleted completely',
        deletedItems: result.deletedItems,
        storageCleanup: result.storageCleanup
      })
    }
  } catch (error: unknown) {
    logger.error('Error in document deletion', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}