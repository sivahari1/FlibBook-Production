# Member User Guide - jstudyroom Platform

Welcome to jstudyroom! This guide will help you get started as a Member and make the most of the platform's features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Member Dashboard](#member-dashboard)
3. [Files Shared With Me](#files-shared-with-me)
4. [Book Shop](#book-shop)
5. [My jstudyroom](#my-jstudyroom)
6. [Account Management](#account-management)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Registration

1. **Visit the jstudyroom platform** at the homepage
2. **Click "Become a Member"** or navigate to the registration page
3. **Fill out the registration form:**
   - Email address (required)
   - Password (minimum 8 characters, required)
   - Name (optional but recommended)
4. **Submit the form**
5. **Check your email** for a verification link from support@jstudyroom.dev
6. **Click the verification link** to activate your account
7. **Login** with your email and password

> **Note:** The verification link expires after 24 hours. If it expires, you can request a new one on the verification page.

### First Login

After verification, login at `/login` with your credentials. You'll be automatically redirected to your Member dashboard at `/member`.

---

## Member Dashboard

Your dashboard is the central hub for all Member features. It provides access to:

- **Files Shared With Me** - Documents shared by Platform Users
- **My jstudyroom** - Your personal bookshelf (up to 10 documents)
- **Book Shop** - Browse and add documents to your collection

### Navigation

Use the navigation menu to switch between sections:
- Click "Shared" to view files shared with you
- Click "My jstudyroom" to manage your personal collection
- Click "Book Shop" to browse the catalog

---

## Files Shared With Me

Platform Users can share documents directly with your email address. This section shows all documents shared with you.

### Viewing Shared Documents

1. **Navigate to "Files Shared With Me"** from your dashboard
2. **Browse the list** of shared documents
3. **View details:**
   - Document title
   - Sender name
   - Date shared
   - Expiration date (if any)
   - Personal note from sender (if any)
4. **Click "View"** to open the document in the FlipBook viewer

### Access Control

- Only you can access documents shared with your email
- If you try to access a document shared with a different email, you'll see "Access Denied"
- Expired shares are automatically hidden from your list
- You must be logged in to access shared documents

### Document Viewer

When viewing a shared document:
- Navigate pages using arrow keys or on-screen controls
- Zoom in/out using the zoom controls
- Documents include a watermark with your email and timestamp
- Right-click and text selection are disabled for security
- Download may be disabled by the sender

---

## Book Shop

The Book Shop is a curated catalog of documents managed by administrators. You can browse, search, and add documents to your My jstudyroom collection.

### Browsing the Catalog

1. **Navigate to "Book Shop"** from your dashboard
2. **Browse all available documents** in the catalog
3. **Use filters:**
   - Category dropdown (Academic, Professional, Fiction, etc.)
   - Search by title or description
4. **View document details:**
   - Title and description
   - Category
   - Type: Free or Paid (with price in ₹)
   - "Add to My jstudyroom" button

### Adding Free Documents

1. **Find a free document** you want to add
2. **Click "Add to My jstudyroom"**
3. **System checks:**
   - You haven't exceeded the 5 free document limit
   - You haven't exceeded the 10 total document limit
4. **If successful:**
   - Document is added to My jstudyroom
   - Button becomes disabled for that document
   - Your free document count increases
5. **If limit reached:**
   - Error message explains which limit was exceeded
   - Return a document from My jstudyroom to free up space

### Purchasing Paid Documents

1. **Find a paid document** you want to purchase
2. **Click "Add to My jstudyroom"** (shows price)
3. **Payment modal opens** with:
   - Document details
   - Price in ₹
   - Razorpay secure checkout
4. **Complete payment:**
   - Enter payment details in Razorpay interface
   - Confirm payment
5. **After successful payment:**
   - Document is automatically added to My jstudyroom
   - You receive a purchase confirmation email
   - Your paid document count increases
   - Button becomes disabled for that document
6. **If payment fails:**
   - Error message is displayed
   - Document is NOT added
   - You can try again

> **Payment Limits:** You can purchase up to 5 paid documents. Return a paid document to purchase another.

---

## My jstudyroom

My jstudyroom is your personal virtual bookshelf where you can store and access up to 10 documents.

### Document Limits

- **Total limit:** 10 documents
- **Free documents:** Maximum 5
- **Paid documents:** Maximum 5

Your current counts are displayed at the top: "X/5 free, Y/5 paid, Z/10 total"

### Viewing Your Collection

1. **Navigate to "My jstudyroom"** from your dashboard
2. **View all documents** in your collection
3. **See details:**
   - Document title
   - Category
   - Type (Free or Paid)
   - Date added
4. **Actions:**
   - "View" - Open document in FlipBook viewer
   - "Return" - Remove document from your collection

### Viewing Documents

1. **Click "View"** on any document
2. **Document opens** in the FlipBook viewer
3. **Navigate and read** as needed
4. **Close viewer** to return to My jstudyroom

### Returning Documents

When you want to free up space for new documents:

1. **Click "Return"** on a document
2. **Confirm the action**
3. **Document is removed** from My jstudyroom
4. **Your counter decreases** (free or paid, depending on document type)
5. **The document becomes available** to add again from Book Shop

> **Note:** Returning a paid document does NOT refund the purchase. You can add it again from Book Shop without paying again if you haven't exceeded limits.

### Managing Your Collection

**Strategy for 10-document limit:**
- Prioritize documents you're actively reading
- Return documents you've finished
- Balance between free and paid documents based on your needs
- Check Book Shop regularly for new additions

---

## Account Management

### Profile Settings

Currently, you can:
- View your email address
- View your name
- See your document counts

### Password Reset

If you forget your password:

1. **Go to the login page**
2. **Click "Forgot Password?"**
3. **Enter your email address**
4. **Check your email** for a password reset link
5. **Click the link** (valid for 1 hour)
6. **Enter your new password**
7. **Login** with your new password

> **Note:** Password reset does not affect your email verification status.

### Email Verification

If you need to resend your verification email:

1. **Try to login** with unverified account
2. **You'll be redirected** to the verification page
3. **Click "Resend Verification Email"**
4. **Check your email** for a new verification link
5. **Click the link** to verify

### Theme Preference

Toggle between light and dark mode:
- **Click the theme toggle** in the header (sun/moon icon)
- **Your preference is saved** automatically
- **Applies to all pages** on the platform

---

## Troubleshooting

### I didn't receive the verification email

1. **Check your spam/junk folder**
2. **Wait a few minutes** (emails can be delayed)
3. **Verify you entered the correct email**
4. **Request a new verification email** from the verification page
5. **Contact support** if still not received: support@jstudyroom.dev

### I can't add a document to My jstudyroom

**Possible reasons:**

1. **Total limit reached (10 documents)**
   - Solution: Return a document to free up space

2. **Free document limit reached (5 free)**
   - Solution: Return a free document or add a paid document instead

3. **Paid document limit reached (5 paid)**
   - Solution: Return a paid document or add a free document instead

4. **Document already in your collection**
   - Solution: Check My jstudyroom - you may have already added it

### Payment failed

1. **Check your payment details** are correct
2. **Ensure sufficient funds** in your account
3. **Try again** - temporary issues may resolve
4. **Try a different payment method**
5. **Contact Razorpay support** for payment-specific issues
6. **Contact platform support** if problem persists

### I can't access a shared document

**Possible reasons:**

1. **Not logged in**
   - Solution: Login and try again

2. **Document shared with different email**
   - Solution: Login with the email address the document was shared with
   - Or ask the sender to share with your current email

3. **Share link expired**
   - Solution: Ask the sender to share again

4. **Share link revoked**
   - Solution: Ask the sender to create a new share

### The verification link expired

1. **Go to the verification page** at `/verify`
2. **Click "Resend Verification Email"**
3. **Check your email** for a new link
4. **Click the new link** within 24 hours

### I forgot my password

1. **Go to the login page**
2. **Click "Forgot Password?"**
3. **Follow the password reset process**
4. **Check your email** for the reset link
5. **Reset link expires in 1 hour** - request a new one if needed

---

## Best Practices

### Document Management

- **Review Book Shop regularly** for new documents
- **Return documents you've finished** to make room for new ones
- **Prioritize your reading list** within the 10-document limit
- **Keep track of your limits** using the counter display

### Security

- **Use a strong password** (mix of letters, numbers, symbols)
- **Don't share your login credentials** with others
- **Logout when using shared computers**
- **Keep your email secure** (it's used for verification and password reset)

### Payments

- **Review document details** before purchasing
- **Verify the price** before confirming payment
- **Keep purchase confirmation emails** for your records
- **Remember:** Returning a paid document doesn't refund the purchase

---

## Getting Help

If you need assistance:

1. **Check this user guide** for common questions
2. **Review the troubleshooting section** for solutions
3. **Contact support** at support@jstudyroom.dev
4. **Include details** in your support request:
   - Your email address
   - Description of the issue
   - Steps you've already tried
   - Screenshots (if applicable)

---

## Feature Summary

As a Member, you can:

✅ Self-register with email verification  
✅ Access documents shared with your email  
✅ Browse the Book Shop catalog  
✅ Add up to 5 free documents to My jstudyroom  
✅ Purchase up to 5 paid documents  
✅ Maintain a personal collection of 10 documents  
✅ View documents in secure FlipBook viewer  
✅ Return documents to free up space  
✅ Toggle between light and dark themes  
✅ Reset your password if forgotten  

---

**Welcome to jstudyroom! Happy reading! 📚**
