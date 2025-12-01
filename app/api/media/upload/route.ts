/**
 * Media Upload API Route
 * Handles file uploads for annotation media
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/media/upload - Upload media file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has PLATFORM_USER role
    if (session.user.role !== 'PLATFORM_USER') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only PLATFORM_USER can upload media.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!mediaType || !['AUDIO', 'VIDEO'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid media type. Must be AUDIO or VIDEO.' },
        { status: 400 }
      );
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
    const allowedTypes = mediaType === 'AUDIO' ? allowedAudioTypes : allowedVideoTypes;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: `Invalid file type for ${mediaType}. Allowed types: ${allowedTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${nanoid()}.${fileExtension}`;
    const filePath = `${session.user.id}/${mediaType.toLowerCase()}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('document-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Generate signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from('document-media')
      .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate file URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mediaUrl: urlData.signedUrl,
      fileName: file.name,
      fileSize: file.size,
      mediaType,
      uploadPath: filePath
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/media/upload - Delete media file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Verify user owns the file (path should start with user ID)
    if (!filePath.startsWith(session.user.id)) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own files.' },
        { status: 403 }
      );
    }

    // Delete from Supabase storage
    const { error } = await supabase.storage
      .from('document-media')
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'File deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
