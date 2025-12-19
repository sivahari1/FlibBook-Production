#!/usr/bin/env tsx
/**
 * Script to add proper type annotations to catch blocks in API routes
 * This addresses ESLint warnings about implicit any types
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = join(process.cwd(), 'app', 'api');

function getAllRouteFiles(dir: string): string[] {
  const files: string[] = [];
  
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllRouteFiles(fullPath));
    } else if (item === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixCatchBlocks(content: string): string {
  // Pattern 1: } catch (error) {
  content = content.replace(
    /\} catch \(error\) \{/g,
    '} catch (error: unknown) {'
  );
  
  // Pattern 2: catch (error) {
  content = content.replace(
    /catch \(error\) \{/g,
    'catch (error: unknown) {'
  );
  
  return content;
}

function main() {
  console.log('Finding all API route files...');
  const routeFiles = getAllRouteFiles(API_DIR);
  console.log(`Found ${routeFiles.length} route files`);
  
  let updatedCount = 0;
  
  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8');
    const updated = fixCatchBlocks(content);
    
    if (content !== updated) {
      writeFileSync(file, updated, 'utf-8');
      console.log(`✓ Updated: ${file.replace(process.cwd(), '')}`);
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} files`);
}

main();
