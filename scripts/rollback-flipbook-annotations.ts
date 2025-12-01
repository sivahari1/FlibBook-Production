#!/usr/bin/env ts-node

/**
 * Rollback script for Flipbook & Media Annotations
 * 
 * This script handles rollback procedures including:
 * - Database rollback
 * - Application rollback
 * - Verification
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const prisma = new PrismaClient();

interface RollbackOptions {
  backupFile?: string;
  skipDatabase?: boolean;
  skipApplication?: boolean;
}

/**
 * Find latest database backup
 */
function findLatestBackup(): string | null {
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    return null;
  }
  
  const backups = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .reverse();
  
  return backups.length > 0 ? path.join(backupDir, backups[0]) : null;
}

/**
 * Rollback database
 */
async function rollbackDatabase(backupFile?: string): Promise<boolean> {
  console.log('\n🔄 Rolling back database...');
  
  try {
    const backup = backupFile || findLatestBackup();
    
    if (!backup) {
      console.error('❌ No backup file found');
      return false;
    }
    
    console.log(`📁 Using backup: ${backup}`);
    
    // Confirm rollback
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const answer = await new Promise<string>((resolve) => {
      readline.question('⚠️  This will restore the database. Continue? (yes/no): ', resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Rollback cancelled');
      return false;
    }
    
    // Restore database
    const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
    execSync(`psql ${databaseUrl} < ${backup}`, { stdio: 'inherit' });
    
    console.log('✅ Database rolled back successfully');
    return true;
  } catch (error) {
    console.error('❌ Database rollback failed:', error);
    return false;
  }
}

/**
 * Rollback application
 */
async function rollbackApplication(): Promise<boolean> {
  console.log('\n🔄 Rolling back application...');
  
  try {
    // Rollback Vercel deployment
    console.log('Rolling back Vercel deployment...');
    execSync('vercel rollback --yes', { stdio: 'inherit' });
    
    console.log('✅ Application rolled back successfully');
    return true;
  } catch (error) {
    console.error('❌ Application rollback failed:', error);
    console.log('💡 Try manual rollback: vercel rollback');
    return false;
  }
}

/**
 * Verify rollback
 */
async function verifyRollback(): Promise<boolean> {
  console.log('\n✓ Verifying rollback...');
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
    
    // Check DocumentAnnotation table
    const count = await prisma.documentAnnotation.count();
    console.log(`✅ DocumentAnnotation table accessible (${count} records)`);
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

/**
 * Main rollback function
 */
async function rollback(options: RollbackOptions = {}) {
  console.log('🔄 Starting Flipbook & Media Annotations rollback\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Rollback database
    if (!options.skipDatabase) {
      const dbSuccess = await rollbackDatabase(options.backupFile);
      if (!dbSuccess) {
        throw new Error('Database rollback failed');
      }
    } else {
      console.log('⏭️  Skipping database rollback');
    }
    
    // Step 2: Rollback application
    if (!options.skipApplication) {
      const appSuccess = await rollbackApplication();
      if (!appSuccess) {
        console.warn('⚠️  Application rollback incomplete');
      }
    } else {
      console.log('⏭️  Skipping application rollback');
    }
    
    // Step 3: Verify rollback
    const verifySuccess = await verifyRollback();
    if (!verifySuccess) {
      throw new Error('Rollback verification failed');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Rollback completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify application functionality');
    console.log('2. Check error logs: vercel logs');
    console.log('3. Monitor metrics');
    console.log('4. Investigate root cause');
    
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    console.log('\n🆘 Emergency procedures:');
    console.log('1. Contact DevOps team');
    console.log('2. Check status page');
    console.log('3. Review rollback documentation');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: RollbackOptions = {
  backupFile: args.find(arg => arg.startsWith('--backup='))?.split('=')[1],
  skipDatabase: args.includes('--skip-database'),
  skipApplication: args.includes('--skip-application'),
};

// Run rollback
if (require.main === module) {
  rollback(options);
}

export { rollback };
