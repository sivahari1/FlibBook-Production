/**
 * Thumbnail generation utility for bookshop items
 * Generates thumbnails from page 1 of converted documents
 */

import { prisma } from './db'
import { logger } from './logger'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface ThumbnailGenerationResult {
  success: boolean
  thumbnailUrl?: string
  error?: string
}

/**
 * Generate thumbnail for a document from its first page
 */
export async function generateThumbnailFromFirstPage(
  documentId: string
): Promise<ThumbnailGenerationResult> {
  try {
    // Check if document exists and get its details
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        contentType: true,
        thumbnailUrl: true,
        pages: {
          where: { pageNumber: 1 },
          select: {
            pageUrl: true,
            storagePath: true
          },
          take: 1
        }
      }
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found'
      }
    }

    // Skip if document already has a thumbnail
    if (document.thumbnailUrl) {
      return {
        success: true,
        thumbnailUrl: document.thumbnailUrl
      }
    }

    // Only generate thumbnails for PDFs (which have pages)
    if (document.contentType !== 'PDF') {
      return {
        success: false,
        error: 'Thumbnail generation only supported for PDF documents'
      }
    }

    // Check if first page exists
    if (!document.pages || document.pages.length === 0) {
      return {
        success: false,
        error: 'Document has no converted pages'
      }
    }

    const firstPage = document.pages[0]
    
    // Use the first page URL as thumbnail
    const thumbnailUrl = firstPage.pageUrl

    if (!thumbnailUrl) {
      return {
        success: false,
        error: 'First page has no URL'
      }
    }

    // Update document with thumbnail URL
    await prisma.document.update({
      where: { id: documentId },
      data: {
        thumbnailUrl: thumbnailUrl
      }
    })

    // Also update any bookshop items for this document
    await prisma.bookShopItem.updateMany({
      where: { 
        documentId: documentId,
        previewUrl: null // Only update if no preview URL exists
      },
      data: {
        previewUrl: thumbnailUrl
      }
    })

    logger.info(`Generated thumbnail for document ${documentId}`, {
      thumbnailUrl
    })

    return {
      success: true,
      thumbnailUrl
    }

  } catch (error) {
    logger.error(`Error generating thumbnail for document ${documentId}`, error)
    return {
      success: false,
      error: 'Failed to generate thumbnail'
    }
  }
}

/**
 * Batch generate thumbnails for documents without them
 */
export async function generateMissingThumbnails(limit: number = 50): Promise<{
  processed: number
  successful: number
  failed: number
  errors: string[]
}> {
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [] as string[]
  }

  try {
    // Find PDF documents without thumbnails that have converted pages
    const documentsNeedingThumbnails = await prisma.document.findMany({
      where: {
        contentType: 'PDF',
        thumbnailUrl: null,
        pages: {
          some: {
            pageNumber: 1
          }
        }
      },
      select: {
        id: true,
        title: true
      },
      take: limit
    })

    logger.info(`Found ${documentsNeedingThumbnails.length} documents needing thumbnails`)

    for (const document of documentsNeedingThumbnails) {
      results.processed++
      
      const result = await generateThumbnailFromFirstPage(document.id)
      
      if (result.success) {
        results.successful++
        logger.info(`✅ Generated thumbnail for: ${document.title}`)
      } else {
        results.failed++
        const error = `❌ Failed to generate thumbnail for ${document.title}: ${result.error}`
        results.errors.push(error)
        logger.warn(error)
      }
    }

    logger.info('Thumbnail generation batch completed', results)
    return results

  } catch (error) {
    logger.error('Error in batch thumbnail generation', error)
    results.errors.push(`Batch operation failed: ${error}`)
    return results
  }
}

/**
 * Get placeholder image URL based on content type
 */
export function getPlaceholderImageUrl(contentType: string): string {
  const baseUrl = '/images/placeholders'
  
  switch (contentType) {
    case 'PDF':
      return `${baseUrl}/pdf-placeholder.svg`
    case 'IMAGE':
      return `${baseUrl}/image-placeholder.svg`
    case 'VIDEO':
      return `${baseUrl}/video-placeholder.svg`
    case 'AUDIO':
      return `${baseUrl}/audio-placeholder.svg`
    case 'LINK':
      return `${baseUrl}/link-placeholder.svg`
    default:
      return `${baseUrl}/document-placeholder.svg`
  }
}

/**
 * Update bookshop items to use document thumbnails where available
 */
export async function syncBookshopThumbnails(): Promise<{
  updated: number
  errors: string[]
}> {
  const results = {
    updated: 0,
    errors: [] as string[]
  }

  try {
    // Find bookshop items without preview URLs but with document thumbnails
    const itemsToUpdate = await prisma.bookShopItem.findMany({
      where: {
        previewUrl: null,
        document: {
          thumbnailUrl: {
            not: null
          }
        }
      },
      include: {
        document: {
          select: {
            thumbnailUrl: true
          }
        }
      }
    })

    logger.info(`Found ${itemsToUpdate.length} bookshop items to update with thumbnails`)

    for (const item of itemsToUpdate) {
      if (item.document?.thumbnailUrl) {
        await prisma.bookShopItem.update({
          where: { id: item.id },
          data: {
            previewUrl: item.document.thumbnailUrl
          }
        })
        results.updated++
      }
    }

    logger.info(`Updated ${results.updated} bookshop items with thumbnails`)
    return results

  } catch (error) {
    logger.error('Error syncing bookshop thumbnails', error)
    results.errors.push(`Sync operation failed: ${error}`)
    return results
  }
}