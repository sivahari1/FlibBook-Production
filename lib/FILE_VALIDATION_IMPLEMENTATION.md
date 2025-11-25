# File Validation and Sanitization Implementation

## Overview

This document describes the implementation of file validation and sanitization utilities for the jStudyRoom platform's multi-content type support. The utilities handle validation for images, videos, and PDFs with comprehensive security measures.

## Implementation Status

✅ **Task 5: File Validation and Sanitization Utilities** - COMPLETED

## Components Implemented

### File Validation Module (`lib/file-validation.ts`)

Comprehensive validation utilities for multi-content type file uploads.

**Key Features:**

#### 1. Image Validation (Requirements 3.1, 3.2)
- **Supported Formats**: JPG, JPEG, PNG, GIF, WebP
- **MIME Type Validation**: Validates against allowed image MIME types
- **Extension Validation**: Validates file extensions
- **Size Limits**: Maximum 10MB per image
- **Case-Insensitive**: Handles uppercase/lowercase extensions and MIME types

#### 2. Video Validation (Requirements 4.1, 4.2)
- **Supported Formats**: MP4, WebM, MOV
- **MIME Type Validation**: Validates against allowed video MIME types
- **Extension Validation**: Validates file extensions
- **Size Limits**: Maximum 500MB per video
- **Case-Insensitive**: Handles uppercase/lowercase extensions and MIME types

#### 3. PDF Validation
- **Supported Format**: PDF only
- **MIME Type Validation**: application/pdf
- **Extension Validation**: .pdf extension
- **Size Limits**: Maximum 50MB per PDF

#### 4. Filename Sanitization (Requirements 3.2, 4.2)
- **Path Traversal Prevention**: Removes `../`, `..\\`, and path separators
- **Special Character Removal**: Replaces unsafe characters with underscores
- **Null Byte Protection**: Removes null bytes and control characters
- **Length Limiting**: Limits filename to 200 characters (plus extension)
- **Extension Preservation**: Maintains valid file extensions
- **Fallback Handling**: Returns "unnamed" for invalid filenames

## Functions Implemented

### Type Validation Functions
```typescript
isValidImageType(mimeType: string): boolean
isValidImageExtension(filename: string): boolean
isValidVideoType(mimeType: string): boolean
isValidVideoExtension(filename: string): boolean
isValidPDFType(mimeType: string): boolean
isValidPDFExtension(filename: string): boolean
```

### Size Validation
```typescript
isValidFileSize(size: number, contentType: ContentType): boolean
getMaxFileSize(contentType: ContentType): number
```

### Comprehensive Validation
```typescript
validateImageFile(file: FileInfo): ValidationResult
validateVideoFile(file: FileInfo): ValidationResult
validatePDFFile(file: FileInfo): ValidationResult
validateFile(file: FileInfo, contentType: ContentType): ValidationResult
validateContentTypeMatch(file: FileInfo, contentType: ContentType): ValidationResult
```

### Sanitization
```typescript
sanitizeFilename(filename: string): string
```

### Helper Functions
```typescript
formatBytes(bytes: number, decimals?: number): string
getAllowedFileTypes(contentType: ContentType): string
getAllowedExtensions(contentType: ContentType): string[]
```

## Constants

### Image Constants
```typescript
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
```

### Video Constants
```typescript
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']
MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
```

### PDF Constants
```typescript
ALLOWED_PDF_TYPES = ['application/pdf']
ALLOWED_PDF_EXTENSIONS = ['.pdf']
MAX_PDF_SIZE = 50 * 1024 * 1024 // 50MB
```

## Testing

Comprehensive test suite implemented in `lib/__tests__/file-validation.test.ts`:

### Test Coverage
- ✅ Image type validation (6 tests)
- ✅ Video type validation (6 tests)
- ✅ PDF type validation (6 tests)
- ✅ File size validation (5 tests)
- ✅ Filename sanitization (9 tests)
- ✅ Image file validation (5 tests)
- ✅ Video file validation (5 tests)
- ✅ PDF file validation (4 tests)
- ✅ Universal file validation (3 tests)
- ✅ Content type match validation (2 tests)
- ✅ Helper functions (4 tests)

**Total Tests:** 55 tests passing ✅

### Test Categories

#### Type Validation Tests
- Validates correct MIME types are accepted
- Validates incorrect MIME types are rejected
- Validates case-insensitive handling
- Validates correct extensions are accepted
- Validates incorrect extensions are rejected

#### Size Validation Tests
- Validates files within size limits
- Validates files exceeding size limits
- Validates zero and negative sizes are rejected
- Validates link content type has no size restrictions

