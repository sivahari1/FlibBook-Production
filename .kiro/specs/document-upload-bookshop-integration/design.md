# Document Upload to Bookshop Integration - Design

## Overview

This feature integrates bookshop item creation directly into the document upload workflow. When administrators upload documents, they can optionally add them to the bookshop by selecting a category and setting a price. This eliminates the need for separate upload and bookshop management steps, streamlining the content publishing workflow.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Upload Modal (Enhanced)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  File/Link Upload                                      │ │
│  │  Content Type Selection                                │ │
│  │  ☑ Add to Bookshop                                     │ │
│  │    ├── Category Dropdown                               │ │
│  │    ├── Price Input                                     │ │
│  │    └── Description (Optional)                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Upload API Endpoint                    │
│  /api/documents/upload                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Validate upload data                               │ │
│  │  2. Validate bookshop data (if enabled)                │ │
│  │  3. Upload document                                    │ │
│  │  4. Create bookshop item (if enabled)                  │ │
│  │  5. Link document to bookshop item                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Document       │◄────────┤  BookshopItem    │         │
│  │   - id           │         │  - id            │         │
│  │   - title        │         │  - documentId    │         │
│  │   - contentType  │         │  - category      │         │
│  │   - url          │         │  - price         │         │
│  └──────────────────┘         │  - isActive      │         │
│                                └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Member Bookshop Catalog                     │
│  - Browse by category                                        │
│  - View document details                                     │
│  - Add to study room                                         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Upload Modal Component

**Location:** `components/dashboard/UploadModal.tsx` or `components/dashboard/EnhancedUploadModal.tsx`

**State Interface:**
```typescript
interface UploadModalState {
  // Existing fields
  file: File | null;
  contentType: 'document' | 'image' | 'video' | 'link';
  title: string;
  description: string;
  url?: string;
  
  // New bookshop fields
  addToBookshop: boolean;
  bookshopCategory: string;
  bookshopPrice: number;
  bookshopDescription: string;
  
  // UI state
  isUploading: boolean;
  errors: Record<string, string>;
}
```

**Props Interface:**
```typescript
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}
```

### 2. Bookshop Integration Section Component

**Location:** `components/upload/BookshopIntegrationSection.tsx`

```typescript
interface BookshopIntegrationSectionProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  price: number;
  onPriceChange: (price: number) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  categories: Category[];
  errors?: {
    category?: string;
    price?: string;
  };
}

interface Category {
  id: string;
  name: string;
  group: string;
}
```

### 3. Enhanced Upload API

**Endpoint:** `POST /api/documents/upload`

**Request Interface:**
```typescript
interface UploadRequest {
  // Existing fields
  file?: File;
  contentType: 'document' | 'image' | 'video' | 'link';
  title: string;
  description?: string;
  url?: string;
  
  // New bookshop fields
  addToBookshop?: boolean;
  bookshopCategory?: string;
  bookshopPrice?: number;
  bookshopDescription?: string;
}
```

**Response Interface:**
```typescript
interface UploadResponse {
  success: boolean;
  document: {
    id: string;
    title: string;
    contentType: string;
    url: string;
  };
  bookshopItem?: {
    id: string;
    category: string;
    price: number;
  };
  message: string;
}
```

### 4. Category API

**Endpoint:** `GET /api/bookshop/categories`

**Response Interface:**
```typescript
interface CategoryResponse {
  categories: {
    id: string;
    name: string;
    group: 'Academic Subjects' | 'Study Materials' | 'Exam Preparation' | 'Skills Development';
    description?: string;
  }[];
}
```

## Data Models

### Database Schema

The feature uses existing tables with the following relationships:

```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  description String?
  contentType String
  url         String
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relationship to bookshop
  bookshopItem BookshopItem?
  
  user User @relation(fields: [userId], references: [id])
}

model BookshopItem {
  id          String   @id @default(cuid())
  title       String
  description String?
  category    String
  price       Float
  contentType String
  documentId  String?  @unique
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relationship to document
  document Document? @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  // Relationship to user study rooms
  userBookshopItems UserBookshopItem[]
}

model UserBookshopItem {
  id             String   @id @default(cuid())
  userId         String
  bookshopItemId String
  purchasedAt    DateTime @default(now())
  
  user         User         @relation(fields: [userId], references: [id])
  bookshopItem BookshopItem @relation(fields: [bookshopItemId], references: [id])
  
  @@unique([userId, bookshopItemId])
}
```

