/**
 * Role-based access control utilities
 * 
 * Provides helper functions for checking user roles and permissions
 */

import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

export type UserRole = 'ADMIN' | 'PLATFORM_USER' | 'READER_USER'

/**
 * Get the current user's session
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: string | undefined, requiredRole: UserRole): boolean {
  return userRole === requiredRole
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRole: string | undefined, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole as UserRole)
}

/**
 * Middleware to require ADMIN role
 * Returns 403 response if user is not admin
 */
export async function requireAdmin() {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    )
  }
  
  if (user.userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    )
  }
  
  return null // No error, user is authorized
}

/**
 * Middleware to require PLATFORM_USER or ADMIN role
 * Returns 403 response if user doesn't have required role
 */
export async function requirePlatformUser() {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    )
  }
  
  if (!hasAnyRole(user.userRole, ['ADMIN', 'PLATFORM_USER'])) {
    return NextResponse.json(
      { error: 'Forbidden - Platform user access required' },
      { status: 403 }
    )
  }
  
  return null // No error, user is authorized
}

/**
 * Check if user is authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    )
  }
  
  if (!user.isActive) {
    return NextResponse.json(
      { error: 'Account is inactive - Please contact support' },
      { status: 403 }
    )
  }
  
  return null // No error, user is authenticated
}

/**
 * Get user role from session (client-side helper)
 */
export function getUserRole(session: any): UserRole | null {
  return session?.user?.userRole || null
}

/**
 * Check if user is admin (client-side helper)
 */
export function isAdmin(session: any): boolean {
  return session?.user?.userRole === 'ADMIN'
}

/**
 * Check if user is platform user (client-side helper)
 */
export function isPlatformUser(session: any): boolean {
  return session?.user?.userRole === 'PLATFORM_USER'
}

/**
 * Check if user is reader user (client-side helper)
 */
export function isReaderUser(session: any): boolean {
  return session?.user?.userRole === 'READER_USER'
}

/**
 * Check if user can upload documents (client-side helper)
 */
export function canUploadDocuments(session: any): boolean {
  const role = getUserRole(session)
  return role === 'ADMIN' || role === 'PLATFORM_USER'
}

/**
 * Check if user can manage documents (client-side helper)
 */
export function canManageDocuments(session: any): boolean {
  const role = getUserRole(session)
  return role === 'ADMIN' || role === 'PLATFORM_USER'
}
