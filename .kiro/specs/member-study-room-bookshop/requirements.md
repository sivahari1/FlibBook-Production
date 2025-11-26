# Requirements Document

## Introduction

This specification defines the enhanced member dashboard for jStudyRoom, featuring a Study Room (personal collection space) and an improved BookShop (content browsing and discovery system). The system enables members to browse categorized educational content, add items to their personal Study Room, and manage their collection with clear visibility of free/paid content limits.

## Glossary

- **Member**: A registered user with MEMBER role who can access the Study Room and BookShop
- **Study Room**: A member's personal collection space that can hold up to 10 content items (5 free, 5 paid)
- **BookShop**: A catalog of educational content organized by categories and subcategories
- **Content Item**: Any document, link, image, video, or audio file available in the BookShop
- **Category**: A top-level classification for content (e.g., Math, Functional MRI, Music)
- **Subcategory**: A nested classification within a category (e.g., CBSE 1st Standard under Math)
- **Free Content**: Content items that do not require payment and count toward the 5 free item limit
- **Paid Content**: Content items that require payment and count toward the 5 paid item limit
- **Content Type**: The format of content (PDF, IMAGE, VIDEO, LINK, AUDIO)

## Requirements

### Requirement 1

**User Story:** As a member, I want to view my Study Room dashboard, so that I can see my current collection status and navigate to key features.

#### Acceptance Criteria

1. WHEN a member accesses the dashboard THEN the system SHALL display a welcome section with the member's name
2. WHEN the dashboard loads THEN the system SHALL display three count cards showing free documents (X/5), paid documents (X/5), and total documents (X/10)
3. WHEN the dashboard loads THEN the system SHALL display quick action cards for "Files Shared With Me", "My Study Room", and "Book Shop"
4. WHEN a member clicks a quick action card THEN the system SHALL navigate to the corresponding section
5. WHEN the dashboard loads THEN the system SHALL display an information section explaining Study Room limits and functionality

### Requirement 2

**User Story:** As a member, I want to browse the BookShop with hierarchical categories, so that I can easily find content relevant to my learning needs.

#### Acceptance Criteria

1. WHEN a member accesses the BookShop THEN the system SHALL display all published content items organized by category
2. WHEN displaying categories THEN the system SHALL show Math with CBSE subcategories (1st through 10th Standard), Functional MRI, and Music as top-level categories
3. WHEN a member selects a category filter THEN the system SHALL display only content items belonging to that category or subcategory
4. WHEN a member selects a content type filter THEN the system SHALL display only items matching that content type (PDF, IMAGE, VIDEO, LINK, AUDIO)
5. WHEN a member enters a search query THEN the system SHALL filter items by title and description matching the query

### Requirement 3

**User Story:** As a member, I want to see detailed information about each BookShop item, so that I can make informed decisions about adding content to my Study Room.

#### Acceptance Criteria

1. WHEN displaying a BookShop item THEN the system SHALL show the item title, description, category, and content type
2. WHEN displaying a BookShop item THEN the system SHALL indicate whether the item is free or paid with the price amount
3. WHEN displaying a BookShop item THEN the system SHALL show a thumbnail or preview image if available
4. WHEN displaying a BookShop item THEN the system SHALL indicate if the item is already in the member's Study Room
5. WHEN displaying a link-type item THEN the system SHALL show the link URL and any fetched metadata

### Requirement 4

**User Story:** As a member, I want to add content from the BookShop to my Study Room, so that I can build my personal learning collection.

#### Acceptance Criteria

1. WHEN a member clicks "Add to Study Room" on a free item AND free slots are available THEN the system SHALL add the item to the Study Room and increment the free document count
2. WHEN a member clicks "Add to Study Room" on a paid item AND paid slots are available THEN the system SHALL initiate the payment process
3. WHEN a member attempts to add a free item AND all free slots are full THEN the system SHALL prevent the addition and display an error message indicating the limit is reached
4. WHEN a member attempts to add a paid item AND all paid slots are full THEN the system SHALL prevent the addition and display an error message indicating the limit is reached
5. WHEN an item is successfully added THEN the system SHALL update the item's display to show "In My Study Room" status

