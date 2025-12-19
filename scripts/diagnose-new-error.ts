#!/usr/bin/env tsx

/**
 * Diagnostic script to identify the new error mentioned by the user
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnosing the NEW error in jStudyRoom document viewer...\n');

  try {
    // Check if the development server is running
    console.log('1. Testing if development server is accessible...');
    try {
      const response = await fetch('http://localhost:3000/api/health', {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        console.log('   ✅ Development server is running');
      } else {
        console.log('   ❌ Development server returned:', response.status);
      }
    } catch (error) {
      console.log('   ❌ Development server not accessible:', error.message);
      console.log('   💡 Please start the server with: npm run dev');
      return;
    }

    // Test the specific document from the URL in the screenshot
    const documentId = '3a3d035b-5d3e-4261-8694-b80b42e1f113';
    console.log(`\n2. Testing document from screenshot URL: ${documentId}`);
    
    // Check if this document exists in database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        pages: true,
        bookShopItems: true
      }
    });

    if (!document) {
      console.log('   ❌ Document not found in database');
      console.log('   💡 This might be the issue - the URL shows a document that doesn\'t exist');
    } else {
      console.log(`   ✅ Document found: "${document.title}"`);
      console.log(`   📄 Pages: ${document.pages?.length || 0}`);
      console.log(`   🛒 In bookshop: ${document.bookShopItems?.length > 0 ? 'Yes' : 'No'}`);
      
      if (document.pages?.length === 0) {
        console.log('   ⚠️  This document has NO PAGES - this could cause viewer errors');
      }
    }

    // Test member pages API for this specific document
    console.log('\n3. Testing member pages API for this document...');
    try {
      const response = await fetch(`http://localhost:3000/api/member/my-jstudyroom/${documentId}/pages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ API responded successfully`);
        console.log(`   📄 Pages returned: ${data.pages?.length || 0}`);
        
        if (data.pages?.length === 0) {
          console.log('   ⚠️  API returned 0 pages - this will cause "no pages to display" error');
        }
      } else {
        console.log(`   ❌ API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`   📝 Error details: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ API request failed: ${error.message}`);
    }

    // Check for common error patterns based on the screenshot
    console.log('\n4. Analyzing potential issues from screenshot...');
    
    console.log('   🔍 From the console output, I can see:');
    console.log('   - PDF.js memory warnings (expected after our fixes)');
    console.log('   - DRM protection warnings (expected after our fixes)');
    console.log('   - Memory pressure cleanup (expected after our fixes)');
    console.log('');
    
    // Check if this is the "DL&CO Syllabus" document we identified earlier
    if (document?.title === 'DL&CO Syllabus') {
      console.log('   🎯 FOUND THE ISSUE!');
      console.log('   This is the "DL&CO Syllabus" document that has NO PAGES');
      console.log('   When you try to view a document with no pages, it causes errors');
      console.log('');
      console.log('   🔧 SOLUTION:');
      console.log('   1. This document needs to be converted to generate pages');
      console.log('   2. Or it should be removed from the bookshop');
      console.log('   3. Or the viewer should handle "no pages" gracefully');
    }

    // Provide specific guidance based on findings
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    
    if (!document) {
      console.log('❌ ISSUE IDENTIFIED: Document not found');
      console.log('   The URL shows a document ID that doesn\'t exist in the database');
      console.log('   This will cause the viewer to fail');
    } else if (document.pages?.length === 0) {
      console.log('❌ ISSUE IDENTIFIED: Document has no pages');
      console.log('   The document exists but has no converted pages');
      console.log('   This will cause "no pages to display" error in the viewer');
    } else {
      console.log('✅ Document structure looks good');
      console.log('   The error might be something else - please check browser console');
    }

    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Check the exact error message in browser console');
    console.log('2. Try viewing a document that has pages (like TPIPR)');
    console.log('3. If the issue is "no pages", we can fix the document conversion');
    console.log('4. If it\'s a different error, please share the exact error message');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);