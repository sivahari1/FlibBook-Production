#!/usr/bin/env tsx

/**
 * Diagnostic script to check Supabase environment variables
 * and test storage connectivity for jStudyRoom document viewing
 */

import { config } from 'dotenv'

// Load environment variables
config()

interface EnvCheck {
  name: string
  value: string | undefined
  required: boolean
  status: 'OK' | 'MISSING' | 'INVALID'
  message?: string
}

async function checkSupabaseEnvironment(): Promise<void> {
  console.log('🔍 Checking Supabase Environment Configuration...\n')

  const envChecks: EnvCheck[] = [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      required: true,
      status: 'OK'
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      required: true,
      status: 'OK'
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: true,
      status: 'OK'
    }
  ]

  // Check each environment variable
  for (const check of envChecks) {
    if (!check.value) {
      check.status = 'MISSING'
      check.message = 'Environment variable not set'
    } else if (check.value.length < 10) {
      check.status = 'INVALID'
      check.message = 'Value appears to be too short'
    } else if (check.name.includes('URL') && !check.value.startsWith('https://')) {
      check.status = 'INVALID'
      check.message = 'URL should start with https://'
    } else if (check.name.includes('KEY') && !check.value.startsWith('eyJ')) {
      check.status = 'INVALID'
      check.message = 'Key should be a JWT token starting with eyJ'
    }
  }

  // Display results
  console.log('Environment Variable Status:')
  console.log('=' .repeat(50))
  
  let hasErrors = false
  for (const check of envChecks) {
    const statusIcon = check.status === 'OK' ? '✅' : '❌'
    const maskedValue = check.value ? 
      (check.value.length > 20 ? check.value.substring(0, 20) + '...' : check.value) : 
      'NOT SET'
    
    console.log(`${statusIcon} ${check.name}`)
    console.log(`   Value: ${maskedValue}`)
    if (check.message) {
      console.log(`   Issue: ${check.message}`)
    }
    console.log()

    if (check.status !== 'OK') {
      hasErrors = true
    }
  }

  if (hasErrors) {
    console.log('❌ Environment Configuration Issues Found!')
    console.log('\n🔧 To fix these issues:')
    console.log('1. Copy .env.example to .env.local')
    console.log('2. Fill in your Supabase project details:')
    console.log('   - Get URL and keys from https://supabase.com/dashboard')
    console.log('   - Go to Settings > API')
    console.log('   - Copy Project URL, anon key, and service_role key')
    console.log('3. Restart your development server')
    return
  }

  console.log('✅ All environment variables are properly configured!')

  // Test Supabase connectivity
  console.log('\n🔗 Testing Supabase Storage Connectivity...')
  
  try {
    // Import storage functions
    const { getSignedUrl } = await import('../lib/storage')
    
    // Test with a dummy path (this will fail but should not throw env error)
    const result = await getSignedUrl('test/dummy.pdf', 60)
    
    if (result.error) {
      console.log('⚠️  Storage test returned error (expected for dummy file):')
      console.log(`   ${result.error}`)
      
      if (result.error.includes('Missing Supabase environment variables')) {
        console.log('❌ Environment variables are still not accessible to storage module')
        console.log('   This might be a build-time vs runtime issue')
      } else {
        console.log('✅ Storage module can access environment variables')
        console.log('   Error is expected for non-existent file')
      }
    } else {
      console.log('✅ Storage connectivity test successful')
    }
    
  } catch (error) {
    console.log('❌ Storage connectivity test failed:')
    console.log(`   ${error}`)
    
    if (error instanceof Error && error.message.includes('Missing Supabase environment variables')) {
      console.log('\n🔧 This indicates the environment variables are not being loaded properly.')
      console.log('   Check that your .env.local file is in the project root.')
    }
  }

  console.log('\n📋 Next Steps:')
  console.log('1. If environment variables are missing, configure them in .env.local')
  console.log('2. If variables are set but storage fails, check Supabase project status')
  console.log('3. Test document viewing in jStudyRoom after fixing issues')
}

// Run the diagnostic
checkSupabaseEnvironment().catch(console.error)