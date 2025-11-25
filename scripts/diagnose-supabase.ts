console.log('🔍 Supabase Connection Diagnostics\n')
console.log('=' .repeat(50))

// Check environment variables
console.log('\n📋 Environment Variables:')
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL)
    console.log('  Protocol:', url.protocol)
    console.log('  Host:', url.hostname)
    console.log('  Port:', url.port || '5432')
    console.log('  Database:', url.pathname.slice(1))
    console.log('  Username:', url.username)
    console.log('  Password:', url.password ? '***' + url.password.slice(-4) : 'NOT SET')
    console.log('  Search params:', url.search || 'none')
  } catch (e) {
    console.log('  ❌ Invalid DATABASE_URL format')
  }
}

console.log('\n🔧 Recommendations:')
console.log('1. Visit: https://supabase.com/dashboard')
console.log('2. Find project: zuhrivibcgudgsejsljo')
console.log('3. Check if project is PAUSED')
console.log('4. If paused, click "Resume Project"')
console.log('5. Get fresh connection string from Settings → Database')
console.log('6. Update .env.local with new DATABASE_URL')

console.log('\n📚 Full guide: See SUPABASE_CONNECTION_GUIDE.md')
console.log('=' .repeat(50))
