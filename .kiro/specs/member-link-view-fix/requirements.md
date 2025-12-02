# Requirements Document

## Introduction

This feature addresses a user experience issue in the Member Dashboard where clicking the "View" button for link-type content items redirects users to an intermediate preview page instead of directly opening the external link. This creates unnecessary friction and confusion for members trying to access link content they've added to their study room.

## Glossary

- **Member Dashboard**: The authenticated member area where users can view and manage their study room collection
- **My jstudyroom**: The member's personal collection of documents and links
- **Link Content**: Content items of type "LINK" that reference external URLs
- **View Button**: The action button that allows members to access/view their content
- **Content Type**: The classification of content (PDF, IMAGE, VIDEO, LINK)

## Requirements

### Requirement 1

**User Story:** As a member, I want to click the "View" button on a link item and be taken directly to the external URL, so that I can access the content without unnecessary intermediate steps.

#### Acceptance Criteria

1. WHEN a member clicks the "View" button for a link-type content item THEN the system SHALL open the external URL in a new browser tab
2. WHEN a member clicks the "View" button for a link-type content item THEN the system SHALL preserve the current page state without navigation
3. WHEN a member clicks the "View" button for a link-type content item THEN the system SHALL include appropriate security attributes (noopener, noreferrer) in the new tab
4. WHEN a link item has no valid linkUrl THEN the system SHALL display an error message and prevent the view action
5. WHEN a link opens in a new tab THEN the system SHALL maintain the member's session on the original page

### Requirement 2

**User Story:** As a member, I want non-link content (PDFs, images, videos) to continue opening in the viewer page, so that I can view them with appropriate DRM protection and watermarking.

#### Acceptance Criteria

1. WHEN a member clicks the "View" button for a PDF content item THEN the system SHALL navigate to the viewer page at /member/view/[itemId]
2. WHEN a member clicks the "View" button for an IMAGE content item THEN the system SHALL navigate to the viewer page at /member/view/[itemId]
3. WHEN a member clicks the "View" button for a VIDEO content item THEN the system SHALL navigate to the viewer page at /member/view/[itemId]
4. WHEN viewing non-link content THEN the system SHALL apply appropriate watermarking and DRM protection
5. WHEN viewing non-link content THEN the system SHALL display the content within the jstudyroom viewer interface

### Requirement 3

**User Story:** As a member, I want clear visual feedback when interacting with link items, so that I understand the action that will occur when I click "View".

#### Acceptance Criteria

1. WHEN a member hovers over the "View" button for a link item THEN the system SHALL display a tooltip indicating "Open link in new tab"
2. WHEN a member hovers over the "View" button for non-link items THEN the system SHALL display a tooltip indicating "View content"
3. WHEN displaying link items in the list THEN the system SHALL show a visual indicator (icon) that distinguishes links from other content types
4. WHEN a link item is displayed THEN the system SHALL show the link icon badge consistently with other content type badges
5. WHEN the "View" button is clicked THEN the system SHALL provide immediate visual feedback (e.g., button state change)

### Requirement 4

**User Story:** As a developer, I want the view action logic to be maintainable and type-safe, so that future content types can be easily integrated.

#### Acceptance Criteria

1. WHEN implementing the view action THEN the system SHALL use TypeScript type guards to determine content type
2. WHEN implementing the view action THEN the system SHALL centralize the routing logic in a single function
3. WHEN a new content type is added THEN the system SHALL require explicit handling in the view action logic
4. WHEN the view action encounters an unknown content type THEN the system SHALL log an error and display a user-friendly message
5. WHEN the view action is invoked THEN the system SHALL validate that required data (linkUrl for links, id for others) is present
