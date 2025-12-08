import { prisma } from '../lib/db';
import { getSignedUrl, getBucketForContentType } from '../lib/storage';
import { ContentType } from '../lib/types/content';

async function diagnoseViewerBlocking() {
  const documentId = '507a283f-2d15-400f-9284-b05a8daa7046';
  
  console.log('🔍 Diagnosing viewer blocking issue...\n');
  
  try {
    // Fetch document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        filename: true,
        storagePath: true,
        contentType: true,
        mimeType: true,
        userId: true,
      },
    });

    if (!document) {
      console.error('❌ Document not found');
      return;
    }

    console.log('📄 Document Info:');
    console.log(`   Title: ${document.title}`);
    console.log(`   Filename: ${document.filename}`);
    console.log(`   Content Type: ${document.contentType}`);
    console.log(`   MIME Type: ${document.mimeType}`);
    console.log(`   Storage Path: ${document.storagePath}\n`);

    // Generate signed URL
    const contentType = (document.contentType as ContentType) || ContentType.PDF;
    const bucket = getBucketForContentType(contentType);
    
    console.log(`🪣 Storage Bucket: ${bucket}\n`);

    const { url: signedUrl, error } = await getSignedUrl(
      document.storagePath!,
      3600,
      bucket
    );

    if (error || !signedUrl) {
      console.error('❌ Failed to generate signed URL:', error);
      return;
    }

    console.log('✅ Signed URL generated successfully');
    console.log(`   URL: ${signedUrl.substring(0, 100)}...\n`);

    // Parse URL to check parameters
    const url = new URL(signedUrl);
    console.log('🔗 URL Analysis:');
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.host}`);
    console.log(`   Pathname: ${url.pathname}`);
    console.log(`   Has token: ${url.searchParams.has('token')}`);
    console.log(`   Has signature: ${url.searchParams.has('signature')}\n`);

    // Test URL accessibility
    console.log('🌐 Testing URL accessibility...');
    try {
      const response = await fetch(signedUrl, {
        method: 'HEAD',
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')}`);
      console.log(`   X-Frame-Options: ${response.headers.get('x-frame-options') || 'not set'}`);
      console.log(`   Content-Security-Policy: ${response.headers.get('content-security-policy') || 'not set'}`);
      console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin') || 'not set'}\n`);

      if (response.status === 200) {
        console.log('✅ URL is accessible');
      } else {
        console.log('⚠️  URL returned non-200 status');
      }
    } catch (fetchError) {
      console.error('❌ Failed to fetch URL:', fetchError);
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('   1. Check if X-Frame-Options header is blocking iframe embedding');
    console.log('   2. Verify Content-Security-Policy allows iframe embedding');
    console.log('   3. Consider using PDF.js instead of iframe for better control');
    console.log('   4. Check browser console for specific error messages');
    console.log('   5. Try removing sandbox attribute or using less restrictive values');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseViewerBlocking();
