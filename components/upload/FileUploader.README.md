# FileUploader Component

A comprehensive file upload component that supports PDF, Image, and Video uploads with drag-and-drop functionality, file preview, and validation.

## Features

- ✅ **Multi-Content Type Support**: Handles PDF, Image, and Video files
- ✅ **Drag-and-Drop**: Intuitive drag-and-drop interface
- ✅ **File Preview**: Shows preview for images and videos before upload
- ✅ **Validation**: Comprehensive file type and size validation
- ✅ **Progress Indication**: Visual feedback during file selection
- ✅ **Error Handling**: Clear error messages for invalid files
- ✅ **Accessibility**: Keyboard navigation and screen reader support
- ✅ **Dark Mode**: Full dark mode support
- ✅ **Responsive**: Works on all screen sizes

## Requirements

Implements **Requirement 9.2**:
- Create FileUploader component for PDF/Image/Video
- Implement drag-and-drop functionality
- Show file preview before upload
- Display upload progress

## Installation

The component is located at `components/upload/FileUploader.tsx` and requires the following dependencies:

```typescript
import { FileUploader } from '@/components/upload/FileUploader';
import { ContentType } from '@/lib/types/content';
```

## Props

```typescript
interface FileUploaderProps {
  contentType: ContentType;           // Required: Type of content (PDF, IMAGE, VIDEO)
  onFileSelect: (file: File) => void; // Required: Callback when file is selected
  maxSize?: number;                   // Optional: Maximum file size in bytes
  acceptedFormats?: string[];         // Optional: Array of accepted MIME types
  disabled?: boolean;                 // Optional: Disable the uploader
  selectedFile?: File | null;         // Optional: Currently selected file
  onFileRemove?: () => void;          // Optional: Callback when file is removed
}
```

## Basic Usage

### PDF Upload

```tsx
import { FileUploader } from '@/components/upload/FileUploader';
import { ContentType } from '@/lib/types/content';

function PDFUpload() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <FileUploader
      contentType={ContentType.PDF}
      onFileSelect={setFile}
      selectedFile={file}
      onFileRemove={() => setFile(null)}
    />
  );
}
```

### Image Upload with Preview

```tsx
function ImageUpload() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <FileUploader
      contentType={ContentType.IMAGE}
      onFileSelect={setFile}
      selectedFile={file}
      onFileRemove={() => setFile(null)}
    />
  );
}
```

### Video Upload

```tsx
function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <FileUploader
      contentType={ContentType.VIDEO}
      onFileSelect={setFile}
      selectedFile={file}
      onFileRemove={() => setFile(null)}
    />
  );
}
```

## Advanced Usage

### Custom Size Limit

```tsx
<FileUploader
  contentType={ContentType.VIDEO}
  onFileSelect={handleFileSelect}
  maxSize={100 * 1024 * 1024} // 100MB
/>
```

### Custom Accepted Formats

```tsx
<FileUploader
  contentType={ContentType.IMAGE}
  onFileSelect={handleFileSelect}
  acceptedFormats={['image/png', 'image/jpeg']} // Only PNG and JPG
/>
```

### Disabled State

```tsx
<FileUploader
  contentType={ContentType.PDF}
  onFileSelect={handleFileSelect}
  disabled={isUploading}
/>
```

### Complete Upload Form

```tsx
function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('contentType', ContentType.PDF);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Upload successful!');
        setFile(null);
        setTitle('');
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        required
      />
      
      <FileUploader
        contentType={ContentType.PDF}
        onFileSelect={setFile}
        selectedFile={file}
        onFileRemove={() => setFile(null)}
        disabled={isUploading}
      />
      
      <button type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
```

## File Validation

The component automatically validates files based on content type:

### PDF Files
- **Accepted formats**: `.pdf`
- **MIME types**: `application/pdf`
- **Max size**: 50MB (default)

### Image Files
- **Accepted formats**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **MIME types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Max size**: 10MB (default)

### Video Files
- **Accepted formats**: `.mp4`, `.webm`, `.mov`
- **MIME types**: `video/mp4`, `video/webm`, `video/quicktime`
- **Max size**: 500MB (default)

## File Preview

The component automatically generates previews:

- **Images**: Shows thumbnail preview of the image
- **Videos**: Shows video player with controls
- **PDFs**: Shows file icon and metadata (no preview)

## Drag and Drop

The component supports drag-and-drop:

1. Drag a file over the drop zone
2. Drop zone highlights when file is over it
3. Drop the file to select it
4. File is validated automatically

## Error Handling

The component displays clear error messages for:

- Invalid file type
- File size exceeds limit
- Empty files
- Validation failures

## Accessibility

- Keyboard navigation support
- Screen reader friendly
- ARIA labels and roles
- Focus management

## Styling

The component uses Tailwind CSS and supports:

- Light and dark modes
- Responsive design
- Customizable via Tailwind classes
- Consistent with design system

## Integration with Upload API

```tsx
async function uploadFile(file: File, contentType: ContentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('contentType', contentType);

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return await response.json();
}
```

## Testing

The component includes comprehensive tests:

```bash
npm test -- components/upload/__tests__/FileUploader.test.tsx
```

Test coverage includes:
- Props validation
- File validation
- Drag and drop
- File selection
- Preview generation
- Error handling
- Disabled state

## Examples

See `FileUploader.example.tsx` for complete working examples:

1. Basic PDF Upload
2. Image Upload with Preview
3. Video Upload with Custom Size
4. Multi-Content Type Form
5. Disabled State
6. Custom Formats

## Related Components

- `ContentTypeSelector`: Select content type before upload
- `UploadModal`: Complete upload modal with FileUploader
- `EnhancedUploadModal`: Multi-content type upload modal

## API Reference

### Helper Functions

```typescript
// Validate file
validateFile(file, contentType): { valid: boolean; error?: string }

// Format bytes to human-readable
formatBytes(bytes: number): string

// Get max file size for content type
getMaxFileSize(contentType: ContentType): number

// Get allowed file types
getAllowedFileTypes(contentType: ContentType): string

// Get allowed extensions
getAllowedExtensions(contentType: ContentType): string[]
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Performance

- Lazy preview generation
- Efficient file validation
- Minimal re-renders
- Cleanup of object URLs

## Security

- File type validation
- Size limit enforcement
- Filename sanitization
- MIME type checking

## Future Enhancements

- [ ] Upload progress bar
- [ ] Multiple file selection
- [ ] Batch upload
- [ ] Image cropping
- [ ] Video trimming
- [ ] Compression options

## License

Part of the jStudyRoom platform.
