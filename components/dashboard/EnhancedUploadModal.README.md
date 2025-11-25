# EnhancedUploadModal Component

## Overview

The `EnhancedUploadModal` is a comprehensive upload component that supports multiple content types (PDF, Image, Video, and Link) with role-based access control. It integrates the `ContentTypeSelector`, `FileUploader`, and `LinkUploader` components to provide a unified upload experience.

## Features

- **Multi-Content Type Support**: Upload PDFs, images, videos, or share external links
- **Role-Based Access Control**: Different content types available based on user role
- **BookShop Integration**: Admins can upload directly to BookShop with pricing and visibility options
- **Progress Tracking**: Visual upload progress indicator
- **Success/Error Handling**: Clear feedback messages for upload status
- **Form Validation**: Comprehensive validation for all input fields
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Requirements Satisfied

- **9.1**: Display options for PDF, Image, Video, and Link
- **9.2**: Show appropriate input fields based on content type
- **9.4**: Show upload progress and error messages
- **9.5**: Display success confirmation with content details
- **11.1**: Provide option to upload to BookShop for admins

## Props

```typescript
interface EnhancedUploadModalProps {
  isOpen: boolean;              // Controls modal visibility
  onClose: () => void;          // Callback when modal is closed
  onUpload: (data: UploadData) => Promise<void>; // Upload handler
  userRole: UserRole;           // User's role (ADMIN, PLATFORM_USER, MEMBER)
  showBookShopOption?: boolean; // Show BookShop upload option (default: false)
}
```

## Usage

### Basic Usage

```tsx
import { EnhancedUploadModal } from '@/components/dashboard/EnhancedUploadModal';
import { UploadData } from '@/lib/types/content';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleUpload = async (data: UploadData) => {
    const formData = new FormData();
    formData.append('contentType', data.contentType);
    formData.append('title', data.title);
    
    if (data.file) {
      formData.append('file', data.file);
    } else if (data.linkUrl) {
      formData.append('linkUrl', data.linkUrl);
    }
    
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Upload Content
      </button>
      
      <EnhancedUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
        userRole="ADMIN"
        showBookShopOption={true}
      />
    </>
  );
}
```

### With Session Integration

```tsx
import { useSession } from 'next-auth/react';

function DashboardUpload() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const userRole = session?.user?.userRole as UserRole || 'PLATFORM_USER';
  const isAdmin = userRole === 'ADMIN';

  const handleUpload = async (data: UploadData) => {
    // Your upload logic here
  };

  return (
    <EnhancedUploadModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onUpload={handleUpload}
      userRole={userRole}
      showBookShopOption={isAdmin}
    />
  );
}
```

## Upload Data Structure

The `onUpload` callback receives an `UploadData` object:

```typescript
interface UploadData {
  contentType: ContentType;      // PDF, IMAGE, VIDEO, or LINK
  file?: File;                   // File object (for PDF, Image, Video)
  linkUrl?: string;              // URL string (for Link type)
  title: string;                 // Content title
  description?: string;          // Optional description
  uploadToBookShop?: boolean;    // Whether to upload to BookShop
  bookShopData?: BookShopItemData; // BookShop-specific data
}
```

### BookShop Data Structure

When `uploadToBookShop` is true, the `bookShopData` field contains:

```typescript
interface BookShopItemData {
  title: string;
  description?: string;
  contentType: ContentType;
  category: string;
  price: number;
  isFree: boolean;
  isPublished: boolean;
  file?: File;
  linkUrl?: string;
  previewImage?: File;
  metadata?: ContentMetadata;
}
```

## Role-Based Content Types

Different user roles have access to different content types:

- **ADMIN**: PDF, Image, Video, Link (unlimited uploads)
- **PLATFORM_USER**: PDF only (limited uploads)
- **MEMBER**: No upload access

## Component Integration

The EnhancedUploadModal integrates three main components:

1. **ContentTypeSelector**: Allows users to select content type
2. **FileUploader**: Handles file uploads with drag-and-drop
3. **LinkUploader**: Handles URL input with metadata fetching

## Form Validation

The component validates:

- Title is required and non-empty
- File is selected for PDF/Image/Video types
- URL is provided for Link type
- BookShop category is provided when uploading to BookShop
- Price is valid when BookShop item is not free

## Error Handling

The component displays user-friendly error messages for:

- Missing required fields
- Invalid file types or sizes
- Upload failures
- Network errors

## Success Feedback

Upon successful upload, the component:

1. Shows a success message with content details
2. Displays 100% progress
3. Automatically closes after 1.5 seconds
4. Resets the form

## Styling

The component uses Tailwind CSS with dark mode support. It follows the existing design system with:

- Consistent spacing and typography
- Accessible color contrasts
- Responsive layouts
- Focus states for keyboard navigation

## Accessibility

- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Disabled state handling

## API Integration

The component expects the upload handler to:

1. Accept FormData with content type, title, description, and file/URL
2. Return a promise that resolves on success
3. Throw an error on failure (error message will be displayed)

Example API endpoint structure:

```typescript
// POST /api/documents/upload
{
  contentType: 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK',
  title: string,
  description?: string,
  file?: File,
  linkUrl?: string,
  uploadToBookShop?: boolean,
  bookShopData?: BookShopItemData
}
```

## Testing

See `EnhancedUploadModal.example.tsx` for complete usage examples.

## Dependencies

- `@/components/ui/Modal`: Base modal component
- `@/components/ui/Button`: Button component
- `@/components/ui/Input`: Input component
- `@/components/upload/ContentTypeSelector`: Content type selection
- `@/components/upload/FileUploader`: File upload handling
- `@/components/upload/LinkUploader`: Link upload handling
- `@/lib/types/content`: Type definitions
- `@/lib/rbac/admin-privileges`: Role-based access control

## Notes

- The component automatically fills the title from filename for file uploads
- Link metadata is automatically fetched when a valid URL is entered
- BookShop options are only shown when `showBookShopOption` is true and user has permission
- Upload progress is simulated; actual progress tracking should be implemented in the API
- The component handles both light and dark themes
