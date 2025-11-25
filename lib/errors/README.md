# Upload Error Handling Utilities

This module provides structured error handling for multi-content type uploads in the jStudyRoom platform.

## Overview

The error handling utilities provide:
- **Structured error classes** with error codes and details
- **User-friendly error messages** for all upload scenarios
- **Error normalization** to convert various error types into consistent UploadError instances
- **Error classification** to determine if errors are recoverable

## Requirements

Implements **Requirement 9.4**: Clear error messages for upload failures

## Usage

### Creating Errors

```typescript
import { createUploadError, UploadErrorCodes } from './lib/errors/upload-errors';

// Create a simple error
const error = createUploadError(UploadErrorCodes.FILE_TOO_LARGE);

// Create an error with details
const error = createUploadError(UploadErrorCodes.FILE_TOO_LARGE, {
  contentType: ContentType.IMAGE,
  fileSize: 15 * 1024 * 1024
});
```

### Handling Errors

```typescript
import { handleUploadError } from './lib/errors/upload-errors';

try {
  await uploadFile(file);
} catch (error) {
  // Convert any error to UploadError
  const uploadError = handleUploadError(error);
  console.error(uploadError.message);
  console.error(uploadError.code);
}
```

### Validating Input

```typescript
import { validateUrlOrThrow, validateFileOrThrow } from './lib/errors/upload-errors';

// Validate URL (throws UploadError if invalid)
validateUrlOrThrow('https://example.com');

// Validate file (throws UploadError if invalid)
validateFileOrThrow(file, ContentType.IMAGE);
```

### Formatting Errors for API Responses

```typescript
import { formatErrorResponse, formatErrorForClient } from './lib/errors/upload-errors';

// For API responses
try {
  await uploadFile(file);
} catch (error) {
  const uploadError = handleUploadError(error);
  return res.status(400).json(formatErrorResponse(uploadError));
}

// For client display
try {
  await uploadFile(file);
} catch (error) {
  const formatted = formatErrorForClient(error);
  showToast(formatted.message);
}
```

### Checking Error Types

```typescript
import { isUploadErrorCode, isRecoverableError } from './lib/errors/upload-errors';

try {
  await uploadFile(file);
} catch (error) {
  if (isUploadErrorCode(error, UploadErrorCodes.QUOTA_EXCEEDED)) {
    // Handle quota exceeded specifically
  }
  
  if (isRecoverableError(error)) {
    // User can fix and retry
    showRetryButton();
  }
}
```

## Error Codes

### File Validation Errors
- `INVALID_FILE_TYPE` - File type not supported
- `INVALID_FILE_EXTENSION` - File extension not allowed
- `FILE_TOO_LARGE` - File exceeds size limit
- `FILE_EMPTY` - File has no content
- `CONTENT_TYPE_MISMATCH` - File doesn't match selected content type

### Quota Errors
- `QUOTA_EXCEEDED` - Upload limit reached
- `SHARE_QUOTA_EXCEEDED` - Sharing limit reached

### Storage Errors
- `STORAGE_ERROR` - General storage error
- `STORAGE_UPLOAD_FAILED` - Upload to storage failed
- `STORAGE_CONNECTION_FAILED` - Cannot connect to storage

### Processing Errors
- `PROCESSING_ERROR` - General processing error
- `THUMBNAIL_GENERATION_FAILED` - Thumbnail creation failed
- `METADATA_EXTRACTION_FAILED` - Metadata extraction failed

### Link Errors
- `INVALID_URL` - URL format is invalid
- `INVALID_URL_PROTOCOL` - URL protocol not supported (only HTTP/HTTPS allowed)
- `METADATA_FETCH_FAILED` - Cannot fetch link metadata
- `LINK_UNREACHABLE` - URL cannot be reached

### Permission Errors
- `PERMISSION_DENIED` - User lacks permission
- `UNAUTHORIZED` - User not authenticated

### General Errors
- `UNKNOWN_ERROR` - Unexpected error
- `INVALID_INPUT` - Invalid input data
- `MISSING_REQUIRED_FIELD` - Required field missing

## Error Recovery

Errors are classified as recoverable or non-recoverable:

**Recoverable errors** (user can fix and retry):
- File validation errors
- URL validation errors
- Input validation errors

**Non-recoverable errors** (system/infrastructure issues):
- Storage errors
- Processing errors
- Permission errors
- Unknown errors

Use `isRecoverableError()` to determine if showing a retry button is appropriate.

## Integration with Existing Code

The error handling utilities integrate with existing validation modules:

```typescript
import { validateFile } from './lib/file-validation';
import { handleUploadError } from './lib/errors/upload-errors';

const validation = validateFile(file, contentType);
if (!validation.valid) {
  // Convert validation error to UploadError
  const error = new Error(validation.error);
  throw handleUploadError(error);
}
```

## Testing

Comprehensive tests are available in `lib/errors/__tests__/upload-errors.test.ts`.

Run tests with:
```bash
npm test lib/errors/__tests__/upload-errors.test.ts
```
