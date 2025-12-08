# PDF.js Viewer Deployment Guide

This guide covers the deployment and gradual rollout of the PDF.js viewer feature.

## Overview

The PDF.js viewer replaces iframe-based PDF rendering to avoid browser blocking issues. The deployment uses a feature flag system for safe, gradual rollout.

## Feature Flag System

### Environment Variables

Add these to your `.env` file:

```bash
# Enable PDF.js viewer globally
NEXT_PUBLIC_ENABLE_PDFJS="true"

# Gradual rollout percentage (0-100)
# Leave empty for 100% rollout
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="10"

# Test users (always see PDF.js)
NEXT_PUBLIC_PDFJS_TEST_USER_IDS="user-id-1,user-id-2"
NEXT_PUBLIC_PDFJS_TEST_EMAILS="test@example.com"
```

### Rollout Strategy

The feature flag system supports:

1. **Global Enable/Disable**: `NEXT_PUBLIC_ENABLE_PDFJS`
2. **Percentage-based Rollout**: `NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE`
3. **Test User Allowlist**: `NEXT_PUBLIC_PDFJS_TEST_USER_IDS` and `NEXT_PUBLIC_PDFJS_TEST_EMAILS`
4. **URL Override**: Add `?usePDFJS=true` or `?usePDFJS=false` to any view URL for testing

## Deployment Phases

### Phase 1: Test Users Only (Week 1)

**Goal**: Validate PDF.js works correctly with real data

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""
NEXT_PUBLIC_PDFJS_TEST_EMAILS="admin@example.com,tester1@example.com"
```

**Actions**:
1. Deploy to production
2. Test users access documents and verify:
   - PDFs load without blocking errors
   - Watermarks display correctly
   - DRM protections work
   - Navigation controls function
   - Performance is acceptable
3. Monitor error logs for PDF.js errors
4. Gather feedback from test users

**Success Criteria**:
- Zero blocking errors
- No critical bugs reported
- Test users confirm improved experience

### Phase 2: 10% Rollout (Week 2)

**Goal**: Validate at scale with real users

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="10"
NEXT_PUBLIC_PDFJS_TEST_EMAILS="admin@example.com"
```

**Actions**:
1. Update environment variables
2. Deploy to production
3. Monitor for 48 hours:
   - Error rate (target: < 1%)
   - Load time (target: < 2s)
   - User feedback
   - Browser compatibility issues
4. Check analytics dashboard

**Success Criteria**:
- Error rate < 1%
- No increase in support tickets
- Positive user feedback
- All browsers working correctly

### Phase 3: 50% Rollout (Week 3)

**Goal**: Expand to half of users

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="50"
```

**Actions**:
1. Update environment variables
2. Deploy to production
3. Monitor for 1 week:
   - Error rate trends
   - Performance metrics
   - User satisfaction
   - Server load
4. Compare metrics between PDF.js and iframe users

**Success Criteria**:
- Error rate remains < 1%
- Performance metrics stable or improved
- No significant increase in server load
- User satisfaction maintained or improved

### Phase 4: 100% Rollout (Week 4)

**Goal**: Enable for all users

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""
```

**Actions**:
1. Update environment variables
2. Deploy to production
3. Monitor for 1 week
4. Prepare for iframe fallback removal

**Success Criteria**:
- All metrics stable
- No critical issues
- Ready to remove iframe code

## Monitoring

### Key Metrics

Monitor these metrics during rollout:

1. **Error Rate**
   - Target: < 1%
   - Alert threshold: > 2%
   - Check: `/api/analytics/pdfjs/errors`

2. **Load Time**
   - Target: < 2 seconds
   - Alert threshold: > 5 seconds
   - Check: Browser DevTools, Analytics

3. **User Feedback**
   - Target: > 80% positive
   - Check: Support tickets, feedback forms

4. **Browser Compatibility**
   - Target: Works on Chrome, Firefox, Safari, Edge
   - Check: Browser-specific error logs

