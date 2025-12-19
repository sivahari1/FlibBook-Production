/**
 * Check if dev server is running and convert documents
 * This script checks if the server is accessible before attempting conversion
 */

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if development server is running...\n');

  const isRunning = await checkServerRunning();

  if (!isRunning) {
    console.log('❌ Development server is NOT running!\n');
    console.log('📋 To fix this:');
    console.log('   1. Open a terminal');
    console.log('   2. Run: npm run dev');
    console.log('   3. Wait for "Ready on http://localhost:3000"');
    console.log('   4. Run this script again\n');
    console.log('💡 Tip: Keep the dev server running in one terminal,');
    console.log('   and run this script in another terminal.\n');
    process.exit(1);
  }

  console.log('✅ Development server is running!\n');
  console.log('🔄 Starting document conversion...\n');
  console.log('=' .repeat(60));

  // Import and run the conversion script
  import { execSync } from 'child_process';
  
  try {
    execSync('npx tsx scripts/convert-documents-simple.ts', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('\n❌ Conversion script failed');
    process.exit(1);
  }
}

main();
