import { NextRequest, NextResponse } from 'next/server'
import { LinkProcessor } from '@/lib/link-processor'

/**
 * POST /api/link-metadata
 * Fetch metadata from a URL (server-side to avoid CORS issues)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    const linkProcessor = new LinkProcessor()
    
    // Validate URL
    if (!linkProcessor.isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.' },
        { status: 400 }
      )
    }

    // Fetch metadata
    const metadata = await linkProcessor.processLink(url)

    return NextResponse.json({
      success: true,
      metadata
    })
  } catch (error) {
    console.error('Link metadata fetch error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch link metadata',
        success: false
      },
      { status: 500 }
    )
  }
}
