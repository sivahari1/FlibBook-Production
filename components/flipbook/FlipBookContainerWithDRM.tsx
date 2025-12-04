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

  // Determine if watermark should be shown
  const shouldShowWatermark = showWatermark || enableWatermark
  const finalWatermarkText = shouldShowWatermark ? (watermarkText || userEmail) : undefined

  useEffect(() => {
    if (!pages || pages.length === 0) {
      setError('No pages available to display')
      setIsLoading(false)
      return
    }

    console.log(`[FlipBookContainer] Loading ${pages.length} pages`)
    setIsLoading(true)
    setImagesLoaded(0)

    // Preload all images with cache busting
    const imagePromises = pages.map((page, index) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          setImagesLoaded(prev => {
            const newCount = prev + 1
            console.log(`[FlipBookContainer] Loaded image ${newCount}/${pages.length}`)
            return newCount
          })
          resolve()
        }
        
        img.onerror = (e) => {
          console.error(`[FlipBookContainer] Failed to load page ${index + 1}:`, {
            url: page.imageUrl,
            error: e,
          })
          // Don't reject - allow partial loading
          resolve()
        }
        
        // Add cache-busting parameter
        try {
          const url = new URL(page.imageUrl)
          url.searchParams.set('v', Date.now().toString())
          img.src = url.toString()
        } catch {
          img.src = page.imageUrl
        }
      })
    })

    Promise.allSettled(imagePromises)
      .then((results) => {
        const failedCount = results.filter(r => r.status === 'rejected').length
        if (failedCount > 0) {
          console.warn(`[FlipBookContainer] ${failedCount} pages failed to load`)
        }
        // Even if some pages failed, show the flipbook if we have at least one page
        const successCount = results.filter(r => r.status === 'fulfilled').length
        if (successCount > 0) {
          setIsLoading(false)
          setError(null)
        } else {
          setError('All pages failed to load. Please try refreshing.')
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error('[FlipBookContainer] Error loading pages:', err)
        setError('Failed to load document pages')
        setIsLoading(false)
      })
  }, [pages])

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900">
        <FlipBookError 
          message={error} 
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
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <FlipBookLoading 
          progress={pages.length > 0 ? (imagesLoaded / pages.length) * 100 : 0}
          message={`Loading pages... (${imagesLoaded}/${pages.length})`}
        />
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