#### Sanitization Tests
- Validates basic filename sanitization
- Validates path traversal prevention (`../../../etc/passwd` → `etc_passwd`)
- Validates special character removal
- Validates null byte and control character removal
- Validates multiple underscore collapsing
- Validates leading/trailing character removal
- Validates filename length limiting
- Validates empty filename handling
- Validates extension preservation

#### Comprehensive Validation Tests
- Validates complete file validation for each content type
- Validates error messages are descriptive
- Validates content type matching

## Security Features

### Path Traversal Prevention
- Removes `../` and `..\\` sequences
- Replaces path separators (`/`, `\`) with underscores
- Prevents access to parent directories

### Special Character Handling
- Removes null bytes (`\0`)
- Removes control characters (`\x00-\x1f`, `\x80-\x9f`)
- Replaces unsafe characters with underscores
- Preserves only alphanumeric, underscore, and hyphen characters

### Extension Validation
- Validates extensions match MIME types
- Prevents extension spoofing
- Limits extension length to 10 characters
- Converts extensions to lowercase

### Size Limits
- Enforces maximum file sizes per content type
- Prevents zero-byte files
- Prevents negative file sizes
- Provides clear error messages with size information

## Usage Examples

### Validate an Image File
```typescript
import { validateImageFile } from '@/lib/file-validation';

const file = {
  name: 'photo.jpg',
  type: 'image/jpeg',
  size: 2 * 1024 * 1024 // 2MB
};

const result = validateImageFile(file);
if (!result.valid) {
  console.error(result.error);
}
```

### Validate Any File by Content Type
```typescript
import { validateFile, ContentType } from '@/lib/file-validation';

const result = validateFile(file, ContentType.VIDEO);
if (!result.valid) {
  console.error(result.error);
}
```

### Sanitize a Filename
```typescript
import { sanitizeFilename } from '@/lib/file-validation';

const safe = sanitizeFilename('../../../etc/passwd');
// Returns: "etc_passwd"

const safe2 = sanitizeFilename('my file<>:"|?.jpg');
// Returns: "my_file.jpg"
```

### Get Allowed File Types for Input
```typescript
import { getAllowedFileTypes, ContentType } from '@/lib/file-validation';

const accept = getAllowedFileTypes(ContentType.IMAGE);
// Returns: "image/jpeg,image/jpg,image/png,image/gif,image/webp"

// Use in HTML:
<input type="file" accept={accept} />
```

### Format File Size
```typescript
import { formatBytes } from '@/lib/file-validation';

console.log(formatBytes(1024)); // "1 KB"
console.log(formatBytes(1536)); // "1.5 KB"
console.log(formatBytes(1048576)); // "1 MB"
```

## Error Messages

The validation functions provide clear, user-friendly error messages:

- **Invalid Type**: "Invalid image type. Allowed formats: JPG, PNG, GIF, WebP."
- **Invalid Extension**: "Invalid image extension. Allowed: .jpg, .jpeg, .png, .gif, .webp"
- **File Too Large**: "Image size exceeds maximum limit of 10 MB."
- **Empty File**: "Image file is empty."
- **Type Mismatch**: "File does not match selected content type (Image)."

## Requirements Coverage

### Requirement 3.1 - Image Format Validation ✅
Images are validated for correct MIME types (JPG, PNG, GIF, WebP) and extensions.

### Requirement 3.2 - Image Validation & Sanitization ✅
File size limits enforced (10MB), filenames sanitized for security.

### Requirement 4.1 - Video Format Validation ✅
Videos are validated for correct MIME types (MP4, WebM, MOV) and extensions.

### Requirement 4.2 - Video Validation & Sanitization ✅
File size limits enforced (500MB), filenames sanitized for security.

## Integration Points

The file validation utilities integrate with:
1. **Upload API** (Task 6) - Validates files before processing
2. **Content Processor** (Task 4) - Ensures only valid files are processed
3. **Upload Modal** (Task 10) - Provides client-side validation
4. **File Uploader Component** (Task 8) - Validates files before upload

## Future Enhancements

### Content-Based Validation
- Implement magic number validation (file signature checking)
- Validate actual file content matches declared MIME type
- Detect file type spoofing attempts

### Advanced Sanitization
- Unicode normalization for international filenames
- Homograph attack prevention
- Reserved filename detection (CON, PRN, AUX, etc. on Windows)

### Performance
- Add caching for repeated validations
- Optimize regex patterns for better performance
- Implement streaming validation for large files

## Dependencies

- **TypeScript** - Type safety
- **ContentType enum** - From `lib/types/content.ts`
- **Vitest** - Testing framework

---

**Implementation Date:** November 24, 2025
**Status:** ✅ Complete and Tested
**Test Coverage:** 55/55 tests passing
