# Task 16.1 Complete: Deploy with Feature Flag

## Summary

Implemented a comprehensive feature flag system for PDF.js viewer deployment with monitoring capabilities.

## Implementation Details

### 1. Feature Flag System (`lib/feature-flags.ts`)

Created a centralized feature flag module that supports:

- **Global Enable/Disable**: Environment variable `NEXT_PUBLIC_ENABLE_PDFJS`
- **Percentage-based Rollout**: `NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE` (0-100)
- **Test User Allowlist**: `NEXT_PUBLIC_PDFJS_TEST_USER_IDS` and `NEXT_PUBLIC_PDFJS_TEST_EMAILS`
- **Deterministic Hash-based Rollout**: Same user always gets same experience
- **URL Override**: `?usePDFJS=true/false` for testing

Key features:
- Deterministic rollout using user ID hash (djb2 algorithm)
- Test users always see the feature regardless of rollout percentage
- URL parameters can override for testing purposes
- Extensible for future feature flags

### 2. Integration with View Page

Updated `app/dashboard/documents/[id]/view/page.tsx`:

- Imports `shouldUsePDFJS` from feature flags module
- Checks feature flag before enabling PDF.js
- Respects URL parameter overrides for testing
- Passes `usePDFJS` flag to client component

Logic flow:
1. Check URL parameter for explicit override
2. If no override, use feature flag system
3. Feature flag checks: test users → rollout percentage → global enable

### 3. Monitoring System (`lib/monitoring/pdfjs-analytics.ts`)

Created analytics module to track:

- **Load Events**: Load time, page count, file size, fallback usage
- **Error Events**: Error type, message, stack trace, fallback usage
- **Performance Events**: Render time, memory usage, scroll performance
- **User Feedback**: Ratings, comments, issue types

Functions:
- `trackPDFJSLoad()`: Track successful PDF loads
- `trackPDFJSError()`: Track errors
- `trackPDFJSPerformance()`: Track performance metrics
- `trackPDFJSFeedback()`: Track user feedback
- `getPDFJSErrorRate()`: Get error rate for monitoring
- `getPDFJSUsageStats()`: Get comprehensive usage statistics

### 4. Analytics API (`app/api/admin/analytics/pdfjs/route.ts`)

Created admin API endpoint for monitoring:

- **GET**: Retrieve usage statistics (admin only)
  - Query param: `hours` (default 24)
  - Returns: total loads, errors, error rate, avg load time, fallback rate
  
- **POST**: Track PDF.js events
  - Body: `{ eventType, documentId, metadata }`
  - Authenticated users only

### 5. Environment Variables

Updated `.env.example` with comprehensive documentation:

```bash
# Enable PDF.js viewer
NEXT_PUBLIC_ENABLE_PDFJS="false"

# Gradual rollout percentage (0-100)
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""

# Test user IDs (comma-separated)
NEXT_PUBLIC_PDFJS_TEST_USER_IDS=""

# Test user emails (comma-separated)
NEXT_PUBLIC_PDFJS_TEST_EMAILS=""
```

### 6. Deployment Guide

Created comprehensive deployment guide at `.kiro/specs/pdf-iframe-blocking-fix/DEPLOYMENT_GUIDE.md`:

- **4-Phase Rollout Strategy**:
  - Phase 1: Test users only (Week 1)
  - Phase 2: 10% rollout (Week 2)
  - Phase 3: 50% rollout (Week 3)
  - Phase 4: 100% rollout (Week 4)

- **Monitoring Guidelines**:
  - Key metrics to track
  - Alert conditions
  - Monitoring tools

- **Rollback Plan**:
  - Quick rollback via environment variables
  - Partial rollback by reducing percentage
  - Emergency code-level rollback

- **Testing Checklist**: 11-point verification list
- **User Communication**: Templates for announcements and support
- **Troubleshooting**: Common issues and solutions

## Testing

The feature flag system can be tested:

1. **Test User Access**:
   ```bash
   NEXT_PUBLIC_ENABLE_PDFJS="true"
   NEXT_PUBLIC_PDFJS_TEST_EMAILS="test@example.com"
   ```
   - User with test@example.com always sees PDF.js
   - Other users see iframe

2. **Percentage Rollout**:
   ```bash
   NEXT_PUBLIC_ENABLE_PDFJS="true"
   NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="50"
   ```
   - ~50% of users see PDF.js (deterministic by user ID)
   - Same user always gets same experience

3. **URL Override**:
   - Add `?usePDFJS=true` to force enable
   - Add `?usePDFJS=false` to force disable
   - Useful for testing and debugging

## Monitoring

To monitor PDF.js deployment:

1. **Check Analytics API**:
   ```bash
   curl https://your-domain.com/api/admin/analytics/pdfjs?hours=24
   ```

2. **View Server Logs**:
   ```bash
   grep "PDF.js" /var/log/app.log
   ```

3. **Track Error Rate**:
   - Target: < 1%
   - Alert if > 2%

## Rollback

If issues occur:

1. **Disable Immediately**:
   ```bash
   NEXT_PUBLIC_ENABLE_PDFJS="false"
   ```

2. **Reduce Rollout**:
   ```bash
   NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="10"
   ```

3. **Emergency Code Rollback**:
   Edit `lib/feature-flags.ts` and set `enabled: false`

## Files Created/Modified

### Created:
- `lib/feature-flags.ts` - Feature flag system
- `lib/monitoring/pdfjs-analytics.ts` - Analytics tracking
- `app/api/admin/analytics/pdfjs/route.ts` - Analytics API
- `.kiro/specs/pdf-iframe-blocking-fix/DEPLOYMENT_GUIDE.md` - Deployment guide
- `.kiro/specs/pdf-iframe-blocking-fix/TASK_16.1_COMPLETE.md` - This file

### Modified:
- `.env.example` - Added PDF.js feature flag documentation
- `app/dashboard/documents/[id]/view/page.tsx` - Integrated feature flags

## Requirements Validated

✅ Enable PDF.js for test users
✅ Monitor error rates (analytics system)
✅ Gather user feedback (feedback tracking)
✅ Track performance metrics (performance tracking)
✅ Requirements: All

## Next Steps

Proceed to Task 16.2: Gradual rollout
- Implement 10% → 50% → 100% rollout schedule
- Monitor metrics at each phase
- Adjust based on feedback and performance
