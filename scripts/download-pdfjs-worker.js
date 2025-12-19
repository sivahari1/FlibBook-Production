#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_PATH = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'pdf.worker.min.js');

console.log('📥 Setting up PDF.js worker...');

// Ensure public directory exists
const publicDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Check if worker already exists and is valid
if (fs.existsSync(OUTPUT_PATH)) {
  const stats = fs.statSync(OUTPUT_PATH);
  // If file exists and is larger than 1MB (reasonable size check)
  if (stats.size > 1024 * 1024) {
    console.log('✅ PDF.js worker already exists and appears valid');
    process.exit(0);
  }
}

// Check if source exists
if (!fs.existsSync(SOURCE_PATH)) {
  console.error('❌ PDF.js worker not found in node_modules');
  console.error('   Please run: npm install');
  process.exit(1);
}

try {
  // Copy worker file from node_modules
  fs.copyFileSync(SOURCE_PATH, OUTPUT_PATH);
  
  // Verify file size
  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`✅ PDF.js worker copied successfully!`);
  console.log(`📏 File size: ${Math.round(stats.size / 1024)}KB`);
  
  if (stats.size < 100 * 1024) { // Less than 100KB is suspicious
    console.warn('⚠️  Warning: Worker file seems too small');
  }
} catch (err) {
  console.error('❌ Error copying worker file:', err.message);
  process.exit(1);
}
