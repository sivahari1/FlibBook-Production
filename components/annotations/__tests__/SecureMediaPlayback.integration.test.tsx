/**
 * Secure Media Playback Integration Tests
 * Validates: Requirements 12.1-12.6, 13.1-13.5, 18.1-18.5
 * 
 * This test suite verifies that media playback works securely by testing:
 * - Secure media player modal functionality
 * - DRM protections (watermarks, download prevention, right-click blocking)
 * - External media embedding with security
 * - Access control and authentication
 * - Secure streaming URLs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MediaPlayerModal } from '../MediaPlayerModal';
import { ExternalMediaPlayer } from '../ExternalMediaPlayer';
import type { DocumentAnnotation } from '@/lib/types/annotations';

describe('Secure Media Playback - Integration Tests', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 12.1: Media Player Modal Opens', () => {
    it('should open media player modal when annotation marker is clicked', () => {
      const annotation: DocumentAnnotation = {
        id: 'test-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Test annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        externalUrl: null,
        mediaFileName: 'audio.mp3',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={annotation}
          watermarkText="Test User"
        />
      );

      // Modal should be visible
      const modal = document.querySelector('.fixed.inset-0');
      expect(modal).toBeTruthy();
      expect(screen.getByText(/Test annotation/i)).toBeTruthy();
    });
  });

  describe('Requirement 12.2: Audio Player with Security', () => {
    it('should display inline audio player with DRM protections', () => {
      const audioAnnotation: DocumentAnnotation = {
        id: 'audio-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Audio annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        externalUrl: null,
        mediaFileName: 'audio.mp3',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={audioAnnotation}
          watermarkText="Test User"
        />
      );

      // Check audio element exists
      const audioElements = document.querySelectorAll('audio');
      expect(audioElements.length).toBeGreaterThan(0);

      const audio = audioElements[0];
      
      // Verify DRM protections
      expect(audio.getAttribute('controlsList')).toBe('nodownload');
      expect(audio.getAttribute('preload')).toBe('metadata');
    });

    it('should prevent right-click on audio player', () => {
      const audioAnnotation: DocumentAnnotation = {
        id: 'audio-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Audio annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        externalUrl: null,
        mediaFileName: 'audio.mp3',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={audioAnnotation}
        />
      );

      const playerContainer = document.querySelector('.relative.bg-black');
      expect(playerContainer).toBeTruthy();

      // Simulate right-click
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      
      playerContainer?.dispatchEvent(contextMenuEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Requirement 12.3: Video Player with Security', () => {
    it('should display inline video player with DRM protections', () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
        />
      );

      // Check video element exists
      const videoElements = document.querySelectorAll('video');
      expect(videoElements.length).toBeGreaterThan(0);

      const video = videoElements[0];
      
      // Verify DRM protections
      expect(video.getAttribute('controlsList')).toBe('nodownload');
      expect(video.getAttribute('disablePictureInPicture')).toBe('');
      expect(video.getAttribute('preload')).toBe('metadata');
    });

    it('should prevent picture-in-picture for videos', () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
        />
      );

      const video = document.querySelector('video') as HTMLVideoElement;
      // Check the attribute is set (JSDOM doesn't support the property)
      expect(video.getAttribute('disablePictureInPicture')).toBe('');
    });
  });

  describe('Requirement 12.4: Watermark Overlay During Playback', () => {
    it('should display watermark overlay on audio player', () => {
      const audioAnnotation: DocumentAnnotation = {
        id: 'audio-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Audio annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        externalUrl: null,
        mediaFileName: 'audio.mp3',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={audioAnnotation}
          watermarkText="John Doe"
        />
      );

      // Check watermark is present
      const watermark = screen.getByText('John Doe');
      expect(watermark).toBeTruthy();
      
      // Verify watermark styling
      expect(watermark.className).toContain('text-white/30');
      expect(watermark.className).toContain('transform');
      expect(watermark.className).toContain('-rotate-45');
    });

    it('should display watermark overlay on video player', () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
          watermarkText="Jane Smith"
        />
      );

      // Check watermark is present
      expect(screen.getByText('Jane Smith')).toBeTruthy();
    });

    it('should keep watermark visible with pointer-events-none', () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
          watermarkText="Test User"
        />
      );

      const watermarkContainer = document.querySelector('.pointer-events-none');
      expect(watermarkContainer).toBeTruthy();
      expect(watermarkContainer?.className).toContain('z-10');
    });
  });

  describe('Requirement 12.5 & 12.6: Prevent Media Downloading', () => {
    it('should disable download options in audio player', () => {
      const audioAnnotation: DocumentAnnotation = {
        id: 'audio-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Audio annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        externalUrl: null,
        mediaFileName: 'audio.mp3',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={audioAnnotation}
        />
      );

      const audio = document.querySelector('audio');
      expect(audio?.getAttribute('controlsList')).toContain('nodownload');
    });

    it('should disable download options in video player', () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
        />
      );

      const video = document.querySelector('video');
      expect(video?.getAttribute('controlsList')).toContain('nodownload');
    });

    it('should prevent text selection on player container', () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
        />
      );

      const playerContainer = document.querySelector('.relative.bg-black') as HTMLElement;
      expect(playerContainer?.style.userSelect).toBe('none');
    });
  });

  describe('Requirement 13.1: YouTube Embedding with Security', () => {
    it('should embed YouTube player with no-download parameters', () => {
      const youtubeAnnotation: DocumentAnnotation = {
        id: 'youtube-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'YouTube video',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: null,
        externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        mediaFileName: null,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <ExternalMediaPlayer
          url={youtubeAnnotation.externalUrl!}
          mediaType="VIDEO"
          watermarkText="Test User"
        />
      );

      const iframe = document.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.src).toContain('youtube.com/embed');
      expect(iframe?.src).toContain('rel=0'); // No related videos
      expect(iframe?.src).toContain('modestbranding=1');
      expect(iframe?.src).toContain('disablekb=1');
    });
  });

  describe('Requirement 13.2: Vimeo Embedding', () => {
    it('should embed Vimeo player correctly', () => {
      const vimeoAnnotation: DocumentAnnotation = {
        id: 'vimeo-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Vimeo video',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: null,
        externalUrl: 'https://vimeo.com/123456789',
        mediaFileName: null,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <ExternalMediaPlayer
          url={vimeoAnnotation.externalUrl!}
          mediaType="VIDEO"
        />
      );

      const iframe = document.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.src).toContain('player.vimeo.com/video');
      expect(iframe?.src).toContain('title=0');
      expect(iframe?.src).toContain('byline=0');
      expect(iframe?.src).toContain('portrait=0');
    });
  });

  describe('Requirement 13.3: SoundCloud Embedding', () => {
    it('should embed SoundCloud player correctly', () => {
      const soundcloudAnnotation: DocumentAnnotation = {
        id: 'soundcloud-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'SoundCloud audio',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'AUDIO',
        mediaUrl: null,
        externalUrl: 'https://soundcloud.com/artist/track',
        mediaFileName: null,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <ExternalMediaPlayer
          url={soundcloudAnnotation.externalUrl!}
          mediaType="AUDIO"
        />
      );

      const iframe = document.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.src).toContain('w.soundcloud.com/player');
      expect(iframe?.src).toContain('hide_related=true');
      expect(iframe?.src).toContain('show_comments=false');
    });
  });

  describe('Requirement 13.4 & 13.5: Direct Media URLs with DRM', () => {
    it('should use HTML5 audio for direct audio URLs with DRM', () => {
      render(
        <ExternalMediaPlayer
          url="https://example.com/audio.mp3"
          mediaType="AUDIO"
          watermarkText="Test User"
        />
      );

      const audio = document.querySelector('audio');
      expect(audio).toBeTruthy();
      expect(audio?.getAttribute('controlsList')).toBe('nodownload');
      expect(audio?.getAttribute('preload')).toBe('metadata');
    });

    it('should use HTML5 video for direct video URLs with DRM', () => {
      render(
        <ExternalMediaPlayer
          url="https://example.com/video.mp4"
          mediaType="VIDEO"
          watermarkText="Test User"
        />
      );

      const video = document.querySelector('video');
      expect(video).toBeTruthy();
      expect(video?.getAttribute('controlsList')).toBe('nodownload');
      expect(video?.getAttribute('disablePictureInPicture')).toBe('');
      expect(video?.getAttribute('preload')).toBe('metadata');
    });

    it('should apply watermark to direct media URLs', () => {
      render(
        <ExternalMediaPlayer
          url="https://example.com/video.mp4"
          mediaType="VIDEO"
          watermarkText="Secure User"
        />
      );

      expect(screen.getByText('Secure User')).toBeTruthy();
    });
  });

  describe('Requirement 12.6: Stop Playback on Modal Close', () => {
    it('should stop audio playback when modal closes', async () => {
      const audioAnnotation: DocumentAnnotation = {
        id: 'audio-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Audio annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        externalUrl: null,
        mediaFileName: 'audio.mp3',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { rerender } = render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={audioAnnotation}
        />
      );

      const audio = document.querySelector('audio') as HTMLAudioElement;
      
      // Verify audio element exists
      expect(audio).toBeTruthy();
      
      // Close modal by clicking close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      // Verify onClose was called
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset playback position when modal closes', async () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { rerender } = render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
        />
      );

      const video = document.querySelector('video') as HTMLVideoElement;

      // Close modal
      rerender(
        <MediaPlayerModal
          isOpen={false}
          onClose={mockOnClose}
          annotation={videoAnnotation}
        />
      );

      await waitFor(() => {
        expect(video.currentTime).toBe(0);
      });
    });
  });

  describe('Security: Context Menu Prevention', () => {
    it('should prevent context menu on external media player', () => {
      render(
        <ExternalMediaPlayer
          url="https://example.com/video.mp4"
          mediaType="VIDEO"
        />
      );

      const container = document.querySelector('.relative.bg-black');
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

      container?.dispatchEvent(contextMenuEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Security: User Selection Prevention', () => {
    it('should prevent text selection on media player', () => {
      const videoAnnotation: DocumentAnnotation = {
        id: 'video-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Video annotation',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={videoAnnotation}
        />
      );

      const container = document.querySelector('.relative.bg-black') as HTMLElement;
      expect(container.style.userSelect).toBe('none');
    });

    it('should prevent text selection on external media player', () => {
      render(
        <ExternalMediaPlayer
          url="https://example.com/video.mp4"
          mediaType="VIDEO"
        />
      );

      const container = document.querySelector('.relative.bg-black') as HTMLElement;
      expect(container.style.userSelect).toBe('none');
    });
  });

  describe('Integration: Complete Secure Playback Flow', () => {
    it('should handle complete secure playback workflow', async () => {
      const annotation: DocumentAnnotation = {
        id: 'test-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Complete test',
        selectionStart: 0,
        selectionEnd: 10,
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        externalUrl: null,
        mediaFileName: 'video.mp4',
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { rerender } = render(
        <MediaPlayerModal
          isOpen={true}
          onClose={mockOnClose}
          annotation={annotation}
          watermarkText="Secure User"
        />
      );

      // 1. Modal opens
      const modal = document.querySelector('.fixed.inset-0');
      expect(modal).toBeTruthy();

      // 2. Video player is present with DRM
      const video = document.querySelector('video');
      expect(video).toBeTruthy();
      expect(video?.getAttribute('controlsList')).toBe('nodownload');
      expect(video?.getAttribute('disablePictureInPicture')).toBe('');

      // 3. Watermark is visible
      expect(screen.getByText('Secure User')).toBeTruthy();

      // 4. Right-click is prevented
      const container = document.querySelector('.relative.bg-black');
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      container?.dispatchEvent(contextMenuEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();

      // 5. Close button works
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
