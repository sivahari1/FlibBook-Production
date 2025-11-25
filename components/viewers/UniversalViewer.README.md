# UniversalViewer Component

## Overview

The `UniversalViewer` component is a routing component that automatically selects and renders the appropriate viewer based on the content type. It supports PDF, Image, Video, and Link content types.

## Features

- **Automatic Content Type Detection**: Routes to the correct viewer based on `content.contentType`
- **Loading States**: Shows loading indicator while content is being prepared
- **Error Handling**: Displays user-friendly error messages for missing or invalid content
- **Analytics Tracking**: Optional analytics callback for tracking view events
- **Watermark Support**: Passes watermark configuration to all viewers
- **Content Validation**: Validates that required fields are present before rendering

## Usage

### Basic Usage

```tsx
import UniversalViewer from '@/components/viewers/UniversalViewer';
import { EnhancedDocument } from '@/lib/types/content';

function ViewPage({ content }: { content: EnhancedDocument }) {
  return (
    <UniversalViewer
      content={content}
    />
  );
}
```

### With Watermark

```tsx
<UniversalViewer
  content={content}
  watermark={{
    text: 'user@example.com',
    opacity: 0.3,
    fontSize: 16
  }}
/>
```

### With Analytics

```tsx
<UniversalViewer
  content={content}
  onAnalytics={(event) => {
    console.log('Analytics event:', event);
    // Send to analytics service
  }}
/>
```

### With Email Requirement (for PDFs)

```tsx
<UniversalViewer
  content={content}
  requireEmail={true}
  shareKey="abc123"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `EnhancedDocument` | Yes | The content document to display |
| `watermark` | `WatermarkConfig` | No | Watermark configuration for accountability |
| `onAnalytics` | `(event: ViewerAnalyticsEvent) => void` | No | Callback for analytics events |
| `requireEmail` | `boolean` | No | Whether to require email before viewing (PDF only) |
| `shareKey` | `string` | No | Share key for tracking analytics |

## Content Type Routing

The component routes to different viewers based on `content.contentType`:

- **PDF**: Routes to `PDFViewer` component
- **IMAGE**: Routes to `ImageViewer` component
- **VIDEO**: Routes to `VideoPlayer` component
- **LINK**: Routes to `LinkPreview` component

## Error Handling

The component validates content before rendering:

1. **Missing Content Type**: Shows error if `contentType` is not specified
2. **Missing File URL**: Shows error if PDF/Image/Video content lacks `fileUrl`
3. **Missing Link URL**: Shows error if Link content lacks `linkUrl`
4. **Unsupported Type**: Shows error for unrecognized content types

## Analytics Events

When `onAnalytics` is provided, the component tracks:

- **View Event**: Fired when content is first loaded
- **Document ID**: The ID of the content being viewed
- **Content Type**: The type of content (PDF, IMAGE, VIDEO, LINK)
- **Timestamp**: When the view occurred
- **Metadata**: Additional context (title, shareKey)

## Requirements Validation

This component validates the following requirements:

- **6.1**: Image viewer rendering
- **7.1**: Video player rendering with HTML5 video
- **8.1**: Link preview display
- **14.1**: PDF viewer routing
- **14.2**: Image viewer routing
- **14.3**: Video player routing
- **14.4**: Link preview routing

## Example: Complete Implementation

```tsx
'use client';

import { useEffect, useState } from 'react';
import UniversalViewer from '@/components/viewers/UniversalViewer';
import { EnhancedDocument } from '@/lib/types/content';

export default function ContentViewPage({ 
  contentId 
}: { 
  contentId: string 
}) {
  const [content, setContent] = useState<EnhancedDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch content from API
    fetch(`/api/content/${contentId}`)
      .then(res => res.json())
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load content:', err);
        setLoading(false);
      });
  }, [contentId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!content) {
    return <div>Content not found</div>;
  }

  return (
    <UniversalViewer
      content={content}
      watermark={{
        text: 'user@example.com',
        opacity: 0.3
      }}
      onAnalytics={(event) => {
        // Track analytics
        fetch('/api/analytics', {
          method: 'POST',
          body: JSON.stringify(event)
        });
      }}
    />
  );
}
```

## Testing

The component should be tested with:

1. All content types (PDF, IMAGE, VIDEO, LINK)
2. Missing required fields (fileUrl, linkUrl)
3. Invalid content types
4. Analytics callback invocation
5. Watermark propagation to child viewers

## Related Components

- `PDFViewer`: Renders PDF documents
- `ImageViewer`: Renders images with zoom
- `VideoPlayer`: Renders videos with controls
- `LinkPreview`: Renders link previews
