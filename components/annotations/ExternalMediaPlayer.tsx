/**
 * External Media Player Component
 * Handles embedding of YouTube, Vimeo, SoundCloud, and direct URLs
 */
'use client';

import React from 'react';

interface ExternalMediaPlayerProps {
  url: string;
  mediaType: 'AUDIO' | 'VIDEO';
  watermarkText?: string;
}

export function ExternalMediaPlayer({
  url,
  mediaType,
  watermarkText = ''
}: ExternalMediaPlayerProps) {
  const detectPlatform = (url: string): 'youtube' | 'vimeo' | 'soundcloud' | 'direct' => {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/vimeo\.com/i.test(url)) return 'vimeo';
    if (/soundcloud\.com/i.test(url)) return 'soundcloud';
    return 'direct';
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (!videoIdMatch) return '';
    const videoId = videoIdMatch[1];
    // Disable download and related videos
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&disablekb=1`;
  };

  const getVimeoEmbedUrl = (url: string): string => {
    const videoIdMatch = url.match(/vimeo\.com\/(\d+)/);
    if (!videoIdMatch) return '';
    const videoId = videoIdMatch[1];
    return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
  };

  const getSoundCloudEmbedUrl = (url: string): string => {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  };

  const platform = detectPlatform(url);

  const renderPlayer = () => {
    switch (platform) {
      case 'youtube':
        return (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={getYouTubeEmbedUrl(url)}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ pointerEvents: 'auto' }}
            />
          </div>
        );

      case 'vimeo':
        return (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={getVimeoEmbedUrl(url)}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{ pointerEvents: 'auto' }}
            />
          </div>
        );

      case 'soundcloud':
        return (
          <div className="w-full">
            <iframe
              width="100%"
              height="166"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={getSoundCloudEmbedUrl(url)}
            />
          </div>
        );

      case 'direct':
        if (mediaType === 'AUDIO') {
          return (
            <audio
              src={url}
              controls
              controlsList="nodownload"
              className="w-full"
              preload="metadata"
            />
          );
        } else {
          return (
            <video
              src={url}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              className="w-full"
              style={{ maxHeight: '400px' }}
              preload="metadata"
            />
          );
        }

      default:
        return (
          <div className="p-4 text-center text-gray-500">
            Unsupported media URL
          </div>
        );
    }
  };

  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {/* Watermark Overlay - Always visible for all platforms */}
      {watermarkText && (
        <div 
          className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
          aria-hidden="true"
          style={{
            // Ensure watermark is always visible
            display: 'flex !important' as any,
            visibility: 'visible !important' as any,
            opacity: '1 !important' as any,
            zIndex: 10,
            transform: 'translateZ(0)',
            willChange: 'opacity',
          }}
        >
          <div
            className="text-white text-2xl font-bold transform -rotate-45"
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              userSelect: 'none',
              // Ensure text watermark is always visible
              opacity: 0.3,
              display: 'block !important' as any,
              visibility: 'visible !important' as any,
              transform: 'rotate(-45deg) translateZ(0)',
            }}
          >
            {watermarkText}
          </div>
        </div>
      )}

      {/* Media Player */}
      {renderPlayer()}

      {/* Platform Badge */}
      {platform !== 'direct' && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-20">
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </div>
      )}
    </div>
  );
}
