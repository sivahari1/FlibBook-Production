# Architecture Documentation

## System Overview

The Flipbook & Media Annotations system is built on a modern, scalable architecture using Next.js, React, and Prisma.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │    Mobile    │  │    Tablet    │     │
│  │   (Desktop)  │  │   (Safari)   │  │   (Chrome)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Next.js Application                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │   Pages    │  │    API     │  │ Components │    │  │
│  │  │  (Routes)  │  │  (Routes)  │  │   (React)  │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Annotation  │  │   Flipbook   │  │    Media     │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │   Supabase   │  │    Redis     │     │
│  │  (Database)  │  │  (Storage)   │  │   (Cache)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Architecture

```
components/
├── flipbook/
│   ├── FlipBookViewer.tsx          # Core viewer component
│   ├── FlipBookViewerWithDRM.tsx   # DRM wrapper
│   ├── FlipBookLoading.tsx         # Loading state
│   └── FlipBookError.tsx           # Error state
├── annotations/
│   ├── MediaAnnotationToolbar.tsx  # Selection toolbar
│   ├── MediaUploadModal.tsx        # Upload interface
│   ├── MediaPlayerModal.tsx        # Media playback
│   ├── AnnotationMarker.tsx        # Visual markers
│   ├── AnnotationMarkersLayer.tsx  # Marker container
│   └── AnnotationsContainer.tsx    # State management
├── fallback/
│   ├── FlipbookWithFallback.tsx    # Error recovery
│   └── StaticPDFViewer.tsx         # Fallback viewer
├── errors/
│   ├── FlipbookErrorBoundary.tsx   # Error boundary
│   └── ErrorToast.tsx              # Error notifications
└── performance/
    └── PerformanceMonitor.tsx      # Performance tracking
```

### Backend Architecture

```
app/api/
├── documents/
│   ├── convert/route.ts            # PDF conversion
│   ├── [id]/pages/route.ts         # Page retrieval
│   └── upload/route.ts             # Document upload
├── pages/
│   └── [docId]/[pageNum]/route.ts  # Single page
├── annotations/
│   ├── route.ts                    # List/Create
│   └── [id]/route.ts               # Get/Update/Delete
├── media/
│   ├── upload/route.ts             # Media upload
│   └── stream/[annotationId]/route.ts  # Media streaming
└── errors/
    └── report/route.ts             # Error reporting
```

---

## Data Flow

### Annotation Creation Flow

```
1. User selects text in flipbook
   │
   ▼
2. MediaAnnotationToolbar appears
   │
   ▼
3. User clicks "Add Audio" or "Add Video"
   │
   ▼
4. MediaUploadModal opens
   │
   ▼
5. User uploads file or enters URL
   │
   ▼
6. File uploaded to Supabase Storage
   │
   ▼
7. POST /api/annotations
   │
   ▼
8. Annotation saved to database
   │
   ▼
9. AnnotationMarker appears on page
   │
   ▼
10. User can click marker to play media
```

### Document Viewing Flow

```
1. User navigates to document
   │
   ▼
2. GET /api/documents/:id/pages
   │
   ▼
3. FlipBookViewer renders with pages
   │
   ▼
4. GET /api/annotations?documentId=:id&pageNumber=:page
   │
   ▼
5. AnnotationMarkersLayer renders markers
   │
   ▼
6. User interacts with flipbook
   │
   ▼
7. Page changes trigger annotation loading
```

---

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Flipbook**: @stpageflip/react-pageflip
- **State Management**: React Context + Hooks
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Fetch API

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Storage**: Supabase Storage
- **Cache**: Redis (optional)
- **PDF Processing**: pdf2pic + Sharp

### Infrastructure

- **Hosting**: Vercel
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
│                                                              │
│  User Request                                                │
│       │                                                      │
│       ▼                                                      │
│  Middleware (middleware.ts)                                  │
│       │                                                      │
│       ├─── Check Session Cookie                             │
│       │                                                      │
│       ├─── Verify JWT Token                                 │
│       │                                                      │
│       └─── Extract User Info                                │
│             │                                                │
│             ▼                                                │
│  API Route Handler                                           │
│       │                                                      │
│       ├─── Check User Role                                  │
│       │                                                      │
│       ├─── Verify Permissions                               │
│       │                                                      │
│       └─── Execute Request                                  │
└─────────────────────────────────────────────────────────────┘
```

### DRM Protection Layers

1. **Client-Side Protection**:
   - Watermark overlay
   - Right-click prevention
   - Keyboard shortcut blocking
   - Screenshot detection
   - DevTools detection

2. **Server-Side Protection**:
   - Signed URLs with expiration
   - Access token validation
   - Rate limiting
   - IP-based restrictions

3. **Storage Protection**:
   - Private buckets
   - Row-level security (RLS)
   - Encrypted at rest
   - Secure in transit (HTTPS)

---

## Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Cache Hierarchy                         │
│                                                              │
│  Browser Cache (Client)                                      │
│       │                                                      │
│       ├─── Static Assets (images, CSS, JS)                  │
│       ├─── API Responses (with Cache-Control)               │
│       └─── Page Images (7 days)                             │
│             │                                                │
│             ▼                                                │
│  CDN Cache (Edge)                                            │
│       │                                                      │
│       ├─── Static Assets (immutable)                        │
│       ├─── Page Images (public)                             │
│       └─── API Responses (short TTL)                        │
│             │                                                │
│             ▼                                                │
│  Application Cache (Redis)                                   │
│       │                                                      │
│       ├─── Annotation Data (1 hour)                         │
│       ├─── User Sessions (24 hours)                         │
│       └─── Document Metadata (1 day)                        │
│             │                                                │
│             ▼                                                │
│  Database (PostgreSQL)                                       │
│       │                                                      │
│       └─── Source of Truth                                  │
└─────────────────────────────────────────────────────────────┘
```

