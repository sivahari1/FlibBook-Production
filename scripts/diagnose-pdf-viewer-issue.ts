/**
 * Diagnostic script to identify PDF viewer rendering issues
 */

console.log('=== PDF Viewer Diagnostic ===');
console.log('');

// Check if we're in a browser environment
if (typeof window === 'undefined') {
  console.log('❌ Not in browser environment');
  process.exit(1);
}

console.log('✅ Browser environment detected');
console.log('');

// Check PDF.js availability
console.log('Checking PDF.js availability...');
try {
  // @ts-ignore
  if (typeof window.pdfjsLib !== 'undefined') {
    // @ts-ignore
    console.log('✅ PDF.js library loaded:', window.pdfjsLib.version);
  } else {
    console.log('❌ PDF.js library not found');
  }
} catch (error) {
  console.log('❌ Error checking PDF.js:', error);
}

console.log('');

// Check for canvas support
console.log('Checking canvas support...');
try {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    console.log('✅ Canvas 2D context available');
  } else {
    console.log('❌ Canvas 2D context not available');
  }
} catch (error) {
  console.log('❌ Error checking canvas:', error);
}

console.log('');

// Check for any console errors
console.log('Checking for console errors...');
console.log('(Open browser DevTools Console to see actual errors)');
console.log('');

// Instructions
console.log('=== Next Steps ===');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Console tab');
console.log('3. Look for errors related to:');
console.log('   - PDF.js loading');
console.log('   - Canvas rendering');
console.log('   - Network requests');
console.log('   - DOM manipulation');
console.log('');
console.log('4. Check Network tab for:');
console.log('   - PDF file download status');
console.log('   - PDF.js worker file');
console.log('   - Any failed requests');
console.log('');
console.log('5. Common issues:');
console.log('   - PDF.js worker not loaded');
console.log('   - CORS errors on PDF URL');
console.log('   - Canvas context creation failure');
console.log('   - React strict mode double-rendering');
console.log('');

export {};
