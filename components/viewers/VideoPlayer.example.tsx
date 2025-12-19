/**
 * VideoPlayer Component Examples
 * 
 * This file demonstrates various usage patterns for the VideoPlayer component.
 */

import VideoPlayer from './VideoPlayer';
import { VideoMetadata, WatermarkConfig } from '@/lib/types/content';

// Example 1: Basic video player
export function BasicVideoPlayer() {
  const metadata: VideoMetadata = {
    duration: 120,
    width: 1920,
    height: 1080,
    fileSize: 52428800,
    mimeType: 'video/mp4'
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/sample-video.mp4"
      metadata={metadata}
      title="Introduction to jStudyRoom"
    />
  );
}

// Example 2: Video player with watermark
export function VideoPlayerWithWatermark() {
  const metadata: VideoMetadata = {
    duration: 300,
    width: 1280,
    height: 720,
    fileSize: 104857600,
    mimeType: 'video/mp4',
    codec: 'H.264'
  };

  const watermark: WatermarkConfig = {
    text: 'student@university.edu',
    opacity: 0.3,
    fontSize: 16
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/lecture-video.mp4"
      metadata={metadata}
      watermark={watermark}
      title="Computer Science Lecture 1"
    />
  );
}

// Example 3: Autoplay video (use with caution)
export function AutoplayVideoPlayer() {
  const metadata: VideoMetadata = {
    duration: 30,
    width: 1920,
    height: 1080,
    fileSize: 10485760,
    mimeType: 'video/mp4'
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/intro-video.mp4"
      metadata={metadata}
      autoplay={true}
      title="Welcome Video"
    />
  );
}

// Example 4: Video with detailed metadata
export function DetailedVideoPlayer() {
  const metadata: VideoMetadata = {
    duration: 3600, // 1 hour
    width: 3840,
    height: 2160,
    fileSize: 2147483648, // 2GB
    mimeType: 'video/mp4',
    bitrate: 8000,
    codec: 'H.265'
  };

  const watermark: WatermarkConfig = {
    text: 'Premium Member - john.doe@example.com',
    opacity: 0.25,
    fontSize: 14
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/4k-tutorial.mp4"
      metadata={metadata}
      watermark={watermark}
      title="Advanced Programming Tutorial (4K)"
    />
  );
}

// Example 5: WebM format video
export function WebMVideoPlayer() {
  const metadata: VideoMetadata = {
    duration: 180,
    width: 1920,
    height: 1080,
    fileSize: 41943040,
    mimeType: 'video/webm',
    codec: 'VP9'
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/sample-video.webm"
      metadata={metadata}
      title="Web Development Tutorial"
    />
  );
}

// Example 6: MOV format video
export function MOVVideoPlayer() {
  const metadata: VideoMetadata = {
    duration: 240,
    width: 1280,
    height: 720,
    fileSize: 83886080,
    mimeType: 'video/quicktime',
    codec: 'H.264'
  };

  const watermark: WatermarkConfig = {
    text: 'Confidential - Internal Use Only',
    opacity: 0.4,
    fontSize: 18
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/presentation.mov"
      metadata={metadata}
      watermark={watermark}
      title="Company Presentation"
    />
  );
}

// Example 7: Short video clip
export function ShortVideoPlayer() {
  const metadata: VideoMetadata = {
    duration: 15,
    width: 720,
    height: 1280,
    fileSize: 5242880,
    mimeType: 'video/mp4'
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/short-clip.mp4"
      metadata={metadata}
      title="Quick Demo"
    />
  );
}

// Example 8: Video without custom controls (native controls)
export function NativeControlsVideoPlayer() {
  const metadata: VideoMetadata = {
    duration: 90,
    width: 1920,
    height: 1080,
    fileSize: 31457280,
    mimeType: 'video/mp4'
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/sample.mp4"
      metadata={metadata}
      controls={false}
      title="Video with Native Controls"
    />
  );
}

// Example 9: Usage in a BookShop item viewer
export function BookShopVideoViewer() {
  const metadata: VideoMetadata = {
    duration: 600, // 10 minutes
    width: 1920,
    height: 1080,
    fileSize: 209715200, // 200MB
    mimeType: 'video/mp4',
    codec: 'H.264',
    bitrate: 2800
  };

  const watermark: WatermarkConfig = {
    text: 'Purchased by: member@example.com',
    opacity: 0.3,
    fontSize: 14
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <VideoPlayer
        videoUrl="https://example.com/course-video.mp4"
        metadata={metadata}
        watermark={watermark}
        title="Introduction to React - Chapter 1"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            About this video
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This is the first chapter of our comprehensive React course. 
            Learn the fundamentals of React and start building modern web applications.
          </p>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Duration: 10 minutes</span>
            <span>•</span>
            <span>Quality: 1080p</span>
            <span>•</span>
            <span>Format: MP4</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Example 10: Usage in shared content viewer
export function SharedVideoViewer() {
  const metadata: VideoMetadata = {
    duration: 450,
    width: 1920,
    height: 1080,
    fileSize: 157286400,
    mimeType: 'video/mp4'
  };

  const watermark: WatermarkConfig = {
    text: 'Shared with: recipient@example.com',
    opacity: 0.35,
    fontSize: 15
  };

  return (
    <VideoPlayer
      videoUrl="https://example.com/shared-video.mp4"
      metadata={metadata}
      watermark={watermark}
      title="Shared: Project Presentation"
    />
  );
}

// Add display names to all example components
BasicVideoPlayer.displayName = 'BasicVideoPlayer';
VideoPlayerWithWatermark.displayName = 'VideoPlayerWithWatermark';
AutoplayVideoPlayer.displayName = 'AutoplayVideoPlayer';
DetailedVideoPlayer.displayName = 'DetailedVideoPlayer';
WebMVideoPlayer.displayName = 'WebMVideoPlayer';
MOVVideoPlayer.displayName = 'MOVVideoPlayer';
ShortVideoPlayer.displayName = 'ShortVideoPlayer';
NativeControlsVideoPlayer.displayName = 'NativeControlsVideoPlayer';
BookShopVideoViewer.displayName = 'BookShopVideoViewer';
SharedVideoViewer.displayName = 'SharedVideoViewer';
