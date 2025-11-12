/**
 * Email Delivery Testing Script
 * 
 * This script tests email delivery in development and production environments.
 * It verifies that emails are sent correctly and templates render properly.
 * 
 * Usage:
 *   npm run test:email-delivery
 * 
 * Environment Variables Required:
 *   - RESEND_API_KEY: Your Resend API key
 *   - RESEND_FROM_EMAIL: The email address to send from
 *   - NEXT_PUBLIC_APP_URL: Your application URL
 *   - TEST_EMAIL: Email address to send test emails to
 */

import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';
import { logger } from '../lib/logger';

// Configuration
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

/**
 * Run a test and record the result
 */
async function runTest(
  name: string,
  testFn: () => Promise<boolean>
): Promise<void> {
  const startTime = Date.now();
  try {
    console.log(`\n🧪 Running: ${name}...`);
    const passed = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({ test: name, passed, duration });
    
    if (passed) {
      console.log(`✅ PASSED (${duration}ms)`);
    } else {
      console.log(`❌ FAILED (${duration}ms)`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    results.push({ test: name, passed: false, error: errorMessage, duration });
    console.log(`❌ ERROR: ${errorMessage} (${duration}ms)`);
  }
}

/**
 * Test verification email delivery
 */
async function testVerificationEmail(): Promise<boolean> {
  const result = await sendVerificationEmail(TEST_EMAIL, {
    userName: 'Test User',
    verificationUrl: `${APP_URL}/verify?token=test-token-123`,
  });
  
  return result;
}

/**
 * Test password reset email delivery
 */
async function testPasswordResetEmail(): Promise<boolean> {
  const result = await sendPasswordResetEmail(TEST_EMAIL, {
    userName: 'Test User',
    resetUrl: `${APP_URL}/reset-password?token=test-token-456`,
  });
  
  return result;
}

/**
 * Test email with special characters in name
 */
async function testSpecialCharactersInName(): Promise<boolean> {
  const result = await sendVerificationEmail(TEST_EMAIL, {
    userName: "O'Brien José García",
    verificationUrl: `${APP_URL}/verify?token=test-token-789`,
  });
  
  return result;
}

/**
 * Test email with long URL
 */
async function testLongUrl(): Promise<boolean> {
  const longToken = 'a'.repeat(100);
  const result = await sendVerificationEmail(TEST_EMAIL, {
    userName: 'Test User',
    verificationUrl: `${APP_URL}/verify?token=${longToken}&redirect=/dashboard/documents/123`,
  });
  
  return result;
}

/**
 * Test concurrent email sending
 */
async function testConcurrentEmails(): Promise<boolean> {
  const promises = [
    sendVerificationEmail(TEST_EMAIL, {
      userName: 'User 1',
      verificationUrl: `${APP_URL}/verify?token=token1`,
    }),
    sendPasswordResetEmail(TEST_EMAIL, {
      userName: 'User 2',
      resetUrl: `${APP_URL}/reset-password?token=token2`,
    }),
    sendVerificationEmail(TEST_EMAIL, {
      userName: 'User 3',
      verificationUrl: `${APP_URL}/verify?token=token3`,
    }),
  ];
  
  const results = await Promise.all(promises);
  return results.every(r => r === true);
}

/**
 * Validate environment configuration
 */
function validateEnvironment(): boolean {
  console.log('\n📋 Validating Environment Configuration...\n');
  
  const required = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  let valid = true;
  
  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      console.log(`❌ Missing: ${key}`);
      valid = false;
    } else {
      // Mask sensitive values
      const displayValue = key.includes('KEY') || key.includes('SECRET')
        ? `${value.substring(0, 8)}...`
        : value;
      console.log(`✅ ${key}: ${displayValue}`);
    }
  }
  
  if (process.env.TEST_EMAIL) {
    console.log(`✅ TEST_EMAIL: ${process.env.TEST_EMAIL}`);
  } else {
    console.log(`⚠️  TEST_EMAIL not set, using default: ${TEST_EMAIL}`);
  }
  
  return valid;
}

/**
 * Print test summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.test}`);
        if (r.error) {
          console.log(`    Error: ${r.error}`);
        }
      });
  }
  
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
  console.log(`\n⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Email delivery is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🚀 Email Delivery Testing Script');
  console.log('='.repeat(60));
  
  // Validate environment
  if (!validateEnvironment()) {
    console.error('\n❌ Environment validation failed. Please check your configuration.');
    process.exit(1);
  }
  
  console.log('\n📧 Test emails will be sent to:', TEST_EMAIL);
  console.log('⚠️  Make sure to check your inbox and spam folder!\n');
  
  // Wait for user confirmation
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Run tests
  await runTest('Verification Email Delivery', testVerificationEmail);
  await runTest('Password Reset Email Delivery', testPasswordResetEmail);
  await runTest('Special Characters in Name', testSpecialCharactersInName);
  await runTest('Long URL Handling', testLongUrl);
  await runTest('Concurrent Email Sending', testConcurrentEmails);
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
