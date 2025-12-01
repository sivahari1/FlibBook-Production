# Error Messages Guide

## Overview

This guide documents all error messages in the Flipbook and Media Annotations system, ensuring users receive clear, actionable feedback when issues occur.

**Requirements**: 18.1, 18.2, 18.3, 18.4, 18.5

## Error Message Principles

1. **Be Clear**: Use simple, non-technical language
2. **Be Specific**: Explain exactly what went wrong
3. **Be Actionable**: Tell users what they can do to fix it
4. **Be Empathetic**: Acknowledge the user's frustration
5. **Be Consistent**: Use similar patterns across the application

## Error Categories

### 1. PDF Conversion Errors (Requirement 18.1)

#### Invalid PDF Format
- **Message**: "The uploaded file is not a valid PDF document"
- **Action**: "Please ensure you're uploading a PDF file"
- **When**: File is not a valid PDF
- **Retry**: Yes

#### Corrupted PDF
- **Message**: "The PDF file appears to be corrupted and cannot be processed"
- **Action**: "Try opening and re-saving the PDF in a PDF editor"
- **When**: PDF structure is damaged
- **Retry**: Yes

#### Conversion Timeout
- **Message**: "PDF conversion timed out after 30 seconds"
- **Action**: "The file may be too large or complex. Try a smaller document"
- **When**: Conversion takes too long
- **Retry**: Yes

#### Page Limit Exceeded
- **Message**: "PDF has 600 pages, which exceeds the maximum of 500 pages"
- **Action**: "Try splitting your PDF into smaller documents"
- **When**: Document has too many pages
- **Retry**: No

#### Conversion Failed
- **Message**: "Failed to convert PDF to flipbook format"
- **Action**: "Please try again or contact support if the problem persists"
- **When**: General conversion error
- **Retry**: Yes

### 2. Media Upload Errors (Requirement 18.2)

#### Invalid Media Type
- **Message**: "File type video/avi is not supported. Allowed types: MP3, WAV, MP4, WEBM"
- **Action**: "Please convert your file to a supported format"
- **When**: Unsupported file format
- **Retry**: No (user must change file)

#### File Too Large
- **Message**: "File size 150.5MB exceeds maximum of 100MB"
- **Action**: "Try compressing your media file or use an external URL instead"
- **When**: File exceeds size limit
- **Retry**: No (user must reduce file size)

#### Upload Failed
- **Message**: "Failed to upload media file"
- **Action**: "Check your internet connection and try again"
- **When**: Network or server error during upload
- **Retry**: Yes

#### Storage Quota Exceeded
- **Message**: "Storage quota exceeded. Please delete some files or upgrade your plan"
- **Action**: "Delete unused media files or upgrade your storage plan"
- **When**: User has no storage space left
- **Retry**: No (user must free up space)

#### Invalid Media Content
- **Message**: "Media file content is invalid: corrupted audio stream"
- **Action**: "The file may be corrupted. Try re-exporting from your media editor"
- **When**: File is corrupted or malformed
- **Retry**: No (user must fix file)

### 3. Network Errors (Requirement 18.3)

#### Connection Lost
- **Message**: "Network connection lost. Please check your internet connection"
- **Action**: "Check your internet connection and try again"
- **When**: Network disconnected
- **Retry**: Yes

#### Request Timeout
- **Message**: "Request timed out after 30000ms"
- **Action**: "The server is taking too long to respond. Please try again"
- **When**: Request takes too long
- **Retry**: Yes

#### Server Unreachable
- **Message**: "Unable to reach the server. Please try again later"
- **Action**: "The server may be temporarily unavailable. Try again in a few minutes"
- **When**: Server is down or unreachable
- **Retry**: Yes

#### Rate Limit Exceeded
- **Message**: "Too many requests. Please try again later"
- **Action**: "Wait a few minutes before trying again"
- **When**: User exceeded rate limit
- **Retry**: Yes (after delay)

#### Bad Gateway
- **Message**: "Server error occurred. Please try again later"
- **Action**: "Our servers are experiencing issues. Please try again shortly"
- **When**: Server error (502, 503, 504)
- **Retry**: Yes

