import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { generateMissingThumbnails, syncBookshopThumbnails } from '@/lib/thumbnail-generator'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * POST /api/admin/thumbnails/generate
 * Generate missing thumbnails for documents and sync with bookshop
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const syncOnly = searchParams.get('syncOnly') === 'true'

    let thumbnailResults = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Generate missing thumbnails (unless syncOnly)
    if (!syncOnly) {
      logger.info(`Starting thumbnail generation for up to ${limit} documents`)
      thumbnailResults = await generateMissingThumbnails(limit)
    }

    // Sync bookshop items with document thumbnails
    logger.info('Syncing bookshop thumbnails')
    const syncResults = await syncBookshopThumbnails()

    const response = {
      message: syncOnly ? 'Bookshop thumbnails synced' : 'Thumbnail generation completed',
      thumbnailGeneration: syncOnly ? null : thumbnailResults,
      bookshopSync: syncResults,
      summary: {
        thumbnailsGenerated: thumbnailResults.successful,
        bookshopItemsUpdated: syncResults.updated,
        totalErrors: thumbnailResults.errors.length + syncResults.errors.length
      }
    }

    logger.info('Thumbnail operation completed', response.summary)

    return NextResponse.json(response)

  } catch (error: unknown) {
    logger.error('Error in thumbnail generation', error)
    return NextResponse.json(
      { error: 'Failed to generate thumbnails' },
      { status: 500 }
    )
  }
}