### Category Structure

Categories are defined in `lib/bookshop-categories.ts`:

```typescript
export const BOOKSHOP_CATEGORIES = {
  'Academic Subjects': [
    { id: 'mathematics', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
    { id: 'literature', name: 'Literature' },
    { id: 'history', name: 'History' },
    { id: 'languages', name: 'Languages' },
  ],
  'Study Materials': [
    { id: 'textbooks', name: 'Textbooks' },
    { id: 'notes', name: 'Notes' },
    { id: 'references', name: 'References' },
    { id: 'guides', name: 'Guides' },
  ],
  'Exam Preparation': [
    { id: 'mock-tests', name: 'Mock Tests' },
    { id: 'previous-papers', name: 'Previous Papers' },
    { id: 'practice-sets', name: 'Practice Sets' },
    { id: 'solutions', name: 'Solutions' },
  ],
  'Skills Development': [
    { id: 'programming', name: 'Programming' },
    { id: 'design', name: 'Design' },
    { id: 'business', name: 'Business' },
    { id: 'personal-development', name: 'Personal Development' },
  ],
};
```

## Implementation Flow

### Upload Process with Bookshop Integration

```typescript
async function handleUpload(formData: UploadFormData) {
  try {
    // 1. Validate basic upload fields
    const uploadErrors = validateUploadFields(formData);
    if (uploadErrors.length > 0) {
      setErrors(uploadErrors);
      return;
    }
    
    // 2. Validate bookshop fields if enabled
    if (formData.addToBookshop) {
      const bookshopErrors = validateBookshopFields(formData);
      if (bookshopErrors.length > 0) {
        setErrors(bookshopErrors);
        return;
      }
    }
    
    // 3. Upload document
    setIsUploading(true);
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: createFormData(formData),
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const result = await response.json();
    
    // 4. Show success message
    if (formData.addToBookshop && result.bookshopItem) {
      toast.success(
        `Document uploaded successfully and added to ${formData.bookshopCategory} category in bookshop!`
      );
    } else {
      toast.success('Document uploaded successfully!');
    }
    
    // 5. Reset form and close modal
    resetForm();
    onClose();
    onUploadSuccess();
    
  } catch (error) {
    handleUploadError(error);
  } finally {
    setIsUploading(false);
  }
}
```

### Server-Side Upload Handler

```typescript
// app/api/documents/upload/route.ts
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const addToBookshop = formData.get('addToBookshop') === 'true';
    
    // 1. Validate upload data
    const uploadData = await validateUploadData(formData);
    
    // 2. Validate bookshop data if enabled
    if (addToBookshop) {
      const bookshopData = validateBookshopData(formData);
      if (!bookshopData.category || !bookshopData.price) {
        return NextResponse.json(
          { error: 'Category and price are required for bookshop items' },
          { status: 400 }
        );
      }
    }
    
    // 3. Upload document
    const document = await uploadDocument(uploadData, session.user.id);
    
    // 4. Create bookshop item if requested
    let bookshopItem = null;
    if (addToBookshop) {
      try {
        bookshopItem = await createBookshopItem({
          documentId: document.id,
          title: uploadData.title,
          description: formData.get('bookshopDescription') as string,
          category: formData.get('bookshopCategory') as string,
          price: parseFloat(formData.get('bookshopPrice') as string),
          contentType: uploadData.contentType,
          isActive: true,
        });
      } catch (error) {
        // Log error but don't fail the upload
        console.error('Failed to create bookshop item:', error);
        return NextResponse.json({
          success: true,
          document,
          warning: 'Document uploaded but could not be added to bookshop',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      document,
      bookshopItem,
      message: addToBookshop
        ? 'Document uploaded and added to bookshop'
        : 'Document uploaded successfully',
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

## Validation Rules

### Client-Side Validation

```typescript
function validateBookshopFields(data: BookshopData): ValidationErrors {
  const errors: ValidationErrors = {};
  
  if (!data.category) {
    errors.category = 'Please select a category';
  }
  
  if (!data.price || data.price <= 0) {
    errors.price = 'Price must be greater than 0';
  }
  
  if (data.price > 10000) {
    errors.price = 'Price cannot exceed ₹10,000';
  }
  
  return errors;
}
```

### Server-Side Validation

```typescript
function validateBookshopData(formData: FormData) {
  const category = formData.get('bookshopCategory') as string;
  const price = parseFloat(formData.get('bookshopPrice') as string);
  
  if (!category || !isValidCategory(category)) {
    throw new ValidationError('Invalid or missing category');
  }
  
  if (!price || price <= 0 || price > 10000) {
    throw new ValidationError('Invalid price');
  }
  
  return { category, price };
}
```

## UI/UX Design

### Upload Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│ Upload Document                                    [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Content Type:  [PDF Document ▼]                        │
│                                                         │
│ [Drag & Drop File Here or Click to Browse]             │
│                                                         │
│ Title: [_____________________________________]          │
│                                                         │
│ Description (Optional):                                 │
│ [____________________________________________]          │
│ [____________________________________________]          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ☑ Add to Bookshop                                   ││
│ │                                                      ││
│ │ Category: [Select Category ▼]                       ││
│ │                                                      ││
│ │ Price: ₹ [_____]                                    ││
│ │                                                      ││
│ │ Bookshop Description (Optional):                    ││
│ │ [_________________________________________]          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                    [Cancel]  [Upload Document]          │
└─────────────────────────────────────────────────────────┘
```

