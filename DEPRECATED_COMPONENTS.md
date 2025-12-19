# Deprecated Components - Document Conversion Pipeline

This document lists components that have been deprecated as part of the unified viewer system implementation.

## Deprecated Components

### FlipBookWrapper Component
- **Location**: `components/viewers/UniversalViewer.tsx`
- **Status**: Removed
- **Reason**: Replaced by UnifiedViewer with SimpleDocumentViewer for direct PDF.js rendering
- **Migration**: Use `UnifiedViewer` component instead of `UniversalViewer` for PDF content

### PDF-to-Image Conversion API
- **Location**: `app/api/documents/convert/route.ts`
- **Status**: Deprecated (returns 410 Gone)
- **Reason**: PDF documents now use direct PDF.js rendering instead of conversion to images
- **Migration**: Use UnifiedViewer component with SimpleDocumentViewer

### PDF Converter Service
- **Location**: `lib/services/pdf-converter.ts`
- **Status**: Should be removed (not used by unified system)
- **Reason**: No longer needed with direct PDF.js rendering
- **Migration**: Direct PDF rendering through PDF.js in SimpleDocumentViewer

### Page Cache Service
- **Location**: `lib/services/page-cache.ts`
- **Status**: Should be removed (not used by unified system)
- **Reason**: No caching needed with direct PDF rendering
- **Migration**: Browser-native PDF.js caching

## Migration Guide

### For PDF Viewing
**Before (Deprecated):**
```tsx
<UniversalViewer content={pdfDocument} />
```

**After (Recommended):**
```tsx
<UnifiedViewer content={pdfDocument} />
```

### For API Integration
**Before (Deprecated):**
```javascript
// Convert PDF to images first
const response = await fetch('/api/documents/convert', {
  method: 'POST',
  body: JSON.stringify({ documentId })
});
const { pageUrls } = await response.json();
```

**After (Recommended):**
```javascript
// Use direct PDF rendering - no conversion needed
const pdfUrl = document.fileUrl; // Direct PDF URL
// Pass to UnifiedViewer component
```

## Benefits of Migration

1. **Faster Loading**: No conversion time required
2. **Better Quality**: Native PDF rendering instead of image conversion
3. **Reduced Storage**: No need to store converted page images
4. **Simplified Architecture**: Fewer moving parts and dependencies
5. **Better Error Handling**: Direct PDF.js error handling instead of conversion errors

## Cleanup Tasks

The following files/components should be removed in future cleanup:
- [ ] `lib/services/pdf-converter.ts`
- [ ] `lib/services/page-cache.ts`
- [ ] `lib/performance/conversion-monitor.ts`
- [ ] Database table: `document_pages`
- [ ] Storage bucket: `document-pages`
- [ ] All conversion-related scripts in `scripts/` directory

## Testing

Tests have been added to verify:
- Deprecated components are no longer accessible
- System works without conversion dependencies
- UnifiedViewer properly handles PDF content
- No conversion API calls are made for PDF viewing

See:
- `components/viewers/__tests__/deprecated-component-removal.test.tsx`
- `app/api/__tests__/conversion-pipeline-removal.integration.test.ts`