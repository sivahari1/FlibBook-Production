# LinkPreview Component

## Overview

The `LinkPreview` component displays a preview of external links with metadata including title, description, domain, and preview image. It provides a user-friendly interface for viewing link information before visiting the external site.

## Features

- **Title Display**: Shows the link title prominently (Requirement 8.1)
- **Description Display**: Shows the link description if available (Requirement 8.2)
- **Preview Image**: Displays a preview image when available (Requirement 8.3)
- **Domain Badge**: Shows the target domain prominently (Requirement 8.4)
- **New Tab Opening**: Opens links in a new tab with security attributes (Requirement 8.5)
- **Access Control**: Supports restricted access mode
- **Responsive Design**: Works on all screen sizes
- **Dark Mode**: Full dark mode support
- **Error Handling**: Gracefully handles missing preview images

## Props

```typescript
interface LinkPreviewProps {
  linkUrl: string;              // The URL to preview
  metadata: LinkMetadata;       // Link metadata (title, description, etc.)
  allowDirectAccess: boolean;   // Whether user can visit the link
  title?: string;               // Optional page title
}
```

## LinkMetadata Interface

```typescript
interface LinkMetadata {
  url: string;
  title: string;
  description?: string;
  previewImage?: string;
  domain: string;
  fetchedAt?: Date;
}
```

## Usage

### Basic Usage

```tsx
import LinkPreview from '@/components/viewers/LinkPreview';

function MyComponent() {
  const metadata = {
    url: 'https://example.com/article',
    title: 'Example Article',
    description: 'This is an example article description',
    domain: 'example.com',
    previewImage: 'https://example.com/preview.jpg',
    fetchedAt: new Date()
  };

  return (
    <LinkPreview
      linkUrl="https://example.com/article"
      metadata={metadata}
      allowDirectAccess={true}
    />
  );
}
```

### With Custom Title

```tsx
<LinkPreview
  linkUrl="https://example.com/article"
  metadata={metadata}
  allowDirectAccess={true}
  title="Shared Link: Example Article"
/>
```

### Restricted Access

```tsx
<LinkPreview
  linkUrl="https://example.com/article"
  metadata={metadata}
  allowDirectAccess={false}
  title="Restricted Link"
/>
```

## Component Structure

1. **Header Section**: Optional title display
2. **Preview Image**: Large preview image (if available)
3. **Content Section**:
   - Domain badge with icon
   - Link title
   - Link description
   - URL display in monospace font
   - Action button (Visit Link or Access Restricted message)
   - Metadata footer (fetch date)
4. **Info Box**: Information about external link

## Styling

The component uses Tailwind CSS with:
- Responsive design (mobile-first)
- Dark mode support
- Consistent spacing and typography
- Hover effects on interactive elements
- Color-coded badges and alerts

## Security Features

- Opens links with `target="_blank"` (Requirement 8.5)
- Uses `noopener,noreferrer` for security
- Supports access control restrictions
- Displays clear warnings for external content

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- ARIA-friendly icons
- Keyboard accessible buttons
- Screen reader friendly

## Requirements Validation

- ✅ **8.1**: Displays link title
- ✅ **8.2**: Displays link description
- ✅ **8.3**: Displays preview image if available
- ✅ **8.4**: Displays target domain
- ✅ **8.5**: Opens link in new tab

## Related Components

- `ImageViewer`: For viewing images
- `VideoPlayer`: For playing videos
- `PDFViewer`: For viewing PDFs
- `UniversalViewer`: Routes to appropriate viewer based on content type
