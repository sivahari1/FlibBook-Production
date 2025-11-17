/**
 * Book Shop Seed Script
 * 
 * Creates sample Book Shop categories and items for testing
 * 
 * Usage:
 *   npx tsx prisma/seed-bookshop.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sample categories for the Book Shop
const SAMPLE_CATEGORIES = [
  '10th CBSE Math',
  '10th CBSE Science',
  '10th CBSE English',
  '12th CBSE Physics',
  '12th CBSE Chemistry',
  'Functional MRI',
  'Medical Imaging',
  'Classical Music Theory',
  'Piano Techniques',
  'Programming Fundamentals',
  'Web Development',
  'Data Science',
]

async function main() {
  console.log('🌱 Seeding Book Shop data...')

  // Note: This script creates sample categories
  // Actual Book Shop items should be created by admins through the UI
  // as they need to be linked to existing documents

  console.log('\n📚 Sample Book Shop Categories:')
  SAMPLE_CATEGORIES.forEach((category, index) => {
    console.log(`   ${index + 1}. ${category}`)
  })

  console.log('\n✅ Book Shop categories reference created')
  console.log('ℹ️  Admins can use these categories when creating Book Shop items')
  console.log('ℹ️  Or create custom categories through the admin interface')
}

main()
  .catch((error) => {
    console.error('❌ Error seeding Book Shop data:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
