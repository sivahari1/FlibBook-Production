# Getting Started with SimpleDocumentViewer

Welcome! This guide will help you get up and running with the SimpleDocumentViewer quickly.

## What is SimpleDocumentViewer?

SimpleDocumentViewer is a modern, full-screen document viewer component that provides:

- **Full-screen viewing** - Maximizes content visibility
- **Dual view modes** - Continuous scroll or paged viewing
- **Rich navigation** - Mouse, keyboard, and touch controls
- **Zoom controls** - 50% to 300% zoom range
- **Mobile support** - Touch gestures and responsive design
- **Accessibility** - Full keyboard navigation and screen reader support
- **Performance** - Progressive loading and optimizations

## Quick Start (5 minutes)

### 1. Basic Implementation

```tsx
import SimpleDocumentViewer from '@/components/viewers/SimpleDocumentViewer';

function MyViewer() {
  const pages = [
    {
      pageNumber: 1,
      pageUrl: '/api/documents/123/pages/1',
      dimensions: { width: 800, height: 1200 }
    },
    // ... more pages
  ];

  return (
    <SimpleDocumentViewer
      documentId="123"
      documentTitle="My Document"
      pages={pages}
      onClose={() => window.close()}
    />
  );
}
```

### 2. Run Your Application

```bash
npm run dev
```

### 3. Navigate to Your Viewer

Open your browser and navigate to the page containing your viewer component.

## Next Steps

### For End Users

If you're using the viewer (not developing it):

1. **Read the [User Guide](./USER_GUIDE.md)** to learn:
   - How to navigate documents
   - Keyboard shortcuts
   - Touch gestures
   - View modes
   - Zoom controls

2. **Check [Troubleshooting](./TROUBLESHOOTING_GUIDE.md)** if you encounter issues

### For Developers

If you're integrating the viewer into your application:

1. **Read the [Integration Guide](./INTEGRATION_GUIDE.md)** for:
   - Setup instructions
   - API endpoints
   - Authentication
   - Performance optimization

2. **Review the [API Documentation](./API_DOCUMENTATION.md)** for:
   - Component props
   - Type definitions
   - Event handlers
   - Hooks

3. **Explore [Examples](./EXAMPLES.md)** for:
   - Common use cases
   - Best practices
   - Code samples

## Common Use Cases

### Basic Document Viewing

```tsx
<SimpleDocumentViewer
  documentId="doc-123"
  documentTitle="Annual Report"
  pages={pages}
  onClose={() => router.back()}
/>
```

### With Watermark

```tsx
<SimpleDocumentViewer
  documentId="doc-123"
  documentTitle="Confidential Document"
  pages={pages}
  watermark={{
    text: "CONFIDENTIAL",
    opacity: 0.3,
    fontSize: 24
  }}
  onClose={() => router.back()}
/>
```

### Protected Document

```tsx
<SimpleDocumentViewer
  documentId="doc-123"
  documentTitle="Protected Document"
  pages={pages}
  watermark={{
    text: `${user.email} - ${new Date().toLocaleDateString()}`,
    opacity: 0.3,
    fontSize: 16
  }}
  enableScreenshotPrevention={true}
  onClose={() => router.back()}
/>
```

## Key Features

### Navigation

**Mouse:**
- Click arrow buttons to navigate
- Scroll to move through pages (continuous mode)
- Click page number to jump to specific page

**Keyboard:**
- `↓` / `Page Down` - Next page
- `↑` / `Page Up` - Previous page
- `Home` - First page
- `End` - Last page

**Touch (Mobile):**
- Swipe left - Next page
- Swipe right - Previous page
- Pinch - Zoom in/out

### View Modes

**Continuous Scroll:**
- Pages flow vertically
- Smooth scrolling
- Best for reading

**Paged Mode:**
- One page at a time
- Discrete navigation
- Best for presentations

### Zoom

- **Range:** 50% to 300%
- **Controls:** Buttons, keyboard (Ctrl/Cmd + +/-), mouse wheel (Ctrl/Cmd + scroll)
- **Increments:** 25% per step

## Architecture

```
SimpleDocumentViewer
├── ViewerToolbar (Navigation controls)
├── ContinuousScrollView (Continuous mode)
├── PagedView (Paged mode)
└── WatermarkOverlay (Optional)
```

## Requirements

### Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers (iOS Safari 13+, Android Chrome 80+)

### Dependencies

```json
{
  "react": "^18.0.0",
  "next": "^14.0.0",
  "lucide-react": "^0.263.0",
  "tailwindcss": "^3.0.0"
}
```

## File Structure

