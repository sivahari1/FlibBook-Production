# Upload Components

This directory contains components related to content upload functionality.

## ContentTypeSelector

A component that allows users to select the type of content they want to upload (PDF, Image, Video, or Link).

### Features

- **Visual Selection**: Displays content types as cards with icons and descriptions
- **Role-Based Filtering**: Automatically filters available content types based on user permissions
- **Responsive Design**: Works on mobile and desktop with a grid layout
- **Accessibility**: Includes proper ARIA labels and keyboard navigation
- **Dark Mode Support**: Fully styled for both light and dark themes
- **Disabled State**: Can be disabled during upload or processing

### Usage

```tsx
import { ContentTypeSelector } from '@/components/upload/ContentTypeSelector';
import { ContentType } from '@/lib/types/content';
import { getAllowedContentTypes } from '@/lib/rbac/admin-privileges';

function MyUploadForm() {
  const [selectedType, setSelectedType] = useState<ContentType>(ContentType.PDF);
  const allowedTypes = getAllowedContentTypes(userRole);

  return (
    <ContentTypeSelector
      selectedType={selectedType}
      onTypeChange={setSelectedType}
      allowedTypes={allowedTypes}
      disabled={false}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `selectedType` | `ContentType` | Yes | Currently selected content type |
| `onTypeChange` | `(type: ContentType) => void` | Yes | Callback when selection changes |
| `allowedTypes` | `ContentType[]` | Yes | Array of content types available to the user |
| `disabled` | `boolean` | No | Whether the selector is disabled (default: false) |

### Content Types

- **PDF**: PDF documents
- **IMAGE**: JPG, PNG, GIF, WebP images
- **VIDEO**: MP4, WebM, MOV videos
- **LINK**: External URLs

### Role-Based Access

Different user roles have access to different content types:

- **ADMIN**: All content types (PDF, IMAGE, VIDEO, LINK)
- **PLATFORM_USER**: PDF only
- **MEMBER**: No upload access

Use the `getAllowedContentTypes(userRole)` function from `@/lib/rbac/admin-privileges` to get the appropriate content types for a user.

### Examples

See `ContentTypeSelector.example.tsx` for complete usage examples including:
- Admin user with all types
- Platform user with limited types
- Disabled state
- Member with no access
- Form integration

### Requirements

This component implements:
- **Requirement 9.1**: Display options for PDF, Image, Video, and Link with appropriate input fields

### Styling

The component uses Tailwind CSS and follows the application's design system:
- Blue accent color for selected state
- Gray for unselected state
- Hover effects for better UX
- Focus rings for accessibility
- Dark mode support throughout

### Accessibility

- Proper ARIA labels (`aria-label`, `aria-pressed`)
- Keyboard navigation support
- Focus indicators
- Disabled state handling
- Screen reader friendly