### Category Dropdown Structure

```
Select Category
├── Academic Subjects
│   ├── Mathematics
│   ├── Science
│   ├── Literature
│   ├── History
│   └── Languages
├── Study Materials
│   ├── Textbooks
│   ├── Notes
│   ├── References
│   └── Guides
├── Exam Preparation
│   ├── Mock Tests
│   ├── Previous Papers
│   ├── Practice Sets
│   └── Solutions
└── Skills Development
    ├── Programming
    ├── Design
    ├── Business
    └── Personal Development
```

## Error Handling

### Error Scenarios

1. **Missing Required Fields**
   - Message: "Please fill in all required fields"
   - Action: Highlight invalid fields

2. **Invalid Category**
   - Message: "Please select a valid category"
   - Action: Focus category dropdown

3. **Invalid Price**
   - Message: "Price must be between ₹1 and ₹10,000"
   - Action: Focus price input

4. **Upload Failure**
   - Message: "Failed to upload document. Please try again."
   - Action: Keep form data, allow retry

5. **Partial Success (Document uploaded, bookshop creation failed)**
   - Message: "Document uploaded successfully, but could not be added to bookshop. You can add it to bookshop later from the document details page."
   - Action: Close modal, refresh document list

### Error Recovery

```typescript
async function handlePartialFailure(documentId: string, error: Error) {
  console.error('Bookshop item creation failed:', error);
  
  // Option 1: Keep document, show warning
  toast.warning(
    'Document uploaded successfully, but could not be added to bookshop. ' +
    'You can add it to bookshop later from the document details page.'
  );
  
  // Option 2: Rollback document (if required by business rules)
  // await deleteDocument(documentId);
  // throw new Error('Upload failed: Could not create bookshop item');
}
```

## Performance Considerations

1. **Async Processing**: Bookshop item creation should not significantly delay upload response
2. **Caching**: Category data should be cached on the client
3. **Optimistic Updates**: Show success immediately, handle errors asynchronously
4. **Loading States**: Provide clear feedback during upload and bookshop creation

## Security Considerations

1. **Authorization**: Verify user has permission to add items to bookshop
2. **Validation**: Sanitize all user inputs
3. **Rate Limiting**: Implement rate limiting for bookshop item creation
4. **Data Integrity**: Use database transactions to ensure consistency

## Testing Strategy

### Unit Tests
- Validation functions
- Component rendering with bookshop fields
- API endpoint handlers

### Integration Tests
- End-to-end upload with bookshop integration
- Member bookshop browsing and purchasing
- Error handling scenarios

### User Acceptance Tests
- Admin upload workflow
- Member discovery and purchase workflow
- Error recovery scenarios

## Deployment Plan

### Phase 1: Backend API Enhancement
- Enhance upload API to handle bookshop integration
- Add validation and error handling
- Test with existing upload functionality

### Phase 2: Frontend UI Enhancement
- Add bookshop integration section to upload modal
- Implement form validation and error handling
- Test upload workflow

### Phase 3: Member Experience
- Ensure bookshop catalog shows new items
- Test member purchase and study room integration
- Performance optimization

### Phase 4: Production Deployment
- Deploy with feature flags
- Monitor performance and error rates
- Gradual rollout to all users
