'use client'

import { useState, useEffect } from 'react'
import { FlipBookViewerWithDRM } from './FlipBookViewerWithDRM'
import { FlipBookLoading } from './FlipBookLoading'
import { FlipBookError } from './FlipBookError'

interface PageData {
  pageNumber: number
  imageUrl: string
  width: number
  height: number
}

interface FlipBookContainerWithDRMProps {
  pages: PageData[]
  documentId: string
  watermarkText?: string
  userEmail: string
  showWatermark?: boolean
  enableWatermark?: boolean
  allowTextSelection?: boolean
  enableScreenshotPrevention?: boolean
}

export function FlipBookContainerWithDRM({
  pages,
  documentId,
  watermarkText,
  userEmail,
  showWatermark = false,
  enableWatermark = false,
  allowTextSelection = true,
  enableScreenshotPrevention = false,
}: FlipBookContainerWithDRMProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imagesLoaded, setImagesLoaded] = useState(0)
  const [failedImages, setFailedImages] = useState<number[]>([])

  // Determine if watermark should be shown - explicit check
  const shouldShowWatermark = showWatermark === true || enableWatermark === true
  const finalWatermarkText = shouldShowWatermark ? (watermarkText || userEmail) : undefined
  
  // Debug logging for watermark
  console.log('[FlipBookContainer] Watermark Configuration:', {
    showWatermark,
    enableWatermark,
    shouldShowWatermark,
    hasWatermarkText: !!finalWatermarkText,
    watermarkText: finalWatermarkText ? '***' : undefined,
  })

  useEffect(() => {
    if (!pages || pages.length === 0) {
      setError('No pages available to display')
      setIsLoading(false)
      return
    }

    console.log(`[FlipBookContainer] Loading ${pages.length} pages for document ${documentId}`)
    console.log('[FlipBookContainer] Sample page URLs:', pages.slice(0, 2).map(p => ({
      pageNumber: p.pageNumber,
      url: p.imageUrl,
    })))
    
    setIsLoading(true)
    setImagesLoaded(0)
    setFailedImages([])

    // Preload all images with detailed error tracking
    const imagePromises = pages.map((page) => {
      return new Promise<void>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          setImagesLoaded(prev => {
            const newCount = prev + 1
            console.log(`[FlipBookContainer] ✅ Loaded page ${page.pageNumber} (${newCount}/${pages.length})`)
            return newCount
          })
          resolve()
        }
        
        img.onerror = (e) => {
          console.error(`[FlipBookContainer] ❌ Failed to load page ${page.pageNumber}:`, {
            pageNumber: page.pageNumber,
            url: page.imageUrl,
            error: e,
          })
          
          setFailedImages(prev => [...prev, page.pageNumber])
          // Don't reject - allow partial loading
          resolve()
        }
        
        // Use the URL directly without cache busting to avoid issues
        img.src = page.imageUrl
      })
    })

    Promise.allSettled(imagePromises)
      .then(() => {
        const successCount = imagesLoaded
        const failedCount = pages.length - successCount
        
        console.log('[FlipBookContainer] Preload summary:', {
          total: pages.length,
          successful: successCount,
          failed: failedCount,
          failedPages: failedImages,
        })
        
        if (failedCount > 0) {
          console.warn(`[FlipBookContainer] ⚠️ ${failedCount} pages failed to load`)
        }
        
        // Show the flipbook if we have at least one page
        if (successCount > 0) {
          setIsLoading(false)
          setError(null)
        } else {
          setError('All pages failed to load. Please check your network connection and try refreshing.')
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error('[FlipBookContainer] Error loading pages:', err)
        setError('Failed to load document pages')
        setIsLoading(false)
      })
  }, [pages, documentId, imagesLoaded, failedImages])

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex items-center justify-center">
        <FlipBookError 
          error={error} 
          onRetry={() => {
            setError(null)
            setIsLoading(true)
            // Trigger reload by updating a key or calling fetchPages again
          }}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <FlipBookLoading />
          <p className="mt-4 text-white text-lg">
            Loading pages... ({imagesLoaded}/{pages.length})
          </p>
          {pages.length > 0 && (
            <div className="mt-2 w-64 bg-white/20 rounded-full h-2 mx-auto">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${(imagesLoaded / pages.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-gray-900 overflow-hidden"
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <FlipBookViewerWithDRM
        documentId={documentId}
        pages={pages}
        watermarkText={finalWatermarkText}
        userEmail={userEmail}
        allowTextSelection={allowTextSelection}
        enableScreenshotPrevention={enableScreenshotPrevention}
      />
    </div>
  )
}