### Optimization Techniques

1. **Lazy Loading**: Load pages and annotations on demand
2. **Preloading**: Preload adjacent pages for smooth navigation
3. **Image Optimization**: WebP format with fallbacks
4. **Code Splitting**: Dynamic imports for heavy components
5. **Memoization**: React.memo for expensive components
6. **Debouncing**: Debounce user input and scroll events
7. **Virtual Scrolling**: For large annotation lists
8. **Connection Pooling**: Reuse database connections

---

## Scalability Architecture

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                             │
│                   (Vercel Edge)                              │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Instance   │    │   Instance   │    │   Instance   │
│      1       │    │      2       │    │      3       │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    ┌──────────────┐
                    │   Database   │
                    │  (Supabase)  │
                    └──────────────┘
```

### Database Scaling

1. **Read Replicas**: For read-heavy workloads
2. **Connection Pooling**: PgBouncer for connection management
3. **Partitioning**: Partition annotations by document or date
4. **Indexing**: Optimize queries with proper indexes
5. **Archiving**: Move old data to cold storage

---

## Monitoring & Observability

### Metrics to Track

1. **Application Metrics**:
   - Request rate
   - Response time
   - Error rate
   - Success rate

2. **Business Metrics**:
   - Annotations created
   - Media uploads
   - Document views
   - User engagement

3. **Infrastructure Metrics**:
   - CPU usage
   - Memory usage
   - Database connections
   - Storage usage

4. **Performance Metrics**:
   - Page load time
   - Time to interactive
   - First contentful paint
   - Largest contentful paint

### Logging Strategy

```typescript
// Structured logging
logger.info('Annotation created', {
  annotationId: 'ann-123',
  documentId: 'doc-123',
  userId: 'user-123',
  mediaType: 'AUDIO',
  duration: 125
});

// Error logging
logger.error('Media upload failed', {
  error: error.message,
  stack: error.stack,
  userId: 'user-123',
  fileSize: 5242880
});
```

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                      Vercel Platform                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Next.js Application                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │    │
│  │  │   Edge   │  │ Serverless│  │  Static  │        │    │
│  │  │ Functions│  │ Functions │  │  Assets  │        │    │
│  │  └──────────┘  └──────────┘  └──────────┘        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Supabase   │    │   Supabase   │    │    Redis     │
│  PostgreSQL  │    │   Storage    │    │    Cloud     │
└──────────────┘    └──────────────┘    └──────────────┘
```

### CI/CD Pipeline

```
1. Code Push to GitHub
   │
   ▼
2. GitHub Actions Triggered
   │
   ├─── Run Tests
   ├─── Run Linting
   ├─── Type Checking
   └─── Build Application
        │
        ▼
3. Deploy to Vercel
   │
   ├─── Preview Deployment (PR)
   └─── Production Deployment (main)
        │
        ▼
4. Run Database Migrations
   │
   ▼
5. Smoke Tests
   │
   ▼
6. Deployment Complete
```

---

## Disaster Recovery

### Backup Strategy

1. **Database Backups**:
   - Automated daily backups
   - Point-in-time recovery
   - 30-day retention

2. **Storage Backups**:
   - Replicated across regions
   - Versioning enabled
   - 90-day retention

3. **Configuration Backups**:
   - Environment variables in secure vault
   - Infrastructure as code (IaC)
   - Version controlled

### Recovery Procedures

1. **Database Recovery**:
   ```bash
   # Restore from backup
   psql -h localhost -U postgres -d jstudyroom < backup.sql
   ```

2. **Storage Recovery**:
   - Restore from Supabase backup
   - Verify file integrity
   - Update database references

3. **Application Recovery**:
   - Rollback to previous deployment
   - Verify functionality
   - Monitor error rates

---

## Future Architecture Considerations

### Planned Enhancements

1. **Microservices**: Split into separate services
2. **Event-Driven**: Use message queues for async processing
3. **GraphQL**: Add GraphQL API alongside REST
4. **Real-Time**: WebSocket support for live collaboration
5. **AI/ML**: Automatic annotation suggestions
6. **Multi-Region**: Deploy across multiple regions
7. **Kubernetes**: Container orchestration for better scaling

---

Last Updated: December 1, 2024
