# URL Parameter Testing Guide

This guide provides test URLs for manually verifying URL parameter parsing in the preview viewer.

## Test Scenarios

### Scenario 1: No Parameters (Default State)
**Expected:** No watermark should appear
```
/dashboard/documents/[document-id]/view
```

**Verification:**
- [ ] No watermark visible
- [ ] Content displays properly
- [ ] Console shows: `enableWatermark: false`

---

### Scenario 2: Watermark Explicitly Disabled
**Expected:** No watermark should appear
```
/dashboard/documents/[document-id]/view?watermark=false
```

**Verification:**
- [ ] No watermark visible
- [ ] Content displays properly
- [ ] Console shows: `enableWatermark: false`

---

### Scenario 3: Watermark Enabled (Minimal)
**Expected:** Watermark appears with default settings
```
/dashboard/documents/[document-id]/view?watermark=true
```

**Verification:**
- [ ] Watermark visible
- [ ] Uses user email as text
- [ ] Opacity is 0.3 (default)
- [ ] Font size is 16 (default)
- [ ] Console shows: `enableWatermark: true`

---

### Scenario 4: Watermark with Custom Text
**Expected:** Watermark appears with custom text
```
/dashboard/documents/[document-id]/view?watermark=true&watermarkText=CONFIDENTIAL
```

**Verification:**
- [ ] Watermark shows "CONFIDENTIAL"
- [ ] Opacity is 0.3 (default)
- [ ] Font size is 16 (default)
- [ ] Console shows: `watermarkText: '***'` (masked)

---

### Scenario 5: Watermark with All Custom Settings
**Expected:** Watermark appears with all custom settings
```
/dashboard/documents/[document-id]/view?watermark=true&watermarkText=DRAFT&watermarkOpacity=0.5&watermarkSize=24
```

**Verification:**
- [ ] Watermark shows "DRAFT"
- [ ] Opacity is 0.5 (more visible)
- [ ] Font size is 24 (larger)
- [ ] Console shows all custom values

---

### Scenario 6: Invalid Watermark Parameter
**Expected:** No watermark (invalid values treated as false)
```
/dashboard/documents/[document-id]/view?watermark=yes
/dashboard/documents/[document-id]/view?watermark=1
/dashboard/documents/[document-id]/view?watermark=enabled
```

**Verification:**
- [ ] No watermark visible
- [ ] Console shows: `enableWatermark: false`

---

### Scenario 7: Watermark Disabled with Other Settings
**Expected:** No watermark (disabled overrides other settings)
```
/dashboard/documents/[document-id]/view?watermark=false&watermarkText=TEST&watermarkOpacity=0.8
```

**Verification:**
- [ ] No watermark visible
- [ ] Other settings ignored
- [ ] Console shows: `enableWatermark: false`

---

### Scenario 8: Empty Watermark Text
**Expected:** Watermark uses user email as fallback
```
/dashboard/documents/[document-id]/view?watermark=true&watermarkText=
```

**Verification:**
- [ ] Watermark shows user email
- [ ] Console shows fallback to email

---

### Scenario 9: Special Characters in Text
**Expected:** Watermark displays special characters correctly
```
/dashboard/documents/[document-id]/view?watermark=true&watermarkText=©%202024%20•%20Confidential™
```
(URL encoded: © 2024 • Confidential™)

**Verification:**
- [ ] Special characters display correctly
- [ ] No encoding issues

---

### Scenario 10: Extreme Opacity Values
**Expected:** System handles out-of-range values
```
/dashboard/documents/[document-id]/view?watermark=true&watermarkOpacity=-1
/dashboard/documents/[document-id]/view?watermark=true&watermarkOpacity=2
```

**Verification:**
- [ ] Watermark still renders
- [ ] Console shows parsed value
- [ ] No crashes or errors

---

### Scenario 11: Invalid Numeric Parameters
**Expected:** System handles invalid values gracefully
```
/dashboard/documents/[document-id]/view?watermark=true&watermarkOpacity=invalid&watermarkSize=large
```

**Verification:**
- [ ] Watermark still renders
- [ ] Falls back to defaults or shows NaN
- [ ] Console shows parsing warnings
- [ ] No crashes

---

### Scenario 12: Multiple Content Types

Test with different content types to ensure consistency:

**PDF:**
```
/dashboard/documents/[pdf-document-id]/view?watermark=true
```

**Image:**
```
/dashboard/documents/[image-document-id]/view?watermark=true
```

**Video:**
```
/dashboard/documents/[video-document-id]/view?watermark=true
```

**Link:**
```
/dashboard/documents/[link-document-id]/view?watermark=true
```

**Verification:**
- [ ] Watermark behavior consistent across all types
- [ ] Console logs show same parsing logic

---

## Console Logging Verification

When testing, open browser DevTools Console and verify these logs appear:

### Server-side (page.tsx):
```
[Preview URL Parameters] {
  rawWatermarkParam: 'true' | 'false' | undefined,
  enableWatermark: true | false,
  watermarkText: '***' | '(empty)',
  watermarkOpacity: number,
  watermarkSize: number,
  hasWatermarkImage: boolean,
  allParams: string[]
}
```

### Client-side (PreviewViewerClient.tsx):
```
[PreviewViewerClient] Watermark Settings: {
  enableWatermark: true | false,
  watermarkText: '***' | '(empty)',
  watermarkOpacity: number,
  watermarkSize: number,
  hasWatermarkImage: boolean,
  contentType: 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK'
}

[PreviewViewerClient] Final Watermark Config: {
  hasText: boolean,
  opacity: number,
  fontSize: number
} | 'disabled'
```

---

## Testing Checklist

- [ ] Test all scenarios listed above
- [ ] Verify console logs appear correctly
- [ ] Check watermark visibility matches expectations
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Verify no JavaScript errors in console
- [ ] Confirm content remains visible and readable
- [ ] Test with real documents of each content type

---

## Common Issues to Watch For

1. **Watermark appearing when it shouldn't**
   - Check if default parameter is set to `true` instead of `false`
   - Verify URL parameter parsing logic

2. **Watermark not appearing when it should**
   - Check if `enableWatermark` prop is being passed correctly
   - Verify watermark text is not empty

3. **Console logs not appearing**
   - Check if logging code was added correctly
   - Verify browser console is open and not filtered

4. **Inconsistent behavior across content types**
   - Check if each viewer component respects watermark settings
   - Verify props are passed correctly to each viewer

---

## Requirements Validated

- **Requirement 1.4:** WHEN watermark URL parameter is "true" THEN the system SHALL display the configured watermark
- **Requirement 4.5:** WHEN watermark settings are passed via URL THEN the system SHALL parse and apply them consistently across all content types
- **Requirement 5.3:** WHEN settings are invalid or missing THEN the system SHALL use safe defaults and log warnings

---

## Notes

- All URL parameters are case-sensitive
- Boolean values must be exactly "true" or "false" (lowercase)
- Numeric values are parsed with `parseFloat()` and `parseInt()`
- Invalid values result in NaN but don't crash the application
- Empty or missing parameters use safe defaults
- Console logging helps debug parameter parsing issues