### Requirement 5

**User Story:** As a member, I want to view and manage my Study Room collection, so that I can access my content and make room for new items.

#### Acceptance Criteria

1. WHEN a member accesses My Study Room THEN the system SHALL display all content items currently in their collection
2. WHEN displaying Study Room items THEN the system SHALL show the item title, description, content type, and whether it is free or paid
3. WHEN a member clicks on a Study Room item THEN the system SHALL open the content viewer with appropriate DRM protections
4. WHEN a member clicks "Remove from Study Room" THEN the system SHALL remove the item and decrement the appropriate counter (free or paid)
5. WHEN a member removes an item THEN the system SHALL make that slot available for new content

### Requirement 6

**User Story:** As a member, I want to filter and search my Study Room content, so that I can quickly find specific items in my collection.

#### Acceptance Criteria

1. WHEN a member enters a search query in Study Room THEN the system SHALL filter items by title and description
2. WHEN a member selects a content type filter in Study Room THEN the system SHALL display only items of that type
3. WHEN a member selects a free/paid filter in Study Room THEN the system SHALL display only items matching that payment status
4. WHEN filters are applied THEN the system SHALL display the count of filtered items versus total items
5. WHEN a member clears all filters THEN the system SHALL display all Study Room items

### Requirement 7

**User Story:** As a member, I want to see visual indicators for content types, so that I can quickly identify different kinds of content.

#### Acceptance Criteria

1. WHEN displaying a PDF item THEN the system SHALL show a document icon (📄)
2. WHEN displaying an image item THEN the system SHALL show an image icon (🖼️)
3. WHEN displaying a video item THEN the system SHALL show a video icon (🎥)
4. WHEN displaying a link item THEN the system SHALL show a link icon (🔗)
5. WHEN displaying an audio item THEN the system SHALL show an audio icon (🎵)

### Requirement 8

**User Story:** As a member, I want the system to enforce collection limits, so that the Study Room capacity rules are consistently applied.

#### Acceptance Criteria

1. WHEN calculating free document count THEN the system SHALL count only items marked as free in the member's Study Room
2. WHEN calculating paid document count THEN the system SHALL count only items marked as paid in the member's Study Room
3. WHEN a member has 5 free items THEN the system SHALL disable the "Add to Study Room" button for all free BookShop items
4. WHEN a member has 5 paid items THEN the system SHALL disable the "Add to Study Room" button for all paid BookShop items
5. WHEN a member removes an item THEN the system SHALL immediately update the available slots and re-enable appropriate "Add" buttons

### Requirement 9

**User Story:** As a member, I want to complete payment for paid content, so that I can add premium items to my Study Room.

#### Acceptance Criteria

1. WHEN a member clicks "Add to Study Room" on a paid item THEN the system SHALL display a payment modal with item details and price
2. WHEN a member completes payment successfully THEN the system SHALL add the item to Study Room and increment the paid document count
3. WHEN a member cancels payment THEN the system SHALL close the modal without adding the item
4. WHEN payment fails THEN the system SHALL display an error message and not add the item
5. WHEN payment is verified THEN the system SHALL create a payment record in the database

### Requirement 10

**User Story:** As an admin, I want to manage BookShop content with categories and subcategories, so that members can easily discover organized content.

#### Acceptance Criteria

1. WHEN an admin creates a BookShop item THEN the system SHALL require selection of a category from the predefined list
2. WHEN an admin selects Math category THEN the system SHALL display CBSE subcategories (1st through 10th Standard) for selection
3. WHEN an admin creates an item THEN the system SHALL require a title, description, content type, and free/paid designation
4. WHEN an admin sets an item as paid THEN the system SHALL require a price amount greater than zero
5. WHEN an admin publishes an item THEN the system SHALL make it visible in the member BookShop
