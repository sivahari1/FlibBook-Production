# Requirements Document

## Introduction

This specification addresses critical issues with the document preview display where watermarks appear by default even when not selected, content is not visible, and the preview window displays in a small size instead of full-screen. The system should display content properly without watermarks unless explicitly enabled, and the preview should fill the entire browser tab.

## Glossary

- **Preview Display**: The actual rendered view of content (PDF, image, video, or link) in the browser
- **Watermark Default State**: The initial state of watermark settings when no explicit configuration is provided
- **Full-Size Display**: Content that fills the entire available viewport without unnecessary constraints
- **Content Visibility**: The ability to see the actual document/media content, not just overlays or watermarks
- **URL Parameters**: Query string parameters that pass preview settings from the settings page to the viewer

## Requirements

### Requirement 1

**User Story:** As a user, I want to see my content without a watermark by default, so that I can preview my documents cleanly unless I explicitly choose to add a watermark.

#### Acceptance Criteria

1. WHEN a user opens preview without configuring watermark settings THEN the system SHALL display content without any watermark
2. WHEN watermark URL parameter is missing THEN the system SHALL default to watermark disabled
3. WHEN watermark URL parameter is "false" THEN the system SHALL not display any watermark
4. WHEN watermark URL parameter is "true" THEN the system SHALL display the configured watermark
5. WHEN no watermark text is provided but watermark is enabled THEN the system SHALL use the user's email as default watermark text

### Requirement 2

**User Story:** As a user, I want to see the actual content of my document, so that I can verify what I'm sharing or reviewing.

#### Acceptance Criteria

1. WHEN preview loads THEN the system SHALL display the document content prominently
2. WHEN content is loading THEN the system SHALL show a clear loading indicator
3. WHEN content fails to load THEN the system SHALL display a specific error message
4. WHEN watermark is enabled THEN the system SHALL overlay it on the content without obscuring readability
5. WHEN content renders THEN the system SHALL ensure proper z-index layering so content is visible

### Requirement 3

**User Story:** As a user, I want the preview to display in full-size, so that I can see my content clearly and utilize my entire screen.

#### Acceptance Criteria

1. WHEN preview opens in a new tab THEN the system SHALL display content at full viewport size
2. WHEN the browser window is resized THEN the system SHALL adjust content to fill the available space
3. WHEN content is smaller than viewport THEN the system SHALL center it appropriately
4. WHEN content is larger than viewport THEN the system SHALL provide scrolling or zoom controls
5. WHEN viewing on different screen sizes THEN the system SHALL maintain responsive full-size display

### Requirement 4

**User Story:** As a user, I want consistent preview behavior across all content types, so that I have a predictable experience regardless of what I'm viewing.

#### Acceptance Criteria

1. WHEN previewing PDF documents THEN the system SHALL apply the same watermark rules as other content types
2. WHEN previewing images THEN the system SHALL display them at full resolution with optional watermark
3. WHEN previewing videos THEN the system SHALL show video player controls with optional watermark overlay
4. WHEN previewing links THEN the system SHALL display the link preview or embedded content appropriately
5. WHEN watermark settings are passed via URL THEN the system SHALL parse and apply them consistently across all content types

### Requirement 5

**User Story:** As a user, I want clear visual feedback about preview settings, so that I understand what configuration is being applied.

#### Acceptance Criteria

1. WHEN preview loads with watermark enabled THEN the system SHALL display the watermark as configured
2. WHEN preview loads without watermark THEN the system SHALL display clean content with no watermark artifacts
3. WHEN settings are invalid or missing THEN the system SHALL use safe defaults and log warnings
4. WHEN URL parameters are malformed THEN the system SHALL gracefully handle errors and display content
5. WHEN debugging preview issues THEN the system SHALL provide console logs for settings parsing
