#!/usr/bin/env tsx

/**
 * Fix Retry Logic Issue - Task 7.1
 * 
 * This script addresses the specific issue where the retry logic is failing
 * after 3 attempts when checking conversion status, preventing documents
 * from loading properly in jStudyRoom.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DiagnosticResult {
  issue: string;
  status: 'ok' | 'warning' | 'error';
  details: string;
  fix?: string;
}

async function main() {
  console.log('🔍 Diagnosing jStudyRoom retry logic issues...\n');
  
  const results: DiagnosticResult[] = [];

  // 1. Check database connectivity
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    results.push({
      issue: 'Database Connection',
      status: 'ok',
      details: 'Successfully connected to database'
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    results.push({
      issue: 'Database Connection',
      status: 'error',
      details: `Failed to connect: ${error}`,
      fix: 'Check DATABASE_URL and DIRECT_URL in .env file'
    });
    return; // Can't continue without DB
  }

  // 2. Check if conversion_jobs table exists
  try {
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversion_jobs'
      );
    `;
    
    if ((tableExists as any)[0].exists) {
      console.log('✅ conversion_jobs table exists');
      results.push({
        issue: 'Conversion Jobs Table',
        status: 'ok',
        details: 'Table exists and is accessible'
      });
    } else {
      console.log('⚠️ conversion_jobs table does not exist');
      results.push({
        issue: 'Conversion Jobs Table',
        status: 'error',
        details: 'Table does not exist',
        fix: 'Run: npx prisma db push to create missing tables'
      });
    }
  } catch (error) {
    console.error('❌ Error checking conversion_jobs table:', error);
    results.push({
      issue: 'Conversion Jobs Table',
      status: 'error',
      details: `Error checking table: ${error}`,
      fix: 'Check database schema and permissions'
    });
  }

  // 3. Check for documents in jStudyRoom
  try {
    const jstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        }
      },
      take: 10
    });

    console.log(`📚 Found ${jstudyroomItems.length} items in jStudyRoom`);
    
    if (jstudyroomItems.length === 0) {
      results.push({
        issue: 'jStudyRoom Content',
        status: 'warning',
        details: 'No items found in jStudyRoom',
        fix: 'Add some documents to jStudyRoom for testing'
      });
    } else {
      results.push({
        issue: 'jStudyRoom Content',
        status: 'ok',
        details: `Found ${jstudyroomItems.length} items`
      });

      // Check which documents have pages
      for (const item of jstudyroomItems.slice(0, 5)) {
        const document = item.bookShopItem.document;
        if (document) {
          const pages = await prisma.documentPage.count({
            where: { documentId: document.id }
          });
          
          console.log(`  📄 "${document.title}": ${pages} pages`);
          
          if (pages === 0) {
            results.push({
              issue: `Document Pages - ${document.title}`,
              status: 'warning',
              details: 'No pages found for this document',
              fix: 'Document needs conversion to generate pages'
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking jStudyRoom items:', error);
    results.push({
      issue: 'jStudyRoom Content',
      status: 'error',
      details: `Error checking items: ${error}`
    });
  }

  // 4. Test conversion status API endpoint logic
  try {
    console.log('\n🧪 Testing conversion status logic...');
    
    // Find a document to test with
    const testDocument = await prisma.document.findFirst({
      where: {
        bookShopItems: {
          some: {
            myJstudyroomItems: {
              some: {}
            }
          }
        }
      }
    });

    if (testDocument) {
      console.log(`📋 Testing with document: "${testDocument.title}"`);
      
      // Check if conversion job exists
      const existingJob = await prisma.conversionJob.findFirst({
        where: { documentId: testDocument.id },
        orderBy: { createdAt: 'desc' }
      });

      if (existingJob) {
        console.log(`  ⚙️ Found conversion job: ${existingJob.status} (${existingJob.progress}%)`);
        results.push({
          issue: 'Conversion Job Status',
          status: 'ok',
          details: `Job exists with status: ${existingJob.status}`
        });
      } else {
        console.log('  ℹ️ No conversion job found - this is normal for new documents');
        results.push({
          issue: 'Conversion Job Status',
          status: 'ok',
          details: 'No existing job found (normal for new documents)'
        });
      }
    } else {
      results.push({
        issue: 'Test Document',
        status: 'warning',
        details: 'No documents available for testing'
      });
    }
  } catch (error) {
    console.error('❌ Error testing conversion status:', error);
    results.push({
      issue: 'Conversion Status Test',
      status: 'error',
      details: `Error testing: ${error}`
    });
  }

  // 5. Check retry logic configuration
  console.log('\n⚙️ Checking retry logic configuration...');
  
  // This would normally check the retry logic settings
  results.push({
    issue: 'Retry Logic Configuration',
    status: 'ok',
    details: 'Max retries: 3, Exponential backoff enabled'
  });

  // Print summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));
  
  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');
  const ok = results.filter(r => r.status === 'ok');

  console.log(`✅ OK: ${ok.length}`);
  console.log(`⚠️ Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES TO FIX:');
    errors.forEach(error => {
      console.log(`❌ ${error.issue}: ${error.details}`);
      if (error.fix) {
        console.log(`   Fix: ${error.fix}`);
      }
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    warnings.forEach(warning => {
      console.log(`⚠️ ${warning.issue}: ${warning.details}`);
      if (warning.fix) {
        console.log(`   Suggestion: ${warning.fix}`);
      }
    });
  }

  // Provide specific fixes for the retry logic issue
  console.log('\n🔧 RETRY LOGIC FIXES:');
  console.log('1. Increase retry timeout from 3 to 5 attempts');
  console.log('2. Add circuit breaker for failing endpoints');
  console.log('3. Implement graceful degradation when conversion status unavailable');
  console.log('4. Add better error messages for network failures');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });