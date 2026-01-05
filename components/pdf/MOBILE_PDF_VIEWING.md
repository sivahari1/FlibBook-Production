# Mobile-Safe PDF Viewing Implementation

## Overview

The `PdfViewer` component now provides mobile-safe PDF viewing that addresses the common issue where mobile browsers (especially Chrome) show a gray "file" icon instead of rendering PDFs in iframes.

## Implementation Details

### Mobile Detection

The component uses two detection methods:
1. **Screen size**: `window.matchMedia('(max-width: 768px)').matches`
2. **User Agent**: `/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)`

If either condition is true, the mobile fallback UI is displayed.

### Desktop Experience (Unchanged)

- PDF renders in an iframe with `#view=FitH` parameter
- "Open PDF in new tab" link remains visible
- Responsive container with configurable height offset
- Clean rounded border styling

### Mobile Experience (New)

When mobile is detected, shows a centered fallback card with:
- Document title
- Explanatory message about mobile limitations
- "Open PDF" button (opens in new tab with `window.open`)
- "Download PDF" link (uses same URL with download attribute)

## Usage

```tsx
// Basic usage
<PdfViewer url="https://example.com/document.pdf" />

// With custom title and height offset
<PdfViewer 
  url="https://example.com/document.pdf" 
  title="My Document"
  heightOffsetPx={180}
/>
```

## Props

- `url` (string, required): The PDF URL
- `title` (string, optional): Document title for display
- `heightOffsetPx` (number, optional): Height offset for desktop iframe (default: 220px)

## Benefits

1. **Reliable mobile experience**: No more gray file icons on mobile
2. **Consistent desktop experience**: Iframe rendering preserved
3. **User-friendly fallback**: Clear messaging and action buttons
4. **Accessibility**: Proper button semantics and keyboard navigation
5. **Performance**: No heavy PDF.js libraries or canvas rendering

## Browser Compatibility

- **Desktop**: All modern browsers with iframe PDF support
- **Mobile**: Fallback works on all mobile browsers
- **iOS Safari**: Handles PDF opening in new tab gracefully
- **Android Chrome**: Bypasses iframe rendering issues

## Security Considerations

- Uses `window.open` with `noopener,noreferrer` for security
- No client-side PDF processing or rendering
- Relies on browser's native PDF handling in new tab