# Design Document

## Overview

This design addresses the issue where users cannot upload free content (₹0.00) to the bookshop due to incorrect validation logic in both frontend and backend components. The fix involves updating validation rules to allow zero-price items while maintaining security and data integrity.

## Architecture

The fix involves three main components:
1. **Frontend Validation** - EnhancedUploadModal component validation logic
2. **Backend Validation** - Upload API route validation logic  
3. **UI Feedback** - User interface improvements for clarity

## Components and Interfaces

### Frontend Components
- `EnhancedUploadModal.tsx` - Main upload form with validation
- `BookshopIntegrationSection.tsx` - Bookshop-specific fields and validation

### Backend Components
- `/api/documents/upload/route.ts` - Upload API endpoint with validation
- Database models for BookShopItem creation

### Data Flow
1. User enters ₹0.00 in price field
2. Frontend validation allows the value
3. Form submission sends data to backend
4. Backend validation accepts ₹0.00 as valid
5. BookShopItem created with `isFree: true`

## Data Models

### BookShopItem Model
```typescript
interface BookShopItem {
  id: string;
  title: string;
  description: string;
  price: number; // In paise, 0 for free items
  isFree: boolean; // true when price === 0
  category: string;
  contentType: ContentType;
  documentId: string;
  // ... other fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Zero price validation acceptance
*For any* validation function call with price exactly 0, the validation should return success and not generate price-related errors
**Validates: Requirements 1.1, 1.3**

### Property 2: End-to-end free upload success
*For any* upload submission with price 0 and valid other fields, the system should successfully create both document and bookshop item
**Validates: Requirements 1.2**

### Property 3: Free flag correctness
*For any* bookshop item created with price exactly 0, the isFree flag should be set to true
**Validates: Requirements 1.4, 3.4**

### Property 4: Price range validation consistency
*For any* price value in the range 0-10000, frontend and backend validation should produce identical results
**Validates: Requirements 3.1, 3.2**

### Property 5: Edge case validation handling
*For any* price input that is null, undefined, or negative, the validation should reject it, but price 0 should be accepted
**Validates: Requirements 3.3**

### Property 6: Error isolation for free content
*For any* validation scenario where other fields have errors but price is 0, no price-related errors should be generated
**Validates: Requirements 2.3**

### Property 7: Free item display formatting
*For any* bookshop item with price 0, the display should show "Free" rather than "₹0"
**Validates: Requirements 2.5**

## Error Handling

### Frontend Error Handling
- Remove price > 0 requirement from validation
- Maintain price <= 10000 upper bound validation
- Provide clear error messages for actual validation failures
- Show helpful placeholder text indicating free content is allowed

### Backend Error Handling
- Update validation to accept price >= 0 instead of price > 0
- Maintain existing upper bound and type validation
- Return appropriate error messages for invalid price ranges
- Handle edge cases like null/undefined price values

### User Experience
- Clear indication that ₹0.00 is acceptable
- Success messages that acknowledge free content creation
- Consistent behavior between form validation and submission

## Testing Strategy

### Unit Tests
- Test frontend validation with price = 0
- Test backend validation with price = 0
- Test BookShopItem creation with isFree flag
- Test error message generation for various price values

### Property-Based Tests
- Test price validation across range of valid values (0-10000)
- Test validation consistency between frontend and backend
- Test isFree flag setting for various price values
- Test error message appropriateness for different validation failures

### Integration Tests
- End-to-end upload flow with free content
- Database verification of created free items
- UI behavior verification for free content uploads

The testing framework will use Vitest for unit tests and property-based testing, with a minimum of 100 iterations per property test to ensure comprehensive coverage.