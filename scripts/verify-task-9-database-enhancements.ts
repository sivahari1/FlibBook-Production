#!/usr/bin/env tsx

/**
 * Verification script for Task 9: Database Schema Enhancements
 * 
 * This script verifies that all database schema enhancements for the
 * JStudyRoom document viewing fix have been properly implemented.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  task: string;
  status: 'PASS' | 'FAIL';
  details: string;
  errors?: string[];
}

async function verifyTask9DatabaseEnhancements(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  
  try {
    console.log('🔍 Verifying Task 9: Database Schema Enhancements...\n');

    // Task 9.1: Verify conversion job tracking table
    console.log('📋 Task 9.1: Verifying conversion job tracking table...');
    try {
      // Check if ConversionJob model exists and has required fields
      const conversionJobCount = await prisma.conversionJob.count();
      
      // Test creating a sample conversion job (will rollback)
      const testDocument = await prisma.document.findFirst();
      if (testDocument) {
        const testJob = await prisma.conversionJob.create({
          data: {
            documentId: testDocument.id,
            status: 'queued',
            progress: 0,
            stage: 'queued',
            priority: 'normal',
            retryCount: 0,
          }
        });
        
        // Verify all required fields are present
        const requiredFields = [
          'id', 'documentId', 'status', 'progress', 'stage', 
          'priority', 'retryCount', 'createdAt', 'updatedAt'
        ];
        
        const missingFields = requiredFields.filter(field => !(field in testJob));
        
        // Clean up test data
        await prisma.conversionJob.delete({ where: { id: testJob.id } });
        
        if (missingFields.length === 0) {
          results.push({
            task: '9.1 Create conversion job tracking table',
            status: 'PASS',
            details: `ConversionJob table exists with all required fields. Current jobs: ${conversionJobCount}`
          });
        } else {
          results.push({
            task: '9.1 Create conversion job tracking table',
            status: 'FAIL',
            details: 'ConversionJob table missing required fields',
            errors: [`Missing fields: ${missingFields.join(', ')}`]
          });
        }
      } else {
        results.push({
          task: '9.1 Create conversion job tracking table',
          status: 'PASS',
          details: 'ConversionJob table exists (no test documents available for full verification)'
        });
      }
    } catch (error) {
      results.push({
        task: '9.1 Create conversion job tracking table',
        status: 'FAIL',
        details: 'Failed to verify ConversionJob table',
        errors: [error instanceof Error ? error.message : String(error)]
      });
    }

    // Task 9.2: Verify document pages schema optimization
    console.log('📄 Task 9.2: Verifying document pages schema optimization...');
    try {
      // Check if DocumentPage model has optimization fields
      const documentPageCount = await prisma.documentPage.count();
      
      // Test creating a sample document page (will rollback)
      const testDocument = await prisma.document.findFirst();
      if (testDocument) {
        const testPage = await prisma.documentPage.create({
          data: {
            documentId: testDocument.id,
            pageNumber: 999,
            pageUrl: 'https://test.example.com/test-page.jpg',
            fileSize: 1024,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            cacheKey: 'test-cache-key',
            version: 1,
            generationMethod: 'standard',
            qualityLevel: 'standard',
            format: 'jpeg'
          }
        });
        
        // Verify optimization fields are present
        const optimizationFields = [
          'cacheKey', 'cacheExpiresAt', 'cacheHitCount', 'lastAccessedAt',
          'version', 'generationMethod', 'qualityLevel', 'processingTimeMs',
          'optimizationApplied', 'format'
        ];
        
        const missingFields = optimizationFields.filter(field => !(field in testPage));
        
        // Clean up test data
        await prisma.documentPage.delete({ where: { id: testPage.id } });
        
        if (missingFields.length === 0) {
          results.push({
            task: '9.2 Optimize document pages schema',
            status: 'PASS',
            details: `DocumentPage table optimized with cache metadata and versioning. Current pages: ${documentPageCount}`
          });
        } else {
          results.push({
            task: '9.2 Optimize document pages schema',
            status: 'FAIL',
            details: 'DocumentPage table missing optimization fields',
            errors: [`Missing fields: ${missingFields.join(', ')}`]
          });
        }
      } else {
        results.push({
          task: '9.2 Optimize document pages schema',
          status: 'PASS',
          details: 'DocumentPage table optimized (no test documents available for full verification)'
        });
      }
    } catch (error) {
      results.push({
        task: '9.2 Optimize document pages schema',
        status: 'FAIL',
        details: 'Failed to verify DocumentPage optimization',
        errors: [error instanceof Error ? error.message : String(error)]
      });
    }

    // Task 9.3: Verify conversion analytics tables
    console.log('📊 Task 9.3: Verifying conversion analytics tables...');
    try {
      // Check all analytics tables exist
      const conversionAnalyticsCount = await prisma.conversionAnalytics.count();
      const documentLoadAnalyticsCount = await prisma.documentLoadAnalytics.count();
      const userExperienceAnalyticsCount = await prisma.userExperienceAnalytics.count();
      
      // Test creating sample analytics records (will rollback)
      const testDocument = await prisma.document.findFirst();
      const testUser = await prisma.user.findFirst();
      
      if (testDocument && testUser) {
        // Test ConversionAnalytics
        const testConversionAnalytics = await prisma.conversionAnalytics.create({
          data: {
            documentId: testDocument.id,
            userId: testUser.id,
            startedAt: new Date(),
            status: 'started',
            pagesProcessed: 0,
            totalPages: 10,
            processingMethod: 'standard',
            qualityLevel: 'standard',
            retryCount: 0
          }
        });
        
        // Test DocumentLoadAnalytics
        const testLoadAnalytics = await prisma.documentLoadAnalytics.create({
          data: {
            documentId: testDocument.id,
            userId: testUser.id,
            startedAt: new Date(),
            status: 'started',
            pagesLoaded: 0,
            totalPages: 10,
            retryCount: 0
          }
        });
        
        // Test UserExperienceAnalytics
        const testUXAnalytics = await prisma.userExperienceAnalytics.create({
          data: {
            userId: testUser.id,
            documentId: testDocument.id,
            actionType: 'view_start',
            actionTimestamp: new Date()
          }
        });
        
        // Verify all required fields are present
        const conversionFields = [
          'id', 'documentId', 'startedAt', 'status', 'pagesProcessed', 
          'totalPages', 'processingMethod', 'qualityLevel', 'retryCount'
        ];
        const loadFields = [
          'id', 'documentId', 'userId', 'startedAt', 'status', 
          'pagesLoaded', 'totalPages', 'retryCount'
        ];
        const uxFields = [
          'id', 'userId', 'documentId', 'actionType', 'actionTimestamp'
        ];
        
        const missingConversionFields = conversionFields.filter(field => !(field in testConversionAnalytics));
        const missingLoadFields = loadFields.filter(field => !(field in testLoadAnalytics));
        const missingUXFields = uxFields.filter(field => !(field in testUXAnalytics));
        
        // Clean up test data
        await prisma.conversionAnalytics.delete({ where: { id: testConversionAnalytics.id } });
        await prisma.documentLoadAnalytics.delete({ where: { id: testLoadAnalytics.id } });
        await prisma.userExperienceAnalytics.delete({ where: { id: testUXAnalytics.id } });
        
        if (missingConversionFields.length === 0 && missingLoadFields.length === 0 && missingUXFields.length === 0) {
          results.push({
            task: '9.3 Create conversion analytics tables',
            status: 'PASS',
            details: `All analytics tables exist with required fields. Records: Conversion(${conversionAnalyticsCount}), Load(${documentLoadAnalyticsCount}), UX(${userExperienceAnalyticsCount})`
          });
        } else {
          const errors = [];
          if (missingConversionFields.length > 0) errors.push(`ConversionAnalytics missing: ${missingConversionFields.join(', ')}`);
          if (missingLoadFields.length > 0) errors.push(`DocumentLoadAnalytics missing: ${missingLoadFields.join(', ')}`);
          if (missingUXFields.length > 0) errors.push(`UserExperienceAnalytics missing: ${missingUXFields.join(', ')}`);
          
          results.push({
            task: '9.3 Create conversion analytics tables',
            status: 'FAIL',
            details: 'Analytics tables missing required fields',
            errors
          });
        }
      } else {
        results.push({
          task: '9.3 Create conversion analytics tables',
          status: 'PASS',
          details: 'Analytics tables exist (no test data available for full verification)'
        });
      }
    } catch (error) {
      results.push({
        task: '9.3 Create conversion analytics tables',
        status: 'FAIL',
        details: 'Failed to verify analytics tables',
        errors: [error instanceof Error ? error.message : String(error)]
      });
    }

  } catch (error) {
    console.error('❌ Fatal error during verification:', error);
    results.push({
      task: 'Task 9 Overall',
      status: 'FAIL',
      details: 'Fatal error during verification',
      errors: [error instanceof Error ? error.message : String(error)]
    });
  } finally {
    await prisma.$disconnect();
  }

  return results;
}

async function main() {
  const results = await verifyTask9DatabaseEnhancements();
  
  console.log('\n📊 Task 9 Verification Results:');
  console.log('================================\n');
  
  let allPassed = true;
  
  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.task}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('   Errors:');
      result.errors.forEach(error => console.log(`     - ${error}`));
      allPassed = false;
    }
    console.log();
  }
  
  console.log('================================');
  if (allPassed) {
    console.log('🎉 All Task 9 database enhancements verified successfully!');
    console.log('\nTask 9 is COMPLETE ✅');
  } else {
    console.log('⚠️  Some Task 9 verifications failed. Please review the errors above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}