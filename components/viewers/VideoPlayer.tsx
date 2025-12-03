'use client';

import { useState, useRef, useEffect } from 'react';
import DRMProtection from '../security/DRMProtection';
import DevToolsDetector from '../security/DevToolsDetector';
import { VideoMetadata, WatermarkConfig } from '@/lib/types/content';

interface VideoPlayerProps {
  videoUrl: string;
  metadata: VideoMetadata;
  watermark?: WatermarkConfig;
  autoplay?: boolean;
  controls?: boolean;
  title?: string;
}

export default function VideoPlayer({
  videoUrl,
  metadata,
  watermark,
  autoplay = false,
  controls = true,
  title
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Format time for display (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle video load
  const handleVideoLoad = () => {
    setVideoLoaded(true);
    setLoading(false);
  };

  // Handle video error
  const handleVideoError = () => {
    setError('Failed to load video');
    setLoading(false);
  };

  // Play/Pause toggle
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Update current time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Seek to position
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(videoRef.current.volume);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const videoContainer = videoRef.current?.parentElement;
    if (!videoContainer) return;

    if (!isFullscreen) {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(metadata.duration, videoRef.current.currentTime + 5);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, metadata.duration]);

  return (
    <DRMProtection>
      <DevToolsDetector />
      <div className="bg-gray-100 dark:bg-slate-900 min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header with title */}
          {title && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>
          )}

          {/* Metadata Display */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-medium">Duration:</span>
                <span>{formatTime(metadata.duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Dimensions:</span>
                <span>{metadata.width} × {metadata.height} px</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Size:</span>
                <span>{formatFileSize(metadata.fileSize)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Type:</span>
                <span>{metadata.mimeType}</span>
              </div>
              {metadata.codec && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Codec:</span>
                  <span>{metadata.codec}</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Container */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8">
            {loading && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Loading video...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                    Error Loading Video
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">{error}</p>
                </div>
              </div>
            )}

            {!error && (
              <div className="relative">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    onLoadedData={handleVideoLoad}
                    onError={handleVideoError}
                    onTimeUpdate={handleTimeUpdate}
                    autoPlay={autoplay}
                    className={`w-full h-auto ${loading ? 'hidden' : 'block'}`}
                    style={{
                      maxHeight: '70vh',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      zIndex: 0,
                      position: 'relative',
                    }}
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    disablePictureInPicture
                  />

                  {/* Watermark Overlay */}
                  {watermark?.text && videoLoaded && (
                    <div 
                      className="absolute inset-0 pointer-events-none flex items-center justify-center"
                      style={{
                        zIndex: 1,
                      }}
                      aria-hidden="true"
                    >
                      <div 
                        className="text-white font-semibold select-none"
                        style={{
                          opacity: watermark.opacity || 0.3,
                          fontSize: `${watermark.fontSize || 16}px`,
                          transform: 'rotate(-45deg) translateZ(0)',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      >
                        {watermark.text}
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Controls */}
                {controls && videoLoaded && (
                  <div className="mt-4 space-y-3">
                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[45px]">
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={metadata.duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / metadata.duration) * 100}%, #e5e7eb ${(currentTime / metadata.duration) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[45px]">
                        {formatTime(metadata.duration)}
                      </span>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Play/Pause Button */}
                        <button
                          onClick={togglePlayPause}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                        >
                          {isPlaying ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>

                        {/* Volume Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={toggleMute}
                            className="px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                          >
                            {isMuted || volume === 0 ? (
                              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-24 h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Fullscreen Button */}
                      <button
                        onClick={toggleFullscreen}
                        className="px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                      >
                        {isFullscreen ? (
                          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Help */}
          {controls && (
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Keyboard shortcuts:{' '}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">Space</kbd> play/pause,{' '}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">F</kbd> fullscreen,{' '}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">M</kbd> mute,{' '}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">←</kbd>{' '}
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-slate-700 rounded">→</kbd> seek
              </p>
            </div>
          )}
        </div>
      </div>
    </DRMProtection>
  );
}
