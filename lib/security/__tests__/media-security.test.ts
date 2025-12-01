/**
 * Media Security Tests
 * Tests security utilities for annotation media
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateMediaAccess,
  validateMediaFileType,
  validateMediaFileSize,
  generateSecureFilePath,
  MEDIA_SECURITY_CONFIG
} from '../media-security';

describe('Media Security Utilities', () => {
  describe('validateMediaAccess', () => {
    it('should allow access to own files', () => {
      const userId = 'user-123';
      const filePath = 'user-123/audio/file.mp3';
      
      expect(validateMediaAccess(userId, filePath)).toBe(true);
    });

    it('should deny access to other users files', () => {
      const userId = 'user-123';
      const filePath = 'user-456/audio/file.mp3';
      
      expect(validateMediaAccess(userId, filePath)).toBe(false);
    });

    it('should handle nested paths correctly', () => {
      const userId = 'user-123';
      const filePath = 'user-123/video/subfolder/file.mp4';
      
      expect(validateMediaAccess(userId, filePath)).toBe(true);
    });
  });

  describe('validateMediaFileType', () => {
    it('should accept valid audio types', () => {
      expect(validateMediaFileType('audio/mpeg', 'AUDIO')).toBe(true);
      expect(validateMediaFileType('audio/wav', 'AUDIO')).toBe(true);
      expect(validateMediaFileType('audio/mp3', 'AUDIO')).toBe(true);
      expect(validateMediaFileType('audio/m4a', 'AUDIO')).toBe(true);
    });

    it('should accept valid video types', () => {
      expect(validateMediaFileType('video/mp4', 'VIDEO')).toBe(true);
      expect(validateMediaFileType('video/webm', 'VIDEO')).toBe(true);
      expect(validateMediaFileType('video/mov', 'VIDEO')).toBe(true);
    });

    it('should reject invalid audio types', () => {
      expect(validateMediaFileType('video/mp4', 'AUDIO')).toBe(false);
      expect(validateMediaFileType('image/jpeg', 'AUDIO')).toBe(false);
      expect(validateMediaFileType('application/pdf', 'AUDIO')).toBe(false);
    });

    it('should reject invalid video types', () => {
      expect(validateMediaFileType('audio/mp3', 'VIDEO')).toBe(false);
      expect(validateMediaFileType('image/png', 'VIDEO')).toBe(false);
      expect(validateMediaFileType('text/plain', 'VIDEO')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(validateMediaFileType('AUDIO/MPEG', 'AUDIO')).toBe(true);
      expect(validateMediaFileType('VIDEO/MP4', 'VIDEO')).toBe(true);
    });
  });

  describe('validateMediaFileSize', () => {
    it('should accept files within size limit', () => {
      const oneMB = 1024 * 1024;
      expect(validateMediaFileSize(oneMB)).toBe(true);
      expect(validateMediaFileSize(50 * oneMB)).toBe(true);
      expect(validateMediaFileSize(100 * oneMB)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const oneMB = 1024 * 1024;
      expect(validateMediaFileSize(101 * oneMB)).toBe(false);
      expect(validateMediaFileSize(200 * oneMB)).toBe(false);
    });

    it('should reject zero-size files', () => {
      expect(validateMediaFileSize(0)).toBe(false);
    });

    it('should reject negative sizes', () => {
      expect(validateMediaFileSize(-1)).toBe(false);
    });

    it('should respect custom max size', () => {
      const customMax = 50 * 1024 * 1024; // 50MB
      expect(validateMediaFileSize(40 * 1024 * 1024, customMax)).toBe(true);
      expect(validateMediaFileSize(60 * 1024 * 1024, customMax)).toBe(false);
    });
  });

  describe('generateSecureFilePath', () => {
    it('should generate path with correct structure', () => {
      const userId = 'user-123';
      const mediaType = 'AUDIO';
      const fileName = 'test.mp3';
      
      const path = generateSecureFilePath(userId, mediaType, fileName);
      
      expect(path).toMatch(/^user-123\/audio\/\d+-test\.mp3$/);
    });

    it('should sanitize dangerous filenames', () => {
      const userId = 'user-123';
      const mediaType = 'VIDEO';
      const fileName = '../../../etc/passwd';
      
      const path = generateSecureFilePath(userId, mediaType, fileName);
      
      expect(path).not.toContain('../');
      // Should replace slashes with underscores, dots are kept
      expect(path).toMatch(/^user-123\/video\/\d+-\.\._\.\._\.\._etc_passwd$/);
    });

    it('should handle special characters', () => {
      const userId = 'user-123';
      const mediaType = 'AUDIO';
      const fileName = 'my file (1) [test].mp3';
      
      const path = generateSecureFilePath(userId, mediaType, fileName);
      
      expect(path).toMatch(/^user-123\/audio\/\d+-my_file__1___test_\.mp3$/);
    });

    it('should preserve file extension', () => {
      const userId = 'user-123';
      const mediaType = 'VIDEO';
      const fileName = 'video.mp4';
      
      const path = generateSecureFilePath(userId, mediaType, fileName);
      
      expect(path).toMatch(/\.mp4$/);
    });

    it('should use lowercase media type in path', () => {
      const userId = 'user-123';
      const fileName = 'test.mp3';
      
      const audioPath = generateSecureFilePath(userId, 'AUDIO', fileName);
      const videoPath = generateSecureFilePath(userId, 'VIDEO', fileName);
      
      expect(audioPath).toContain('/audio/');
      expect(videoPath).toContain('/video/');
    });
  });

  describe('MEDIA_SECURITY_CONFIG', () => {
    it('should have correct max file size', () => {
      expect(MEDIA_SECURITY_CONFIG.MAX_FILE_SIZE).toBe(100 * 1024 * 1024);
    });

    it('should have correct URL expiration times', () => {
      expect(MEDIA_SECURITY_CONFIG.DEFAULT_URL_EXPIRATION).toBe(3600);
      expect(MEDIA_SECURITY_CONFIG.LONG_TERM_URL_EXPIRATION).toBe(365 * 24 * 60 * 60);
    });

    it('should have correct storage bucket name', () => {
      expect(MEDIA_SECURITY_CONFIG.STORAGE_BUCKET).toBe('document-media');
    });

    it('should have all DRM features enabled', () => {
      const drm = MEDIA_SECURITY_CONFIG.DRM_FEATURES;
      expect(drm.preventContextMenu).toBe(true);
      expect(drm.disableDownload).toBe(true);
      expect(drm.disablePictureInPicture).toBe(true);
      expect(drm.applyWatermark).toBe(true);
      expect(drm.preventTextSelection).toBe(true);
    });

    it('should have comprehensive audio type list', () => {
      const audioTypes = MEDIA_SECURITY_CONFIG.ALLOWED_AUDIO_TYPES;
      expect(audioTypes).toContain('audio/mpeg');
      expect(audioTypes).toContain('audio/wav');
      expect(audioTypes).toContain('audio/mp3');
      expect(audioTypes).toContain('audio/m4a');
    });

    it('should have comprehensive video type list', () => {
      const videoTypes = MEDIA_SECURITY_CONFIG.ALLOWED_VIDEO_TYPES;
      expect(videoTypes).toContain('video/mp4');
      expect(videoTypes).toContain('video/webm');
      expect(videoTypes).toContain('video/mov');
    });
  });

  describe('applyDRMProtection', () => {
    it('should set controlsList attribute', async () => {
      const audio = document.createElement('audio');
      const { applyDRMProtection } = await import('../media-security');
      
      applyDRMProtection(audio);
      
      expect(audio.getAttribute('controlsList')).toBe('nodownload');
    });

    it('should disable picture-in-picture for video', async () => {
      const video = document.createElement('video');
      const { applyDRMProtection } = await import('../media-security');
      
      applyDRMProtection(video);
      
      expect(video.disablePictureInPicture).toBe(true);
    });
  });

  describe('ENCRYPTION_INFO', () => {
    it('should document encryption at rest', async () => {
      const { ENCRYPTION_INFO } = await import('../media-security');
      expect(ENCRYPTION_INFO.atRest).toContain('AES-256');
    });

    it('should document encryption in transit', async () => {
      const { ENCRYPTION_INFO } = await import('../media-security');
      expect(ENCRYPTION_INFO.inTransit).toContain('TLS');
    });

    it('should document access control', async () => {
      const { ENCRYPTION_INFO } = await import('../media-security');
      expect(ENCRYPTION_INFO.accessControl).toContain('Signed URLs');
    });

    it('should document RLS', async () => {
      const { ENCRYPTION_INFO } = await import('../media-security');
      expect(ENCRYPTION_INFO.rls).toContain('Row Level Security');
    });
  });
});

describe('Media Security - Edge Cases', () => {
  it('should handle empty user ID', () => {
    expect(validateMediaAccess('', 'user-123/audio/file.mp3')).toBe(false);
  });

  it('should handle empty file path', () => {
    expect(validateMediaAccess('user-123', '')).toBe(false);
  });

  it('should handle malformed file paths', () => {
    expect(validateMediaAccess('user-123', 'invalid')).toBe(false);
    expect(validateMediaAccess('user-123', '//')).toBe(false);
  });

  it('should handle very large file sizes', () => {
    const veryLarge = Number.MAX_SAFE_INTEGER;
    expect(validateMediaFileSize(veryLarge)).toBe(false);
  });

  it('should handle empty file type', () => {
    expect(validateMediaFileType('', 'AUDIO')).toBe(false);
    expect(validateMediaFileType('', 'VIDEO')).toBe(false);
  });
});

