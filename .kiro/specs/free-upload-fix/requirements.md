# Requirements Document

## Introduction

The current document upload system incorrectly prevents users from uploading free content to the bookshop. When users try to upload a document with a price of ₹0.00 (free), the system shows validation errors requiring the price to be greater than 0. This prevents the creation of free educational content and resources.

## Glossary

- **Upload System**: The document upload functionality that allows users to add content to their dashboard and optionally to the bookshop
- **Bookshop**: The marketplace where users can list their content for others to purchase or access for free
- **Free Content**: Content that is available at no cost (price = ₹0.00)
- **Validation Logic**: The frontend and backend code that checks if user input is valid before processing

## Requirements

### Requirement 1

**User Story:** As a user, I want to upload free content to the bookshop, so that I can share educational resources without charging for them.

#### Acceptance Criteria

1. WHEN a user sets the price to ₹0.00 in the upload form THEN the system SHALL accept this as a valid price for free content
2. WHEN a user submits an upload with price ₹0.00 THEN the system SHALL successfully create the document and bookshop item
3. WHEN a user enters ₹0.00 as the price THEN the system SHALL not display any validation errors about price being too low
4. WHEN free content is uploaded THEN the system SHALL mark the bookshop item as free (isFree: true)
5. WHEN the upload form loads THEN the system SHALL allow ₹0.00 as a valid minimum price value

### Requirement 2

**User Story:** As a user, I want clear feedback about pricing options, so that I understand I can create both free and paid content.

#### Acceptance Criteria

1. WHEN a user views the price input field THEN the system SHALL show that ₹0.00 is acceptable for free content
2. WHEN a user hovers over or focuses on the price field THEN the system SHALL display helpful text indicating free content is allowed
3. WHEN validation errors occur for other fields THEN the system SHALL not incorrectly flag ₹0.00 as an invalid price
4. WHEN the form is submitted successfully with ₹0.00 THEN the system SHALL display a success message indicating free content was created
5. WHEN a user views the bookshop THEN the system SHALL clearly display free items as "Free" rather than "₹0"

### Requirement 3

**User Story:** As a developer, I want consistent validation logic between frontend and backend, so that the system behaves predictably and securely.

#### Acceptance Criteria

1. WHEN frontend validation runs THEN the system SHALL use the same price validation rules as the backend
2. WHEN backend validation runs THEN the system SHALL accept prices >= 0 and <= 10000
3. WHEN price validation occurs THEN the system SHALL treat null, undefined, and negative values as invalid but allow 0
4. WHEN bookshop items are created THEN the system SHALL correctly set the isFree flag based on price being exactly 0
5. WHEN validation errors are returned THEN the system SHALL provide clear, user-friendly error messages