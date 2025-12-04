#!/usr/bin/env tsx
/**
 * Environment Variables Logger
 * 
 * Logs DATABASE_URL and DIRECT_URL with obfuscated passwords for debugging.
 * Useful for verifying environment configuration without exposing credentials.
 * 
 * Usage: npx tsx scripts/log-env.ts
 */

import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

function obfuscatePassword(url: string | undefined): string {
  if (!url) return 'NOT SET'
  
  try {
    // Match password in PostgreSQL connection string
    // Format: postgresql://user:PASSWORD@host:port/database
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/)
    
    if (match) {
      const [, user, password, rest] = match
      const obfuscated = password.substring(0, 3) + '***' + password.substring(password.length - 2)
      return `postgresql://${user}:${obfuscated}@${rest}`
    }
    
    return url
  } catch (error) {
    return 'INVALID FORMAT'
  }
}

function validateConnectionString(url: string | undefined, name: string): void {
  if (!url) {
    console.error(`❌ ${name} is not set!`)
    return
  }
  
  // Check for common issues
  const issues: string[] = []
  
  if (!url.startsWith('postgresql://')) {
    issues.push('Should start with postgresql://')
  }
  
  if (!url.includes('@')) {
    issues.push('Missing @ separator between credentials and host')
  }
  
  if (!url.includes(':5432') && !url.includes(':6543')) {
    issues.push('Missing or unusual port number')
  }
  
  if (url.includes('PASSWORD') || url.includes('PROJECT_ID')) {
    issues.push('Contains placeholder values - needs to be replaced')
  }
  
  if (issues.length > 0) {
    console.error(`⚠️  ${name} has issues:`)
    issues.forEach(issue => console.error(`   - ${issue}`))
  } else {
    console.log(`✅ ${name} format looks correct`)
  }
}

console.log('🔍 Environment Variables Check\n')
console.log('=' .repeat(80))

// DATABASE_URL (for runtime)
console.log('\n📊 DATABASE_URL (Runtime - Session Pooler):')
console.log(obfuscatePassword(process.env.DATABASE_URL))
validateConnectionString(process.env.DATABASE_URL, 'DATABASE_URL')

if (process.env.DATABASE_URL) {
  const hasPooler = process.env.DATABASE_URL.includes('pgbouncer=true')
  const hasConnectionLimit = process.env.DATABASE_URL.includes('connection_limit=1')
  
  if (!hasPooler) {
    console.warn('⚠️  Missing pgbouncer=true parameter (recommended for production)')
  }
  if (!hasConnectionLimit) {
    console.warn('⚠️  Missing connection_limit=1 parameter (recommended for serverless)')
  }
}

// DIRECT_URL (for migrations)
console.log('\n📊 DIRECT_URL (Prisma CLI - Direct Connection):')
console.log(obfuscatePassword(process.env.DIRECT_URL))
validateConnectionString(process.env.DIRECT_URL, 'DIRECT_URL')

if (process.env.DIRECT_URL) {
  if (process.env.DIRECT_URL.includes('pgbouncer=true')) {
    console.warn('⚠️  DIRECT_URL should NOT use pgbouncer (remove pgbouncer=true)')
  }
  if (process.env.DIRECT_URL.includes('pooler.supabase.com')) {
    console.warn('⚠️  DIRECT_URL should use db.PROJECT_ID.supabase.co, not pooler')
  }
}

// Other important env vars
console.log('\n📊 Other Configuration:')
console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Not set'}`)
console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ Not set'}`)
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ Not set'}`)
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'}`)
console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set'}`)

console.log('\n' + '='.repeat(80))
console.log('\n💡 Tips:')
console.log('- DATABASE_URL should use pooler.supabase.com for runtime')
console.log('- DIRECT_URL should use db.PROJECT_ID.supabase.co for migrations')
console.log('- Special characters in passwords must be URL-encoded (! = %21, @ = %40)')
console.log('- Never commit .env.local to git')
console.log('\n')
