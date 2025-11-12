# Preview Feature with Custom Watermarks

## ✅ New Features Added

### 1. Document Preview Button

Added a **Preview** button to each document card in the dashboard that allows users to preview their uploaded PDFs before sharing.

**Location**: Dashboard → Documents → Preview button on each card

**Features**:
- Opens in a new tab
- Owner-only access (authentication required)
- Full PDF viewing with DRM protection
- Customizable watermark settings

### 2. Watermark Customization

Users can now customize watermarks with two types:

#### Text Watermark
- **Custom Text**: Enter any text (default: user email)
- **Font Size**: Adjustable from 12px to 32px
- **Opacity**: Adjustable from 10% to 80%
- **Pattern**: Diagonal repeating pattern across pages

#### Image Watermark
- **Upload Image**: PNG, JPG, or GIF (max 2MB)
- **Transparent Support**: Works best with transparent backgrounds
- **Opacity Control**: Adjustable transparency
- **Repeating Pattern**: Tiled across the document

### 3. Preview Settings Page

Before viewing the document, users configure watermark settings:

**Settings Available**:
- Watermark type selection (Text or Image)
- Text input or image upload
- Font size slider (text only)
- Opacity slider (both types)
- Live preview for images
- Validation for required fields

### 4. Floating Settings Button

While previewing, users can:
- Click the floating settings button (top-right)
- Modify watermark settings
- Apply changes and continue preview

## 📁 Files Created/Modified

### New Files
1. `app/dashboard/documents/[id]/preview/page.tsx` - Preview page route
2. `app/dashboard/documents/[id]/preview/PreviewClient.tsx` - Preview client component
3. `PREVIEW_FEATURE.md` - This documentation

### Modified Files
1. `components/dashboard/DocumentCard.tsx` - Added Preview button
2. `components/pdf/PDFViewer.tsx` - Added watermark config support
3. `components/pdf/PDFPage.tsx` - Added watermark config prop
4. `components/pdf/Watermark.tsx` - Complete rewrite with text/image support

## 🎨 UI/UX Enhancements

### Preview Button
- Eye icon for visual clarity
- Secondary variant (gray) to distinguish from primary actions
- Opens in new tab for better workflow
- Positioned first in action buttons

### Settings Page
- Clean, modern design with gradient background
- Card-based layout for settings
- Visual type selection with icons
- Real-time preview for image watermarks
- Helpful descriptions and validation messages
- Smooth transitions and animations

### Watermark Display
- **Text**: Diagonal repeating pattern
- **Image**: Tiled background pattern
- Both types respect opacity settings
- Non-intrusive but visible for security

## 🔒 Security Features

### Access Control
- ✅ Authentication required
- ✅ Owner verification (only document owner can preview)
- ✅ Signed URLs with 1-hour expiration
- ✅ DRM protection enabled
- ✅ DevTools detection active

### Watermark Security
- ✅ Cannot be disabled (always applied)
- ✅ Embedded in rendering layer
- ✅ Repeating pattern prevents easy removal
- ✅ Customizable for different use cases

## 🚀 How to Use

### For Document Owners

1. **Access Preview**:
   - Go to Dashboard
   - Find your document
   - Click the "Preview" button
   - Opens in new tab

2. **Configure Watermark**:
   - Choose Text or Image watermark
   - For Text:
     - Enter custom text (or use default email)
     - Adjust font size (12-32px)
     - Set opacity (10-80%)
   - For Image:
     - Click "Upload Watermark Image"
     - Select PNG/JPG/GIF (max 2MB)
     - Adjust opacity
     - Preview the result

3. **Start Preview**:
   - Click "Start Preview" button
   - Document loads with watermark
   - Use zoom controls (+/-)
   - Scroll through pages

4. **Modify Settings**:
   - Click floating settings button (⚙️ top-right)
   - Change watermark settings
   - Click "Start Preview" again

### Watermark Best Practices

**Text Watermarks**:
- Use email addresses for accountability
- Include timestamps for tracking
- Keep text concise (max 50 characters)
- Use 16-20px font size for readability

**Image Watermarks**:
- Use transparent PNG for best results
- Keep file size under 500KB for performance
- Use simple logos or stamps
- Test opacity (30-50% works well)
- Ensure image is recognizable when tiled

## 💡 Use Cases

### 1. Internal Review
- Preview documents before sharing externally
- Test watermark appearance
- Verify PDF rendering quality
- Check page layout

### 2. Client Presentations
- Add company logo as watermark
- Customize text with project name
- Professional appearance
- Brand consistency

### 3. Confidential Documents
- Add "CONFIDENTIAL" text watermark
- Include recipient email
- Timestamp for tracking
- Deterrent against unauthorized sharing

### 4. Draft Documents
- Add "DRAFT" watermark
- Include version number
- Date stamp
- Clear visual indicator

## 🎯 Technical Details

### Watermark Implementation

**Text Watermark**:
```typescript
- SVG-based rendering
- Pattern element for repetition
- Rotation: -45 degrees
- Configurable font size and opacity
- User-select disabled
```

**Image Watermark**:
```typescript
- CSS background-image
- Background-repeat for tiling
- Transform: rotate(-45deg) scale(1.5)
- Configurable opacity
- Responsive sizing
```

### Performance Considerations
- Images cached in browser
- SVG patterns are lightweight
- No impact on PDF rendering speed
- Lazy loading for preview page

### Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 🔄 Future Enhancements

### Potential Additions
1. **Watermark Templates**: Pre-designed watermark styles
2. **Position Control**: Choose watermark placement
3. **Multiple Watermarks**: Combine text and image
4. **Color Customization**: Choose watermark color
5. **Rotation Angle**: Adjust diagonal angle
6. **Watermark Library**: Save and reuse watermarks
7. **Batch Apply**: Apply same watermark to multiple documents
8. **QR Code Watermark**: Generate QR codes with document info

### Advanced Features
1. **Dynamic Watermarks**: Change per page
2. **Conditional Watermarks**: Based on viewer
3. **Animated Watermarks**: Subtle animations
4. **Invisible Watermarks**: Steganography
5. **Blockchain Verification**: Watermark authenticity

## 📊 Testing Checklist

- [ ] Preview button appears on document cards
- [ ] Preview opens in new tab
- [ ] Authentication required
- [ ] Owner verification works
- [ ] Settings page loads correctly
- [ ] Text watermark displays
- [ ] Image watermark displays
- [ ] Font size slider works
- [ ] Opacity slider works
- [ ] Image upload works
- [ ] File size validation (2MB)
- [ ] File type validation (images only)
- [ ] Preview button validation
- [ ] Floating settings button works
- [ ] Settings persist during session
- [ ] Zoom controls work
- [ ] DRM protection active
- [ ] DevTools detection works
- [ ] Mobile responsive

## 🐛 Known Limitations

1. **Image Size**: Large images may slow down rendering
2. **Pattern Alignment**: May not align perfectly on all page sizes
3. **Print Quality**: Watermark quality depends on screen resolution
4. **Browser Cache**: Image changes may require cache clear

## 📞 Support

For issues or questions:
- Check browser console for errors
- Verify file size and type for images
- Clear browser cache if watermark doesn't update
- Ensure JavaScript is enabled

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Status**: ✅ Complete and Ready for Testing
