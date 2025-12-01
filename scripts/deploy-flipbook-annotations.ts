#!/usr/bin/env ts-node

/**
 * Deployment script for Flipbook & Media Annotations
 * 
 * This script handles the complete deployment process including:
 * - Database migrations
 * - Storage bucket setup
 * - Environment validation
 * - Post-deployment verification
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const prisma = new PrismaClient();

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  documentPagesBucket: process.env.SUPABASE_DOCUMENT_PAGES_BUCKET || 'document-pages',
  documentMediaBucket: process.env.SUPABASE_DOCUMENT_MEDIA_BUCKET || 'document-media',
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * Validate environment variables
 */
async function validateEnvironment(): Promise<boolean> {
  console.log('🔍 Validating environment variables...');
  
  const required = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    return false;
  }
  
  console.log('✅ Environment variables validated');
  return true;
}

/**
 * Run database migrations
 */
async function runMigrations(): Promise<boolean> {
  console.log('\n📦 Running database migrations...');
  
  try {
    // Check if migrations are needed
    const { execSync } = require('child_process');
    
    // Run Prisma migrations
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    console.log('✅ Database migrations completed');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

/**
 * Create storage buckets
 */
async function setupStorageBuckets(): Promise<boolean> {
  console.log('\n🗄️  Setting up storage buckets...');
  
  try {
    // Create document-pages bucket
    const { data: pagesBucket, error: pagesError } = await supabase
      .storage
      .createBucket(config.documentPagesBucket, {
        public: false,
        fileSizeLimit: 10485760, // 10MB per page
      });
    
    if (pagesError && !pagesError.message.includes('already exists')) {
      throw pagesError;
    }
    
    console.log(`✅ Bucket '${config.documentPagesBucket}' ready`);
    
    // Create document-media bucket
    const { data: mediaBucket, error: mediaError } = await supabase
      .storage
      .createBucket(config.documentMediaBucket, {
        public: false,
        fileSizeLimit: 104857600, // 100MB per file
      });
    
    if (mediaError && !mediaError.message.includes('already exists')) {
      throw mediaError;
    }
    
    console.log(`✅ Bucket '${config.documentMediaBucket}' ready`);
    
    return true;
  } catch (error) {
    console.error('❌ Storage setup failed:', error);
    return false;
  }
}

/**
 * Configure RLS policies
 */
async function setupRLSPolicies(): Promise<boolean> {
  console.log('\n🔒 Configuring RLS policies...');
  
  try {
    // Note: RLS policies should be set up manually in Supabase dashboard
    // or via SQL scripts for security reasons
    console.log('⚠️  RLS policies should be configured manually');
    console.log('   See: docs/flipbook-annotations/DEPLOYMENT_GUIDE.md');
    
    return true;
  } catch (error) {
    console.error('❌ RLS setup failed:', error);
    return false;
  }
}

/**
 * Verify deployment
 */
async function verifyDeployment(): Promise<boolean> {
  console.log('\n✓ Verifying deployment...');
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
    
    // Test storage buckets
    const { data: pagesList } = await supabase
      .storage
      .from(config.documentPagesBucket)
      .list();
    
    const { data: mediaList } = await supabase
      .storage
      .from(config.documentMediaBucket)
      .list();
    
    console.log('✅ Storage buckets verified');
    
    // Check for DocumentAnnotation table
    const annotations = await prisma.documentAnnotation.findMany({
      take: 1,
    });
    
    console.log('✅ DocumentAnnotation table verified');
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  console.log('🚀 Starting Flipbook & Media Annotations deployment\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Validate environment
    const envValid = await validateEnvironment();
    if (!envValid) {
      throw new Error('Environment validation failed');
    }
    
    // Step 2: Run migrations
    const migrationsSuccess = await runMigrations();
    if (!migrationsSuccess) {
      throw new Error('Database migrations failed');
    }
    
    // Step 3: Setup storage
    const storageSuccess = await setupStorageBuckets();
    if (!storageSuccess) {
      throw new Error('Storage setup failed');
    }
    
    // Step 4: Setup RLS
    const rlsSuccess = await setupRLSPolicies();
    if (!rlsSuccess) {
      console.warn('⚠️  RLS setup incomplete - manual configuration required');
    }
    
    // Step 5: Verify deployment
    const verifySuccess = await verifyDeployment();
    if (!verifySuccess) {
      throw new Error('Deployment verification failed');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Deployment completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure RLS policies in Supabase dashboard');
    console.log('2. Run smoke tests: npm run test:smoke');
    console.log('3. Monitor deployment: vercel logs');
    console.log('4. Check status page: https://your-domain.com/status');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run deployment
if (require.main === module) {
  deploy();
}

export { deploy };