### 4. Permission Errors (Requirement 18.4)

#### Access Denied
- **Message**: "You don't have permission to view this document"
- **Action**: "Contact the document owner to request access"
- **When**: User lacks permission
- **Retry**: No

#### Annotation Permission Denied
- **Message**: "You don't have permission to create annotations on this document"
- **Action**: "Only Platform Users can create annotations. Contact an administrator if you need access"
- **When**: Non-platform user tries to annotate
- **Retry**: No

#### Document Not Found
- **Message**: "Document not found or you don't have access to it"
- **Action**: "The document may have been deleted or you may not have permission to view it"
- **When**: Document doesn't exist or no access
- **Retry**: No

#### Session Expired
- **Message**: "Your session has expired. Please log in again"
- **Action**: "Log in again to continue"
- **When**: User session expired
- **Retry**: No (user must log in)

#### Insufficient Privileges
- **Message**: "This action requires PLATFORM_USER privileges"
- **Action**: "Contact an administrator if you need access to this feature"
- **When**: User role insufficient
- **Retry**: No

### 5. Annotation Errors

#### Invalid Position
- **Message**: "Annotation position is outside page boundaries"
- **Action**: "Please select text within the page area"
- **When**: Annotation coordinates invalid
- **Retry**: No (user must reselect)

#### Invalid Content
- **Message**: "Annotation content is invalid: text selection is empty"
- **Action**: "Please select some text before creating an annotation"
- **When**: Annotation data invalid
- **Retry**: No (user must fix input)

#### Annotation Not Found
- **Message**: "Annotation not found"
- **Action**: "The annotation may have been deleted"
- **When**: Annotation doesn't exist
- **Retry**: No

#### Too Many Annotations
- **Message**: "Maximum number of annotations (50) reached for this page"
- **Action**: "Delete some annotations before adding new ones"
- **When**: Page annotation limit reached
- **Retry**: No (user must delete annotations)

### 6. Page Loading Errors

#### Page Not Found
- **Message**: "Page 25 not found in document"
- **Action**: "The page may not have been converted yet. Try refreshing"
- **When**: Page doesn't exist
- **Retry**: Yes

#### Image Load Failed
- **Message**: "Failed to load page image"
- **Action**: "Check your internet connection and try again"
- **When**: Image fails to load
- **Retry**: Yes

#### Invalid Page Number
- **Message**: "Invalid page number 150. Document has 100 pages"
- **Action**: "Please select a valid page number"
- **When**: Page number out of range
- **Retry**: No (user must fix input)

### 7. Security Errors

#### DRM Violation
- **Message**: "DRM protection violation detected"
- **Action**: "This content is protected and cannot be copied"
- **When**: DRM violation detected
- **Retry**: No

#### Dev Tools Detected
- **Message**: "Developer tools detected. This content is protected"
- **Action**: "Please close developer tools to continue viewing"
- **When**: Dev tools opened
- **Retry**: No

#### Screenshot Attempt
- **Message**: "Screenshot attempt blocked. This content is protected"
- **Action**: "Screenshots are not allowed for this content"
- **When**: Screenshot detected
- **Retry**: No

#### Unauthorized Access
- **Message**: "Unauthorized access attempt detected"
- **Action**: "Please log in to access this content"
- **When**: Unauthorized access attempt
- **Retry**: No (user must authenticate)

### 8. Validation Errors

#### Missing Field
- **Message**: "Required field 'selectedText' is missing"
- **Action**: "Please provide all required information"
- **When**: Required field missing
- **Retry**: No (user must provide data)

#### Invalid Format
- **Message**: "Field 'pageNumber' has invalid format. Expected: integer"
- **Action**: "Please enter a valid page number"
- **When**: Field format invalid
- **Retry**: No (user must fix format)

#### Out of Range
- **Message**: "Field 'pageNumber' value 150 is out of range [1, 100]"
- **Action**: "Please enter a page number between 1 and 100"
- **When**: Value out of valid range
- **Retry**: No (user must fix value)

