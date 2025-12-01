# Flipbook Viewer & Media Annotations

## Overview

A comprehensive document viewing and annotation system featuring 3D flipbook animations and rich media annotations (audio/video).

## Features

### Flipbook Viewer
- 3D page turning animations
- Touch gesture support
- Keyboard navigation
- Zoom controls (50%-300%)
- Fullscreen mode
- Responsive design (mobile, tablet, desktop)
- DRM protection with watermarks

### Media Annotations
- Audio annotations (MP3, WAV, external URLs)
- Video annotations (MP4, WEBM, external URLs)
- Text selection-based annotation creation
- Visual markers on pages
- Secure media streaming
- Role-based permissions
- Public/private visibility

## Documentation

### User Documentation
- [User Guide](./USER_GUIDE.md) - Complete guide for end users
- [Troubleshooting](./USER_GUIDE.md#troubleshooting) - Common issues and solutions

### Technical Documentation
- [API Documentation](./API_DOCUMENTATION.md) - REST API reference
- [Component Documentation](./COMPONENT_DOCUMENTATION.md) - React components
- [Database Schema](./DATABASE_SCHEMA.md) - Database structure
- [Architecture](./ARCHITECTURE.md) - System architecture

### Deployment Documentation
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment
- [Migration Scripts](../../scripts/) - Deployment automation

## Quick Start

### Prerequisites

```bash
Node.js 18+
PostgreSQL 14+
Supabase account
```

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/jstudyroom.git

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

## Usage

### Basic Flipbook

```tsx
import { FlipBookViewer } from '@/components/flipbook/FlipBookViewer';

function DocumentPage() {
  return (
    <FlipBookViewer
      documentId="doc-123"
      pages={pageData}
      watermark="user@example.com"
    />
  );
}
```

### With Annotations

```tsx
import { AnnotationsContainer } from '@/components/annotations/AnnotationsContainer';
import { FlipbookWithFallback } from '@/components/fallback/FlipbookWithFallback';

function AnnotatedDocument() {
  return (
    <AnnotationsContainer documentId="doc-123" currentPage={1}>
      <FlipbookWithFallback
        documentId="doc-123"
        documentUrl="/documents/doc-123.pdf"
        pages={pageData}
        watermark="user@example.com"
      />
    </AnnotationsContainer>
  );
}
```

## API Examples

### Create Annotation

```typescript
const response = await fetch('/api/annotations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 'doc-123',
    pageNumber: 5,
    selectedText: 'Important text',
    mediaType: 'AUDIO',
    mediaUrl: 'https://example.com/audio.mp3',
    mediaSource: 'external',
    description: 'Explanation'
  })
});
```

### Get Annotations

```typescript
const response = await fetch(
  '/api/annotations?documentId=doc-123&pageNumber=5'
);
const data = await response.json();
```

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Deployment

### Production Deployment

```bash
# Run deployment script
npm run deploy:flipbook

# Or manual deployment
vercel --prod
```

### Rollback

```bash
# Rollback deployment
npm run rollback:flipbook

# Or manual rollback
vercel rollback
```

## Performance

### Metrics

- Page load time: < 2 seconds
- Annotation loading: < 1 second
- Page conversion: < 5 seconds per document
- 60 FPS animations

### Optimization

- Lazy loading for pages and annotations
- Image optimization (WebP with fallbacks)
- CDN caching
- Connection pooling
- Redis caching (optional)

## Security

### DRM Protection

- Watermarks on all pages
- Right-click prevention
- Screenshot detection
- Keyboard shortcut blocking
- DevTools detection

### Access Control

- Role-based permissions
- Document-level access
- Annotation visibility (public/private)
- Secure media streaming
- Row-level security (RLS)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Chrome Mobile 90+

## Contributing

### Development Workflow

1. Create feature branch
2. Make changes
3. Write tests
4. Run linting: `npm run lint`
5. Run tests: `npm test`
6. Submit pull request

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits

## Troubleshooting

### Common Issues

**Pages not loading**
- Check internet connection
- Verify document conversion completed
- Check browser console for errors

**Annotations not appearing**
- Verify user permissions
- Check annotation visibility settings
- Ensure correct page number

**Media won't play**
- Verify media URL is accessible
- Check file format support
- Test in different browser

See [User Guide](./USER_GUIDE.md#troubleshooting) for more solutions.

## Support

- Email: support@jstudyroom.com
- Documentation: /docs
- Status Page: /status
- GitHub Issues: /issues

## License

Proprietary - All rights reserved

## Changelog

### Version 1.0.0 (December 1, 2024)

**Features**:
- 3D flipbook viewer with animations
- Audio/video annotations
- DRM protection
- Role-based permissions
- Responsive design
- Error handling and fallbacks
- Performance optimizations

**Components**:
- 26+ React components
- 6 API endpoints
- 105+ unit tests
- 25+ integration tests
- 30+ E2E tests
- 200+ security tests

**Documentation**:
- User guide
- API documentation
- Component documentation
- Database schema
- Architecture guide
- Deployment guide

## Acknowledgments

- [@stpageflip/react-pageflip](https://github.com/Nodlik/StPageFlip) - Flipbook library
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Supabase](https://supabase.com/) - Backend platform
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

**Last Updated**: December 1, 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
