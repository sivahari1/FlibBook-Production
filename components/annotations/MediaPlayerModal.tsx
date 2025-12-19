/**
 * Media Player Modal Component
 * Displays audio/video annotations with DRM protection
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ExternalMediaPlayer } from '@/components/annotations/ExternalMediaPlayer';
import type { DocumentAnnotation } from '@/lib/types/annotations';

interface MediaPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  annotation: DocumentAnnotation;
  watermarkText?: string;
}

export function MediaPlayerModal({
  isOpen,
  onClose,
  annotation,
  watermarkText = ''
}: MediaPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isAudio = annotation.mediaType === 'AUDIO';
  const isVideo = annotation.mediaType === 'VIDEO';
  const mediaRef = isAudio ? audioRef : videoRef;

  // Prevent context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (!mediaRef.current) return;

    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play();
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (!mediaRef.current) return;
    setCurrentTime(mediaRef.current.currentTime);
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (!mediaRef.current) return;
    setDuration(mediaRef.current.duration);
  };

  // Handle play event
  const handlePlay = () => {
    setIsPlaying(true);
  };

  // Handle pause event
  const handlePause = () => {
    setIsPlaying(false);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    if (!mediaRef.current) return;
    mediaRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Handle mute toggle
  const toggleMute = () => {
    if (!mediaRef.current) return;
    const newMuted = !isMuted;
    mediaRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Handle seek
  const handleSeek = (newTime: number) => {
    if (!mediaRef.current) return;
    mediaRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle error
  const handleError = () => {
    setError('Failed to load media. Please try again.');
    setIsPlaying(false);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRef.current) {
        mediaRef.current.pause();
        mediaRef.current.src = '';
      }
    };
    // Empty dependency array is correct here - cleanup only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setError(null);
      if (mediaRef.current) {
        mediaRef.current.pause();
        mediaRef.current.currentTime = 0;
      }
    }
    // mediaRef is a ref and doesn't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const getMediaUrl = () => {
    if (annotation.externalUrl) {
      return annotation.externalUrl;
    }
    return annotation.mediaUrl || '';
  };

  const isExternalUrl = !!annotation.externalUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isAudio ? '🎵 Audio' : '🎬 Video'} Annotation`}
    >
      <div className="space-y-4">
        {/* Selected Text Display */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Annotated text:</p>
          <p className="text-sm font-medium">&quot;{annotation.selectedText}&quot;</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* External Media Player */}
        {isExternalUrl ? (
          <ExternalMediaPlayer
            url={getMediaUrl()}
            mediaType={annotation.mediaType}
            watermarkText={watermarkText}
          />
        ) : (
          <>
            {/* Media Player Container */}
            <div
              className="relative bg-black rounded-lg overflow-hidden"
              onContextMenu={handleContextMenu}
              style={{ userSelect: 'none' }}
            >
              {/* Watermark Overlay - Always visible for DRM protection */}
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

              {/* Audio Player */}
              {isAudio && (
                <div className="p-8">
                  <audio
                    ref={audioRef}
                    src={getMediaUrl()}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onError={handleError}
                    controlsList="nodownload"
                    preload="metadata"
                  />
                  <div className="flex items-center justify-center mb-4">
                    <div className="text-6xl">🎵</div>
                  </div>
                </div>
              )}

              {/* Video Player */}
              {isVideo && (
                <video
                  ref={videoRef}
                  src={getMediaUrl()}
                  className="w-full"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onError={handleError}
                  controlsList="nodownload"
                  disablePictureInPicture
                  preload="metadata"
                  style={{ maxHeight: '400px' }}
                />
              )}
            </div>

            {/* Custom Controls */}
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <Button
                    onClick={togglePlayPause}
                    variant="default"
                    size="sm"
                    className="w-20"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </Button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      size="sm"
                      className="w-10"
                    >
                      {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Close Button for External Media */}
        {isExternalUrl && (
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Close
            </Button>
          </div>
        )}

        {/* Annotation Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>Page {annotation.pageNumber}</p>
          <p>Created: {new Date(annotation.createdAt).toLocaleDateString()}</p>
          {annotation.visibility === 'private' && (
            <p className="text-yellow-600 dark:text-yellow-400">🔒 Private annotation</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
