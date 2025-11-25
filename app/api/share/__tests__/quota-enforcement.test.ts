/**
 * Integration tests for share quota enforcement
 * Requirements: 2.1, 2.2, 2.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkSharePermission } from '@/lib/rbac/admin-privileges'

describe('Share Quota Enforcement', () => {
  describe('Admin Share Permissions', () => {
    it('should allow admin to create unlimited email shares', () => {
      // Requirement 2.1: Admin shares bypass quota checks
      const result = checkSharePermission('ADMIN', 1000, 'email')
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should allow admin to create unlimited link shares', () => {
      // Requirement 2.1: Admin shares bypass quota checks
      const result = checkSharePermission('ADMIN', 1000, 'link')
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should allow admin to share even with zero shares', () => {
      // Requirement 2.4: Admin share quota counter invariance
      const result = checkSharePermission('ADMIN', 0, 'email')
      expect(result.allowed).toBe(true)
    })

    it('should allow admin to share with any share count', () => {
      // Requirement 2.4: Admin share quota counter invariance
      const counts = [0, 1, 5, 10, 100, 1000]
      counts.forEach(count => {
        const emailResult = checkSharePermission('ADMIN', count, 'email')
        const linkResult = checkSharePermission('ADMIN', count, 'link')
        expect(emailResult.allowed).toBe(true)
        expect(linkResult.allowed).toBe(true)
      })
    })
  })

  describe('Platform User Share Permissions', () => {
    it('should allow platform user to share within quota', () => {
      const result = checkSharePermission('PLATFORM_USER', 3, 'email')
      expect(result.allowed).toBe(true)
    })

    it('should deny platform user when email share quota exceeded', () => {
      const result = checkSharePermission('PLATFORM_USER', 5, 'email')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Share limit reached')
    })

    it('should deny platform user when link share quota exceeded', () => {
      const result = checkSharePermission('PLATFORM_USER', 5, 'link')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Share limit reached')
    })

    it('should enforce quota at exactly the limit', () => {
      // At limit (5 shares) - should be denied
      const atLimit = checkSharePermission('PLATFORM_USER', 5, 'email')
      expect(atLimit.allowed).toBe(false)

      // Just below limit (4 shares) - should be allowed
      const belowLimit = checkSharePermission('PLATFORM_USER', 4, 'email')
      expect(belowLimit.allowed).toBe(true)
    })
  })

  describe('Member Share Permissions', () => {
    it('should deny member to create email shares', () => {
      const result = checkSharePermission('MEMBER', 0, 'email')
      expect(result.allowed).toBe(false)
    })

    it('should deny member to create link shares', () => {
      const result = checkSharePermission('MEMBER', 0, 'link')
      expect(result.allowed).toBe(false)
    })
  })

  describe('Share Type Validation', () => {
    it('should validate email share type for all roles', () => {
      const adminResult = checkSharePermission('ADMIN', 0, 'email')
      const platformResult = checkSharePermission('PLATFORM_USER', 0, 'email')
      const memberResult = checkSharePermission('MEMBER', 0, 'email')

      expect(adminResult.allowed).toBe(true)
      expect(platformResult.allowed).toBe(true)
      expect(memberResult.allowed).toBe(false)
    })

    it('should validate link share type for all roles', () => {
      const adminResult = checkSharePermission('ADMIN', 0, 'link')
      const platformResult = checkSharePermission('PLATFORM_USER', 0, 'link')
      const memberResult = checkSharePermission('MEMBER', 0, 'link')

      expect(adminResult.allowed).toBe(true)
      expect(platformResult.allowed).toBe(true)
      expect(memberResult.allowed).toBe(false)
    })
  })
})
