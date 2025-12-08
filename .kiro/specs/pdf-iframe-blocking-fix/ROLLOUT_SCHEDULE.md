# PDF.js Viewer Gradual Rollout Schedule

This document tracks the gradual rollout of the PDF.js viewer feature.

## Rollout Phases

### Phase 1: Test Users Only ✅ READY

**Timeline**: Week 1 (Days 1-7)

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""
NEXT_PUBLIC_PDFJS_TEST_EMAILS="admin@jstudyroom.dev,sivaramj83@gmail.com"
```

**Target Users**: 
- Admin users only
- ~2-5 users

**Goals**:
- Validate PDF.js works with production data
- Test all features (watermarks, DRM, navigation)
- Identify any critical bugs
- Gather initial feedback

**Success Criteria**:
- [ ] Zero browser blocking errors
- [ ] All features working correctly
- [ ] No critical bugs found
- [ ] Positive feedback from test users
- [ ] Error rate: 0%

**Monitoring**:
- Check server logs daily
- Review browser console errors
- Collect user feedback
- Monitor load times

**Actions**:
1. Deploy configuration to production
2. Notify test users
3. Ask test users to test various PDFs
4. Monitor for 7 days
5. Document any issues
6. Fix critical issues before proceeding

---

### Phase 2: 10% Rollout ⏳ PENDING

**Timeline**: Week 2 (Days 8-14)

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="10"
NEXT_PUBLIC_PDFJS_TEST_EMAILS="admin@jstudyroom.dev"
```

**Target Users**: 
- 10% of all users (deterministic by user ID)
- Plus admin users

**Goals**:
- Validate at scale with real users
- Monitor error rates and performance
- Identify browser-specific issues
- Gather broader user feedback

**Success Criteria**:
- [ ] Error rate < 1%
- [ ] Average load time < 2 seconds
- [ ] No increase in support tickets
- [ ] Works on all major browsers
- [ ] Positive user feedback

**Monitoring**:
- Check analytics dashboard daily
- Monitor error rate trends
- Review support tickets
- Track performance metrics
- Compare PDF.js vs iframe users

**Actions**:
1. Update environment variables
2. Deploy to production
3. Monitor for 48 hours intensively
4. Check analytics at 24h, 48h, 7d marks
5. Address any issues promptly
6. Gather user feedback via support

**Rollback Triggers**:
- Error rate > 2%
- Critical browser compatibility issue
- Significant performance degradation
- Multiple user complaints

---

### Phase 3: 50% Rollout ⏳ PENDING

**Timeline**: Week 3 (Days 15-21)

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="50"
```

**Target Users**: 
- 50% of all users (deterministic by user ID)

**Goals**:
- Expand to half of user base
- Validate stability at larger scale
- Compare metrics between groups
- Prepare for full rollout

**Success Criteria**:
- [ ] Error rate remains < 1%
- [ ] Performance metrics stable or improved
- [ ] No significant increase in server load
- [ ] User satisfaction maintained
- [ ] All browsers working correctly

**Monitoring**:
- Daily analytics review
- Weekly performance reports
- A/B comparison: PDF.js vs iframe
- Server resource monitoring
- User satisfaction surveys

**Actions**:
1. Update environment variables
2. Deploy to production
3. Monitor for 1 week
4. Generate comparison reports
5. Optimize based on findings
6. Prepare for 100% rollout

**Rollback Triggers**:
- Error rate > 1.5%
- Performance degradation
- Server resource issues
- Negative user feedback trend

---

### Phase 4: 100% Rollout ⏳ PENDING

**Timeline**: Week 4 (Days 22-28)

**Configuration**:
```bash
NEXT_PUBLIC_ENABLE_PDFJS="true"
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""
# or
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="100"
```

**Target Users**: 
- All users (100%)

**Goals**:
- Enable for entire user base
- Ensure stability at full scale
- Prepare for iframe removal
- Finalize deployment

**Success Criteria**:
- [ ] Error rate < 1% for 7 days
- [ ] All metrics stable
- [ ] No critical issues
- [ ] User satisfaction maintained
- [ ] Ready to remove iframe code

**Monitoring**:
- Continuous monitoring for 1 week
- Daily metrics review
- Support ticket tracking
- Performance monitoring
- User feedback collection

**Actions**:
1. Update environment variables
2. Deploy to production
3. Monitor intensively for 48 hours
4. Continue monitoring for 1 week
5. Document final metrics
6. Prepare for iframe removal (Task 16.3)

**Rollback Triggers**:
- Error rate > 1%
- Critical bug affecting many users
- Significant performance issues
- Major browser compatibility problem

---

## Rollout Decision Matrix

| Metric | Phase 1 Target | Phase 2 Target | Phase 3 Target | Phase 4 Target |
|--------|---------------|---------------|---------------|---------------|
| Error Rate | 0% | < 1% | < 1% | < 1% |
| Load Time | < 2s | < 2s | < 2s | < 2s |
| User Satisfaction | 100% | > 80% | > 80% | > 80% |
| Browser Support | All | All | All | All |
| Support Tickets | 0 | No increase | No increase | No increase |

## Monitoring Checklist

Daily checks during rollout:

- [ ] Check error rate in analytics dashboard
- [ ] Review server logs for PDF.js errors
- [ ] Check support tickets for PDF-related issues
- [ ] Monitor average load time
- [ ] Review browser-specific errors
- [ ] Check memory usage trends
- [ ] Verify watermarks working
- [ ] Verify DRM protections working

Weekly checks:

- [ ] Generate performance report
- [ ] Analyze user feedback
- [ ] Compare PDF.js vs iframe metrics (Phases 2-3)
- [ ] Review and update rollout plan
- [ ] Document lessons learned

## Communication Plan

### Phase 1 (Test Users)
- Direct email to test users
- Request specific feedback
- Provide direct support channel

### Phase 2 (10%)
- No announcement (silent rollout)
- Monitor support tickets
- Respond to issues promptly

### Phase 3 (50%)
- Optional: Brief announcement
- Update help documentation
- Prepare support team

### Phase 4 (100%)
- Announcement: "Improved PDF Viewer"
- Update all documentation
- Celebrate successful rollout

## Rollback Procedures

### Quick Rollback (Environment Variable)

```bash
# Disable completely
NEXT_PUBLIC_ENABLE_PDFJS="false"

