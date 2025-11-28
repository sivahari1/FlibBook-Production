import { NextResponse } from 'next/server';

// Temporary debug endpoint - REMOVE after fixing production issue
export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasDirect: !!process.env.DIRECT_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
    },
    databaseInfo: {
      usingDirectUrl: !!process.env.DIRECT_URL,
      connectionPreference: process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL'
    },
    warning: 'This endpoint should be removed after debugging'
  });
}
