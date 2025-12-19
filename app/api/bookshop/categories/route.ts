import { NextResponse } from 'next/server';
import { getCategoryStructure, getAllCategories } from '@/lib/bookshop-categories';

/**
 * GET /api/bookshop/categories
 * Returns all bookshop categories in structured format
 * Requirements: 2.2, 2.5
 */
export async function GET() {
  try {
    const categoryStructure = getCategoryStructure();
    const allCategories = getAllCategories();

    const response = NextResponse.json({
      success: true,
      data: {
        structured: categoryStructure,
        flat: allCategories
      }
    });

    // Add caching headers (Requirements: 2.3)
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    response.headers.set('CDN-Cache-Control', 'public, max-age=86400');

    return response;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch categories' 
      },
      { status: 500 }
    );
  }
}