```
components/viewers/
├── SimpleDocumentViewer.tsx     # Main component
├── ViewerToolbar.tsx           # Toolbar
├── ContinuousScrollView.tsx    # Continuous mode
├── PagedView.tsx              # Paged mode
├── WatermarkOverlay.tsx       # Watermark
├── LoadingSpinner.tsx         # Loading state
├── ViewerError.tsx            # Error display
└── __tests__/                 # Tests

hooks/
├── useKeyboardNavigation.ts   # Keyboard shortcuts
└── useTouchGestures.ts       # Touch gestures

lib/
└── viewer-preferences.ts      # Preferences storage
```

## API Endpoints

You'll need to implement these endpoints:

### Get Document Pages

```typescript
// GET /api/documents/[id]
{
  "title": "Document Title",
  "pages": [
    {
      "pageNumber": 1,
      "pageUrl": "/api/documents/123/pages/1",
      "dimensions": { "width": 800, "height": 1200 }
    }
  ]
}
```

### Get Individual Page

```typescript
// GET /api/documents/[id]/pages/[pageNum]
// Returns: Image file (JPEG/PNG)
```

See the [Integration Guide](./INTEGRATION_GUIDE.md) for complete API implementation examples.

## Troubleshooting

### Pages Not Loading?

1. Check browser console for errors
2. Verify API endpoints are working
3. Check network tab for failed requests
4. Ensure page URLs are accessible

### Performance Issues?

1. Reduce zoom level
2. Switch to paged mode
3. Close other browser tabs
4. Check image sizes (optimize if needed)

### Keyboard Shortcuts Not Working?

1. Click inside the viewer to focus it
2. Check for browser extension conflicts
3. Try using mouse navigation

See the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) for more solutions.

## Documentation Map

```
📚 Documentation
├── 🚀 GETTING_STARTED.md (You are here)
├── 📖 README.md (Overview)
├── 📋 DOCUMENTATION_INDEX.md (Central hub)
├── 🔧 API_DOCUMENTATION.md (API reference)
├── 👤 USER_GUIDE.md (End-user guide)
├── 🔌 INTEGRATION_GUIDE.md (Developer guide)
├── 🔍 TROUBLESHOOTING_GUIDE.md (Problem solving)
└── 💡 EXAMPLES.md (Code examples)
```

## Support

### Documentation

- **Quick questions?** Check the [User Guide](./USER_GUIDE.md)
- **Integration help?** See the [Integration Guide](./INTEGRATION_GUIDE.md)
- **API questions?** Review the [API Documentation](./API_DOCUMENTATION.md)
- **Problems?** Check the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)

### Reporting Issues

When reporting issues, include:

1. Browser and version
2. Device type (desktop/mobile)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
6. Network tab information (for loading issues)

## Best Practices

### Performance

- Use progressive loading for large documents
- Optimize image sizes
- Implement caching
- Use lazy loading

### Security

- Add watermarks for sensitive documents
- Enable screenshot prevention when needed
- Implement authentication
- Validate user access

### Accessibility

- Ensure keyboard navigation works
- Test with screen readers
- Provide alternative text
- Use proper ARIA labels

### Mobile

- Test on real devices
- Optimize for touch
- Reduce image sizes
- Handle orientation changes

## What's Next?

### Learn More

1. **[User Guide](./USER_GUIDE.md)** - Complete user documentation
2. **[Integration Guide](./INTEGRATION_GUIDE.md)** - Integration instructions
3. **[Examples](./EXAMPLES.md)** - Practical code examples
4. **[API Documentation](./API_DOCUMENTATION.md)** - Detailed API reference

### Advanced Topics

- Custom page loading strategies
- Real-time collaboration
- Analytics integration
- Print optimization
- Multi-document viewing

### Contributing

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure accessibility compliance

## Quick Reference

### Props

```typescript
interface SimpleDocumentViewerProps {
  documentId: string;              // Required
  documentTitle: string;           // Required
  pages: PageData[];              // Required
  watermark?: WatermarkSettings;  // Optional
  enableScreenshotPrevention?: boolean; // Optional
  onClose?: () => void;           // Optional
}
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` / `Page Down` | Next page |
| `↑` / `Page Up` | Previous page |
| `Home` | First page |
| `End` | Last page |
| `Ctrl/Cmd + +` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |

### Touch Gestures

| Gesture | Action |
|---------|--------|
| Swipe Left | Next page |
| Swipe Right | Previous page |
| Pinch Out | Zoom in |
| Pinch In | Zoom out |

---

**Ready to dive deeper?** Start with the [Integration Guide](./INTEGRATION_GUIDE.md) or explore the [Examples](./EXAMPLES.md)!
