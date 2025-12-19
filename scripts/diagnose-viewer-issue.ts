#!/usr/bin/env tsx

/**
 * Diagnostic script to check viewer rendering issues
 */

console.log('=== Viewer Diagnostic ===');

// Check if there are multiple toolbars being rendered
console.log('Checking for duplicate toolbars...');

// This would be run in browser console
const diagnosticCode = `
// Check for duplicate toolbars
const toolbars = document.querySelectorAll('[data-testid*="toolbar"]');
console.log('Found toolbars:', toolbars.length);
toolbars.forEach((toolbar, index) => {
  console.log(\`Toolbar \${index + 1}:\`, toolbar.getAttribute('data-testid'), toolbar.className);
});

// Check for navigation elements
const navElements = document.querySelectorAll('[data-testid*="navigation"], [data-testid*="page"]');
console.log('Found navigation elements:', navElements.length);
navElements.forEach((nav, index) => {
  console.log(\`Nav \${index + 1}:\`, nav.getAttribute('data-testid'), nav.className);
});

// Check for zoom controls
const zoomElements = document.querySelectorAll('[data-testid*="zoom"]');
console.log('Found zoom elements:', zoomElements.length);
zoomElements.forEach((zoom, index) => {
  console.log(\`Zoom \${index + 1}:\`, zoom.getAttribute('data-testid'), zoom.className);
});

// Check PDF viewer ref
const pdfViewer = document.querySelector('[data-testid="pdfjs-viewer-container"]');
console.log('PDF viewer container found:', !!pdfViewer);

// Check if hideToolbar is working
const pdfToolbar = document.querySelector('[data-testid="pdfjs-toolbar"]');
console.log('PDF.js toolbar found (should be hidden):', !!pdfToolbar);
`;

console.log('Run this code in browser console:');
console.log(diagnosticCode);

export {};