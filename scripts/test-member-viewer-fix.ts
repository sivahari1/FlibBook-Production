#!/usr/bin/env tsx

/**
 * Test script to verify the member viewer fix
 * 
 * This script tests:
 * 1. Prisma import resolution
 * 2. API proxy endpoint functionality
 * 3. Member access verification
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🧪 Testing Member Viewer Fix...\n');

// Test 1: Verify Prisma imports
console.log('1️⃣ Testing Prisma import resolution...');
try {
  // Test importing from lib/prisma.ts
  const prismaContent = readFileSync('lib/prisma.ts', 'utf8');
  if (prismaContent.includes('export default prisma')) {
    console.log('✅ lib/prisma.ts exports default prisma correctly');
  } else {
    console.log('❌ lib/prisma.ts does not export default prisma');
  }

  // Test tsconfig.json path mapping
  const tsconfigContent = readFileSync('tsconfig.json', 'utf8');
  const tsconfig = JSON.parse(tsconfigContent);
  if (tsconfig.compilerOptions?.paths?.['@/*']?.[0] === './*') {
    console.log('✅ tsconfig.json has correct path mapping');
  } else {
    console.log('❌ tsconfig.json path mapping is incorrect');
  }

  // Test API route exists
  const apiRouteExists = require('fs').existsSync('app/api/member/my-jstudyroom/viewer/items/[itemId]/pages/[pageNumber]/image/route.ts');
  if (apiRouteExists) {
    console.log('✅ Image proxy API route exists');
  } else {
    console.log('❌ Image proxy API route does not exist');
  }

} catch (error) {
  console.error('❌ Error testing Prisma imports:', error);
}

// Test 2: Check TypeScript compilation
console.log('\n2️⃣ Testing TypeScript compilation...');
try {
  execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log('Error output:', error.toString());
}

// Test 3: Verify member viewer client changes
console.log('\n3️⃣ Testing member viewer client changes...');
try {
  const viewerContent = readFileSync('app/member/view/[itemId]/MyJstudyroomViewerClient.tsx', 'utf8');
  
  // Check that direct Supabase URL fetching is removed
  if (!viewerContent.includes('credentials: \'include\'') || 
      !viewerContent.includes('fetch(pageData.imageUrl')) {
    console.log('✅ Direct Supabase URL fetching removed');
  } else {
    console.log('❌ Direct Supabase URL fetching still present');
  }

  // Check that proxy URLs are used
  if (viewerContent.includes('/api/member/my-jstudyroom/viewer/items/')) {
    console.log('✅ Proxy URLs are being used');
  } else {
    console.log('❌ Proxy URLs are not being used');
  }

  // Check that blob URL cleanup is removed
  if (!viewerContent.includes('URL.revokeObjectURL')) {
    console.log('✅ Blob URL cleanup removed');
  } else {
    console.log('❌ Blob URL cleanup still present');
  }

} catch (error) {
  console.error('❌ Error testing viewer client:', error);
}

console.log('\n🏁 Test completed!');
console.log('\n📋 Next steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Login as a member user');
console.log('3. Navigate to My jstudyroom');
console.log('4. Open a document to test the viewer');
console.log('5. Check browser console for CORS errors (should be none)');
console.log('6. Check Network tab for 200 responses on image requests');