## Error Display Components

### ErrorDisplay Component
Full-page error display with icon, title, message, and action buttons.

```tsx
<ErrorDisplay
  error={error}
  onRetry={() => retryOperation()}
  onDismiss={() => closeError()}
/>
```

### ErrorToast Component
Toast notification for non-critical errors.

```tsx
<ErrorToast
  error={error}
  onClose={() => {}}
  onRetry={() => retryOperation()}
  autoClose={true}
/>
```

### Compact Error Display
Inline error display for forms and modals.

```tsx
<ErrorDisplay
  error={error}
  compact={true}
  onRetry={() => retryOperation()}
/>
```

## Error Handling Best Practices

### 1. Always Provide Context
```typescript
// Bad
throw new Error('Upload failed');

// Good
throw new MediaUploadError.fileTooLarge(
  filename,
  fileSize,
  maxSize
);
```

### 2. Make Errors Retryable When Possible
```typescript
if (isRetryableError(error)) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={() => retryOperation()}
    />
  );
}
```

### 3. Log Errors for Debugging
```typescript
try {
  await operation();
} catch (error) {
  await handleError(error, {
    userId: session.user.id,
    operation: 'pdf_conversion',
    documentId,
  });
  throw error;
}
```

### 4. Show Progress for Long Operations
```typescript
<div>
  <p>Converting PDF... {progress}%</p>
  {error && <ErrorDisplay error={error} compact />}
</div>
```

### 5. Provide Alternative Actions
```typescript
<ErrorDisplay
  error={error}
  onRetry={() => retryUpload()}
  onDismiss={() => useExternalUrl()}
/>
```

## Testing Error Messages

### Unit Tests
Test that error messages are clear and actionable:

```typescript
test('shows clear error message for file too large', () => {
  const error = MediaUploadError.fileTooLarge('video.mp4', 150MB, 100MB);
  const { title, message } = getUserFriendlyMessage(error);
  
  expect(message).toContain('150');
  expect(message).toContain('100MB');
  expect(message).toContain('exceeds');
});
```

### Integration Tests
Test error handling flows:

```typescript
test('shows error and allows retry on upload failure', async () => {
  // Simulate upload failure
  mockUpload.mockRejectedValue(new Error('Network error'));
  
  // Attempt upload
  await uploadFile(file);
  
  // Verify error displayed
  expect(screen.getByText(/network error/i)).toBeInTheDocument();
  
  // Verify retry button
  expect(screen.getByText(/try again/i)).toBeInTheDocument();
});
```

## Accessibility

All error messages must be accessible:

1. **ARIA Labels**: Use `role="alert"` for error messages
2. **Screen Readers**: Ensure error messages are announced
3. **Keyboard Navigation**: Error actions must be keyboard accessible
4. **Color Contrast**: Error text must meet WCAG AA standards
5. **Focus Management**: Focus should move to error message

## Localization

Error messages should be localization-ready:

```typescript
const errorMessages = {
  en: {
    'upload.file_too_large': 'File size {size}MB exceeds maximum of {max}MB',
  },
  es: {
    'upload.file_too_large': 'El tamaño del archivo {size}MB excede el máximo de {max}MB',
  },
};
```

## Monitoring

Track error frequency and patterns:

```typescript
const errorStats = errorHandler.getErrorStats();
console.log('Total errors:', errorStats.total);
console.log('By type:', errorStats.byType);
console.log('By severity:', errorStats.bySeverity);
```

## Summary

Clear error messages are essential for user experience. This guide ensures:

✅ Users understand what went wrong
✅ Users know how to fix the problem
✅ Errors are logged for debugging
✅ Retry mechanisms are provided when appropriate
✅ Error messages are consistent across the application

## Related Documentation

- [Error Handling Implementation](./ERROR_HANDLING.md)
- [API Error Responses](./API_DOCUMENTATION.md#error-responses)
- [User Guide - Troubleshooting](./USER_GUIDE.md#troubleshooting)