# Or reduce percentage
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="10"
```

Then deploy:
```bash
npm run build
vercel --prod
```

### Emergency Rollback (Code)

If environment variables fail:

1. Edit `lib/feature-flags.ts`:
   ```typescript
   [FeatureFlagKey.PDFJS_VIEWER]: {
     enabled: false, // Force disable
     // ...
   }
   ```

2. Commit and deploy immediately

### Partial Rollback (Specific Users)

If issues affect specific users:

```bash
# Remove from test users
NEXT_PUBLIC_PDFJS_TEST_EMAILS="admin@jstudyroom.dev"
# Reduce percentage
NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="5"
```

## Success Metrics

Final success criteria for completing rollout:

- [ ] All 4 phases completed successfully
- [ ] Error rate < 1% for 14 consecutive days
- [ ] Average load time < 2 seconds
- [ ] User satisfaction > 80%
- [ ] Zero browser blocking errors
- [ ] All features working correctly
- [ ] No increase in support tickets
- [ ] Performance metrics stable or improved
- [ ] Ready to proceed with iframe removal

## Timeline Summary

| Phase | Duration | Users | Start Date | End Date | Status |
|-------|----------|-------|------------|----------|--------|
| Phase 1 | 7 days | Test users | TBD | TBD | ⏳ Pending |
| Phase 2 | 7 days | 10% | TBD | TBD | ⏳ Pending |
| Phase 3 | 7 days | 50% | TBD | TBD | ⏳ Pending |
| Phase 4 | 7 days | 100% | TBD | TBD | ⏳ Pending |
| **Total** | **28 days** | | | | |

## Notes

- Each phase requires explicit approval before proceeding
- Rollback can occur at any time if issues arise
- Timeline can be adjusted based on findings
- Additional phases can be added if needed (e.g., 25%, 75%)
- Success criteria must be met before advancing

## Approval Sign-offs

### Phase 1 → Phase 2
- [ ] All Phase 1 success criteria met
- [ ] No critical issues found
- [ ] Approved by: _________________ Date: _______

### Phase 2 → Phase 3
- [ ] All Phase 2 success criteria met
- [ ] Error rate < 1% for 7 days
- [ ] Approved by: _________________ Date: _______

### Phase 3 → Phase 4
- [ ] All Phase 3 success criteria met
- [ ] Metrics stable at 50% rollout
- [ ] Approved by: _________________ Date: _______

### Phase 4 → Iframe Removal
- [ ] All Phase 4 success criteria met
- [ ] 100% rollout stable for 14 days
- [ ] Approved by: _________________ Date: _______
