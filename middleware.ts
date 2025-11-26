import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware for security, rate limiting, and request validation
 * Requirements: 9.1, 9.3, 10.3, 10.4
 */

// Simple in-memory rate limiting (use Redis in production for distributed systems)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!record || record.resetAt < now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // More aggressive rate limiting for auth endpoints
    if (pathname.startsWith('/api/auth/register') || pathname.startsWith('/api/auth/login')) {
      const allowed = rateLimit(`auth:${ip}`, 5, 60000); // 5 requests per minute
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
      }
    }
    
    // Standard rate limiting for other API routes
    const allowed = rateLimit(`api:${ip}`, 100, 60000); // 100 requests per minute
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }
  
  // Emergency fix endpoint - bypass all auth checks
  if (pathname === '/api/admin/fix-login') {
    return NextResponse.next();
  }
  
  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/api/documents', '/api/analytics', '/api/subscription', '/admin', '/api/admin', '/inbox', '/reader', '/member', '/api/member'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  // Admin-only routes
  const adminPaths = ['/admin', '/api/admin'];
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
  
  // Platform User-only routes (ADMIN users also have access to these)
  const platformUserPaths = ['/dashboard', '/inbox', '/api/documents', '/api/analytics', '/api/subscription'];
  const isPlatformUserPath = platformUserPaths.some(path => pathname.startsWith(path));
  
  // Member-only routes
  const memberPaths = ['/member', '/api/member'];
  const isMemberPath = memberPaths.some(path => pathname.startsWith(path));
  
  // Reader-only routes
  const readerPaths = ['/reader'];
  const isReaderPath = readerPaths.some(path => pathname.startsWith(path));
  
  // Allow access to verification-related pages without email verification
  const verificationPaths = ['/verify-email', '/verify'];
  const isVerificationPath = verificationPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    // Check for valid session token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // For pages, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check if user is active
    if (token && token.isActive === false) {
      // For API routes, return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Account is inactive. Please contact support.' },
          { status: 403 }
        );
      }
      
      // For pages, redirect to login with error
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'inactive');
      return NextResponse.redirect(loginUrl);
    }
    
    // Check admin access for admin routes
    if (isAdminPath && token.userRole !== 'ADMIN') {
      // For API routes, return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }
      
      // For pages, redirect to appropriate dashboard based on role
      if (token.userRole === 'PLATFORM_USER') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else if (token.userRole === 'MEMBER') {
        return NextResponse.redirect(new URL('/member', request.url));
      } else if (token.userRole === 'READER_USER') {
        return NextResponse.redirect(new URL('/reader', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Check Platform User access for platform user routes
    // Allow ADMIN users to access dashboard for document management
    if (isPlatformUserPath && token.userRole !== 'PLATFORM_USER' && token.userRole !== 'ADMIN') {
      // For API routes, return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Platform User access required' },
          { status: 403 }
        );
      }
      
      // For pages, redirect to appropriate dashboard based on role
      if (token.userRole === 'MEMBER') {
        return NextResponse.redirect(new URL('/member', request.url));
      } else if (token.userRole === 'READER_USER') {
        return NextResponse.redirect(new URL('/reader', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Check Member access for member routes
    // Allow ADMIN users to access member routes for testing and verification
    if (isMemberPath && token.userRole !== 'MEMBER' && token.userRole !== 'ADMIN') {
      // For API routes, return 403
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Member access required' },
          { status: 403 }
        );
      }
      
      // For pages, redirect to appropriate dashboard based on role
      if (token.userRole === 'PLATFORM_USER') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else if (token.userRole === 'READER_USER') {
        return NextResponse.redirect(new URL('/reader', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Check reader access for reader routes
    // Allow ADMIN users to access reader routes for testing and verification
    if (isReaderPath && token.userRole !== 'READER_USER' && token.userRole !== 'ADMIN') {
      // Redirect to appropriate dashboard based on role
      if (token.userRole === 'PLATFORM_USER') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else if (token.userRole === 'MEMBER') {
        return NextResponse.redirect(new URL('/member', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Check email verification status for authenticated users
    // Only redirect if emailVerified is explicitly false (not just falsy)
    if (token && token.emailVerified === false && !isVerificationPath) {
      // For API routes, return 403 with specific message
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' },
          { status: 403 }
        );
      }
      
      // For pages, redirect to verification pending page
      const verifyUrl = new URL('/verify-email', request.url);
      return NextResponse.redirect(verifyUrl);
    }
  }
  
  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.supabase.co https://api.razorpay.com; " +
      "frame-src https://api.razorpay.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests;"
    );
  }
  
  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
