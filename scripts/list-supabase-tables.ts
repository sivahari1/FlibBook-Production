/**
 * List all tables in Supabase database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function listTables() {
  console.log('📋 LISTING SUPABASE DATABASE TABLES\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Query the information schema to get all tables
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            table_schema,
            table_name,
            table_type
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
          ORDER BY table_schema, table_name;
        `
      });

    if (error) {
      console.log('⚠️  RPC method not available, trying direct query...\n');
      
      // Try a simpler approach - query known tables
      const knownTables = [
        'users',
        'documents', 
        'Document',
        'document_pages',
        'DocumentPage',
        'share_links',
        'document_shares',
        'subscriptions',
        'payments',
        'view_analytics',
        'verification_tokens',
        'access_requests',
        'bookshop_items',
        'my_jstudyroom_items',
        'document_annotations'
      ];

      console.log('Checking known tables:\n');
      
      for (const tableName of knownTables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (!tableError) {
            console.log(`✅ ${tableName}`);
          }
        } catch (e) {
          // Table doesn't exist or not accessible
        }
      }

      // Also check with different casing
      console.log('\n\nChecking with PascalCase:\n');
      const pascalTables = ['Document', 'DocumentPage', 'User', 'ShareLink'];
      
      for (const tableName of pascalTables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (!tableError) {
            console.log(`✅ ${tableName}`);
          }
        } catch (e) {
          // Table doesn't exist or not accessible
        }
      }

    } else {
      console.log('\n✅ Tables found:\n');
      console.log(data);
    }

    // Try to get table info using Postgres system tables
    console.log('\n\n📊 Attempting to query pg_tables:\n');
    
    const { data: pgData, error: pgError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');

    if (pgError) {
      console.log('❌ Cannot access pg_tables:', pgError.message);
    } else {
      console.log('✅ Public schema tables:');
      pgData?.forEach((table: any) => {
        console.log(`   - ${table.tablename}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Check storage buckets
  console.log('\n\n🗄️  STORAGE BUCKETS:\n');
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('❌ Error listing buckets:', bucketError.message);
    } else {
      buckets?.forEach((bucket) => {
        console.log(`   ✅ ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }
  } catch (error) {
    console.error('❌ Error listing buckets:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Complete!\n');
}

listTables().catch(console.error);
