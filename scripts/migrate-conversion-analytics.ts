#!/usr/bin/env tsx

/**
 * Migration script to add conversion analytics tables
 * This script applies the conversion analytics migration to the database
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Starting conversion analytics migration...');

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'prisma/migrations/20241217120000_add_conversion_analytics/migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL loaded successfully');

    // Execute the migration
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✅ Conversion analytics tables created successfully!');

    // Verify the tables were created
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversion_analytics', 'document_load_analytics', 'user_experience_analytics', 'system_performance_metrics')
      ORDER BY table_name;
    `;

    console.log('📊 Created tables:', tables);

    // Test the analytics service
    console.log('🧪 Testing analytics service...');
    
    const { conversionAnalytics } = await import('../lib/services/conversion-analytics');
    
    // Record a test system metric
    await conversionAnalytics.recordSystemMetric({
      metricType: 'conversion_queue_depth',
      metricValue: 0,
      metricUnit: 'count',
      timePeriod: 'hourly',
      recordedAt: new Date(),
      metadata: { source: 'migration_test' },
    });

    console.log('✅ Analytics service test successful!');

    console.log('\n🎉 Conversion analytics migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your application to use the new analytics tracking');
    console.log('2. Integrate analytics hooks in your document viewing components');
    console.log('3. Set up monitoring dashboards using the analytics API');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});