### Monitoring Tools

1. **Server Logs**: Check for PDF.js errors
   ```bash
   grep "PDF.js Error" /var/log/app.log
   ```

2. **Analytics Dashboard**: View usage statistics
   - Navigate to `/admin/analytics/pdfjs`
   - Review error rates, load times, user feedback

3. **Browser Console**: Check client-side errors
   - Open DevTools → Console
   - Look for PDF.js warnings/errors

### Alert Conditions

Set up alerts for:

1. **High Error Rate**: > 2% of PDF loads fail
2. **Slow Performance**: Average load time > 5s
3. **Browser Issues**: Errors specific to one browser
4. **Memory Leaks**: Increasing memory usage over time

## Rollback Plan

If critical issues occur:

### Quick Rollback (Disable Feature)

```bash
# Disable PDF.js immediately
NEXT_PUBLIC_ENABLE_PDFJS="false"
```

Then deploy:
```bash
npm run build
# Deploy to production
```

### Partial Rollback (Reduce Percentage)

```bash
# Reduce to 10% or test users only
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="10"
```

### Emergency Rollback (Code Level)

If environment variables don't work:

1. Edit `lib/feature-flags.ts`:
   ```typescript
   enabled: false, // Force disable
   ```

2. Deploy immediately

## Testing Checklist

Before each phase, verify:

- [ ] PDFs load without blocking errors
- [ ] Watermarks display correctly
- [ ] DRM protections work (no right-click, print, save)
- [ ] Navigation controls function (arrows, page input, zoom)
- [ ] Keyboard shortcuts work
- [ ] Touch gestures work on mobile
- [ ] Performance is acceptable (< 2s load time)
- [ ] Memory usage is reasonable
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Error handling displays user-friendly messages
- [ ] Fallback to iframe works if PDF.js fails

## User Communication

### Announcement Template

**Subject**: Improved PDF Viewer Experience

**Body**:
We've upgraded our PDF viewer to provide a better, more reliable experience. You may notice:

- Faster PDF loading
- Smoother scrolling and zooming
- Better compatibility across browsers
- No more "blocked by browser" errors

If you experience any issues, please contact support.

### Support Response Template

**Issue**: User reports PDF not loading

**Response**:
We're currently rolling out an improved PDF viewer. If you're experiencing issues:

1. Try refreshing the page
2. Clear your browser cache
3. Try a different browser
4. Contact us with details: browser, document ID, error message

We can temporarily disable the new viewer for your account if needed.

## Post-Deployment

After 100% rollout is stable for 2 weeks:

1. Remove iframe fallback code (Task 16.3)
2. Clean up feature flag system
3. Update documentation
4. Archive deployment guide

## Troubleshooting

### Common Issues

**Issue**: PDF.js not loading
- Check: `NEXT_PUBLIC_ENABLE_PDFJS` is set to "true"
- Check: Browser console for errors
- Check: Network tab for failed requests

**Issue**: High error rate
- Check: Server logs for specific errors
- Check: Browser compatibility
- Consider: Reducing rollout percentage

**Issue**: Slow performance
- Check: PDF file sizes
- Check: Network conditions
- Check: Server resources
- Consider: Implementing caching

**Issue**: Watermarks not showing
- Check: Watermark settings in database
- Check: CSS z-index conflicts
- Check: Browser console for errors

## Support

For issues during deployment:

1. Check this guide first
2. Review server logs
3. Check analytics dashboard
4. Contact development team
5. Consider rollback if critical

## Success Metrics

Final success criteria for full deployment:

- [ ] Error rate < 1% for 2 weeks
- [ ] Average load time < 2 seconds
- [ ] User satisfaction > 80%
- [ ] Zero browser blocking errors
- [ ] All features working correctly
- [ ] No increase in support tickets
- [ ] Ready to remove iframe fallback
