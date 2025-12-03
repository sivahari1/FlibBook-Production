'use client';

import React from 'react';
import DRMProtection from '../security/DRMProtection';
import { FlipBookViewerWithDRM } from './FlipBookViewerWithDRM';
import { FlipBookViewerProps } from './FlipBookViewer';

interface FlipBookContainerWithDRMProps extends FlipBookViewerProps {
  enableScreenshotPrevention?: boolean;
  showWatermark?: boolean;
}

/**
 * FlipBookContainerWithDRM
 * 
 * A comprehensive DRM-protected flipbook viewer that combines:
 * - FlipBookViewer: Core flipbook functionality with page turning animations
 * - DRMProtection: Global DRM protections (right-click, keyboard shortcuts)
 * - Watermark: Visual watermark overlay on all pages
 * - Screenshot prevention: Basic detection and prevention
 * 
 * Requirements satisfied:
 * - 5.1: Watermark overlays on all page images
 * - 5.2: Disabled right-click context menus
 * - 5.3: Controlled text selection based on allowTextSelection prop
 * - 5.4: Blocked download/print keyboard shortcuts
 * - 5.5: Integrated screenshot prevention mechanisms
 */
export function FlipBookContainerWithDRM({
  enableScreenshotPrevention = true,
  showWatermark = false,
  watermarkText,
  userEmail,
  allowTextSelection = false,
  ...props
}: FlipBookContainerWithDRMProps) {
  // Only use watermark when explicitly enabled
  const effectiveWatermark = showWatermark && watermarkText ? watermarkText : undefined;

  return (
    <DRMProtection>
      <FlipBookViewerWithDRM
        {...props}
        watermarkText={effectiveWatermark}
        userEmail={userEmail}
        allowTextSelection={allowTextSelection}
        enableScreenshotPrevention={enableScreenshotPrevention}
      />
    </DRMProtection>
  );
}
