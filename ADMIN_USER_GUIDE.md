# Admin User Guide - jstudyroom Platform

This guide explains how to use the admin dashboard to manage access requests, users, Book Shop, and Members.

## Table of Contents

1. [Accessing the Admin Dashboard](#accessing-the-admin-dashboard)
2. [Managing Access Requests](#managing-access-requests)
3. [Creating User Accounts](#creating-user-accounts)
4. [Managing Existing Users](#managing-existing-users)
5. [Managing Book Shop](#managing-book-shop)
6. [Managing Members](#managing-members)
7. [Payment Tracking](#payment-tracking)
8. [Understanding User Roles](#understanding-user-roles)
9. [Email Notifications](#email-notifications)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---


## Accessing the Admin Dashboard

### Login
1. Navigate to `/login` on your platform
2. Enter your admin credentials:
   - Email: `sivaramj83@gmail.com`
   - Password: Your admin password (set via `ADMIN_SEED_PASSWORD`)
3. You will be automatically redirected to `/admin`

### Dashboard Overview
The admin dashboard has five main sections:
- **Access Requests** - Manage incoming Platform User access requests
- **Users** - Manage existing Platform User accounts
- **Book Shop** - Manage the document catalog for Members
- **Members** - View and manage Member accounts
- **Payments** - Track all payment transactions

---

## Managing Access Requests

### Viewing Access Requests

1. Click on **"Access Requests"** in the admin navigation
2. You'll see a table with all access requests showing:
   - Email address
   - Name (if provided)
   - Purpose/use case
   - Requested role
   - Number of documents/users (if provided)
   - Status (PENDING, APPROVED, REJECTED, CLOSED)
   - Submission date

### Filtering Requests

Use the status filter dropdown to view:
- **All** - Show all requests
- **Pending** - Only new requests awaiting review
- **Approved** - Requests that resulted in user creation
- **Rejected** - Requests you declined
- **Closed** - Requests closed without action

### Reviewing a Request

1. Click on any request row to view full details
2. Review the information provided:
   - Contact information
   - Purpose and use case
   - Estimated usage (documents/users)
   - Requested role
   - Additional notes
3. Add internal admin notes if needed (not visible to requester)

### Approving a Request

1. Click **"Approve & Create User"** button
2. A user creation modal will appear with pre-filled information
3. Review and adjust:
   - **Email** - Pre-filled from request
   - **Name** - Pre-filled if provided
   - **Role** - Select PLATFORM_USER or READER_USER
   - **Password** - Auto-generated secure password (click to regenerate)
   - **Price Plan** - Enter custom pricing (e.g., "Starter – 10 docs / 5 users – ₹500/month")
   - **Admin Notes** - Internal notes about this user
4. Click **"Create User"**
5. The system will:
   - Create the user account
   - Update request status to APPROVED
   - Send approval email to user with credentials
   - Display the generated password (copy it!)

### Rejecting a Request

1. Click **"Mark as Rejected"** button
2. Optionally add admin notes explaining why
3. The request status changes to REJECTED
4. No email is sent to the requester

### Closing a Request

1. Click **"Mark as Closed"** button
2. Use this for spam, duplicates, or requests you want to archive
3. The request status changes to CLOSED

---

## Creating User Accounts

### From Access Request (Recommended)

Follow the approval process described above. This automatically:
- Links the user to the access request
- Updates request status
- Sends approval email

### Manual User Creation

If you need to create a user without an access request:
1. Go to **Users** section
2. Click **"Create User"** button (if available)
3. Fill in all required information
4. The user will receive an approval email

---

## Managing Existing Users

### Viewing Users

1. Click on **"Users"** in the admin navigation
2. You'll see a table with all users showing:
   - Email address
   - Role (ADMIN, PLATFORM_USER, READER_USER)
   - Price plan
   - Active status
   - Creation date

### Filtering Users

Use the role filter dropdown to view:
- **All Roles** - Show all users
- **Admin** - Only admin users
- **Platform User** - Users who can upload and share
- **Reader User** - Users who can only view shared documents

### Searching Users

Use the search box to find users by email address.

### Editing User Details

1. Click the **"Edit"** button on any user row
2. A modal will appear where you can update:
   - **Role** - Change between PLATFORM_USER and READER_USER
   - **Price Plan** - Update pricing information
   - **Admin Notes** - Internal notes about this user
   - **Active Status** - Activate or deactivate the account
3. Click **"Save Changes"**
4. Changes take effect immediately

### Resetting User Password

1. Click the **"Reset Password"** button on any user row
2. A confirmation dialog will appear
3. Click **"Confirm"**
4. The system will:
   - Generate a new secure password
   - Update the user's password in the database
   - Send an email to the user with new credentials
   - Display the new password (copy it!)
5. Share the password with the user if needed

### Deactivating Users

1. Click **"Edit"** on the user
2. Toggle **"Active Status"** to OFF
3. Save changes
4. Deactivated users cannot log in
5. Their data remains in the system

---

## Managing Book Shop

The Book Shop is a curated catalog of documents that Members can browse and add to their My jstudyroom collection.

### Viewing Book Shop Items

1. Click on **"Book Shop"** in the admin navigation
2. You'll see a table with all Book Shop items showing:
   - Document title
   - Category
   - Type (Free or Paid)
   - Price (if paid)
   - Published status
   - Creation date
3. Use the search box to find items by title
4. Use the category filter to view specific categories

### Creating a Book Shop Item

1. Click **"Create New Item"** button
2. Fill in the form:
   - **Document** - Select from your uploaded documents
   - **Title** - Display title for the catalog
   - **Description** - Brief description of the document
   - **Category** - Select or create a category (Academic, Professional, Fiction, etc.)
   - **Type** - Choose Free or Paid
   - **Price** - If paid, enter price in ₹ (e.g., 299 for ₹299)
   - **Published** - Toggle to make visible in catalog
3. Click **"Create Item"**
4. Item appears in Book Shop immediately if published

### Editing a Book Shop Item

1. Click the **"Edit"** button on any item row
2. Update any fields:
   - Change title or description
   - Update category
   - Change from free to paid (or vice versa)
   - Adjust price
   - Toggle published status
3. Click **"Save Changes"**
4. Changes appear immediately in Member catalog

### Deleting a Book Shop Item

1. Click the **"Delete"** button on any item row
2. Confirm the deletion
3. **Important:** This removes the item from Book Shop but does NOT delete the underlying document
4. Members who already have this item in My jstudyroom retain access
5. Item cannot be added to My jstudyroom anymore

### Managing Categories

Categories help Members browse and filter documents:

**Common Categories:**
- Academic
- Professional
- Fiction
- Non-Fiction
- Technical
- Business
- Self-Help
- Reference

**Creating New Categories:**
- Simply type a new category name when creating/editing an item
- Categories are created automatically
- Keep category names consistent

### Publishing Strategy

**Published Items:**
- Visible to all Members in Book Shop
- Can be added to My jstudyroom
- Appear in search and filters

**Unpublished Items:**
- Hidden from Member catalog
- Useful for preparing items before launch
- Can be published later

### Pricing Guidelines

**Free Documents:**
- Use for promotional content
- Sample chapters or previews
- Public domain materials
- Marketing materials

**Paid Documents:**
- Premium content
- Exclusive materials
- Full books or courses
- Professional resources

**Price Recommendations:**
- Consider document length and value
- Research market rates
- Start with competitive pricing
- Adjust based on demand

---

## Managing Members

Members are users who self-register on the platform. They can access shared documents, browse Book Shop, and maintain My jstudyroom.

### Viewing Members

1. Click on **"Members"** in the admin navigation
2. You'll see a table with all Members showing:
   - Email address
   - Name
   - Registration date
   - Email verification status
   - Free document count (X/5)
   - Paid document count (Y/5)
   - Total documents (Z/10)
3. Use the search box to find Members by email

### Viewing Member Details

1. Click on any Member row to view full details
2. You'll see:
   - **Profile Information:**
     - Email, name, registration date
     - Verification status
     - Active status
   - **My jstudyroom Contents:**
     - All documents in their collection
     - Document titles and types (free/paid)
     - Date added
   - **Purchase History:**
     - All paid document purchases
     - Payment amounts and dates
     - Payment status

### Managing Member Accounts

**Deactivate/Activate Member:**
1. Click **"Deactivate"** or **"Activate"** button
2. Confirm the action
3. Deactivated Members cannot log in
4. Their data remains in the system

**Reset Member Password:**
1. Click **"Reset Password"** button
2. Confirm the action
3. System generates a new secure password
4. Member receives password reset email
5. Copy the new password if needed

### Member Support

**Common Member Issues:**

1. **Cannot add documents to My jstudyroom**
   - Check their document counts
   - Verify they haven't exceeded limits
   - Confirm document is published in Book Shop

2. **Payment issues**
   - Check payment history in Member details
   - Review payment status in Payments section
   - Verify Razorpay configuration

3. **Cannot access shared documents**
   - Verify document was shared to their email
   - Check if share has expired
   - Confirm Member is using correct email to login

4. **Email verification issues**
   - Check verification status in Member details
   - Member can request new verification email
   - Verify Resend is configured correctly

---

## Payment Tracking

Track all payment transactions from Members purchasing paid documents.

### Viewing Payments

1. Click on **"Payments"** in the admin navigation
2. You'll see a table with all payments showing:
   - Member email
   - Document title
   - Amount (in ₹)
   - Payment status (pending, success, failed)
   - Razorpay Order ID
   - Razorpay Payment ID
   - Transaction date
3. Use the status filter to view:
   - All payments
   - Successful payments
   - Failed payments
   - Pending payments

### Payment Status

**Success:**
- Payment completed successfully
- Document added to Member's My jstudyroom
- Confirmation email sent
- Member's paid document count increased

**Failed:**
- Payment was attempted but failed
- Document NOT added to My jstudyroom
- Member can try again
- Check Razorpay dashboard for details

**Pending:**
- Payment initiated but not completed
- Waiting for payment gateway response
- Usually resolves within minutes
- May need manual review if stuck

### Payment Troubleshooting

**Failed Payments:**
1. Check Razorpay dashboard for error details
2. Verify payment gateway configuration
3. Check if Member's payment method was valid
4. Review application logs for errors

**Refund Requests:**
1. Process refunds through Razorpay dashboard
2. Manually remove document from Member's My jstudyroom if needed
3. Update Member's paid document count
4. Document the refund in admin notes

---

## Understanding User Roles

### ADMIN (You)
- Full access to admin dashboard
- Can manage all access requests
- Can create, edit, and delete users
- Can manage Book Shop catalog
- Can view and manage Members
- Can track all payments
- Can reset any user's password
- Has all platform features

### PLATFORM_USER
- Can upload PDF documents
- Can share documents via link or email
- Can view analytics for their documents
- Can manage their subscriptions
- Cannot access admin dashboard
- Cannot manage other users
- Requires admin approval to create account

### MEMBER
- Can self-register with email verification
- Can access documents shared with their email
- Can browse Book Shop catalog
- Can add up to 5 free documents to My jstudyroom
- Can purchase up to 5 paid documents
- Can maintain personal collection of 10 documents
- Cannot upload or share documents
- Cannot access admin dashboard

### Role Assignment Guidelines

**MEMBER (Self-Registration):**
- Public users who want to access shared content
- Users who want to browse and purchase from Book Shop
- Users who need a personal document collection
- No admin approval required
- Limited to 10 documents in My jstudyroom

**PLATFORM_USER (Admin-Approved):**
- Users who need to upload and share documents
- Content creators or document owners
- Users who need analytics and management features
- Requires admin approval and access request
- Can share documents with Members

**Note:** The READER_USER role has been replaced by the MEMBER role in the jstudyroom platform.

---

## Email Notifications

### Emails You Receive

**Access Request Notification:**
- Sent when someone submits an access request
- Sent to: support@jstudyroom.dev and sivaramj83@gmail.com
- Contains all request details
- Includes link to admin dashboard

### Emails Users Receive

**Approval Email:**
- Sent when you approve a request and create a user
- Contains login credentials (email and password)
- Explains their role and permissions
- Includes pricing information (if provided)
- Reminds them to change password

**Password Reset Email:**
- Sent when you reset a user's password
- Contains new login credentials
- Includes security reminder
- Provides support contact information

### Email Troubleshooting

If emails are not being sent:
1. Check Resend API key in environment variables
2. Verify `RESEND_FROM_EMAIL` is set to `support@jstudyroom.dev`
3. Check Resend dashboard for delivery status
4. Verify domain is verified in Resend (for production)
5. Check application logs for email errors

---

## Best Practices

### Access Request Review

1. **Review Promptly** - Check for new requests daily
2. **Verify Legitimacy** - Look for spam or fake requests
3. **Ask Questions** - Use admin notes to track follow-ups
4. **Set Expectations** - Communicate pricing and terms before approval

### User Creation

1. **Choose Appropriate Role** - Match role to user's needs
2. **Document Pricing** - Always fill in price plan field
3. **Add Notes** - Record important information about the user
4. **Copy Passwords** - Save generated passwords before closing modal
5. **Verify Email** - Double-check email addresses before creating

### User Management

1. **Regular Audits** - Review user list periodically
2. **Update Pricing** - Keep price plans current
3. **Deactivate, Don't Delete** - Preserve data by deactivating instead
4. **Track Changes** - Use admin notes to document changes
5. **Monitor Usage** - Check analytics to ensure users are within limits

### Security

1. **Protect Admin Credentials** - Never share your admin password
2. **Use Strong Passwords** - Let the system generate passwords
3. **Review Audit Logs** - Check for suspicious activity
4. **Limit Admin Access** - Only create additional admins if necessary
5. **Regular Password Changes** - Update your admin password periodically

---

## Troubleshooting

### Cannot Access Admin Dashboard

**Problem:** Redirected away from `/admin`

**Solutions:**
1. Verify you're logged in with admin account (sivaramj83@gmail.com)
2. Check that your user role is ADMIN in the database
3. Clear browser cookies and log in again
4. Check browser console for errors

### Access Requests Not Appearing

**Problem:** No access requests showing in dashboard

**Solutions:**
1. Check status filter - set to "All" or "Pending"
2. Verify database connection
3. Check if requests exist in database (use Prisma Studio)
4. Review application logs for errors

### User Creation Fails

**Problem:** Error when trying to create user from access request

**Solutions:**
1. Check if email already exists in system
2. Verify all required fields are filled
3. Check database connection
4. Review application logs for specific error
5. Ensure Resend is configured correctly

### Emails Not Sending

**Problem:** Users not receiving approval or password reset emails

**Solutions:**
1. Verify `RESEND_API_KEY` environment variable
2. Check `RESEND_FROM_EMAIL` is set to `support@jstudyroom.dev`
3. Verify domain in Resend dashboard (production)
4. Check Resend dashboard for delivery logs
5. Look for email errors in application logs
6. Verify user email address is correct

### Password Reset Not Working

**Problem:** Reset password button doesn't work or user can't log in

**Solutions:**
1. Verify new password was generated successfully
2. Check that email was sent to user
3. Ensure user is using correct email address
4. Try resetting password again
5. Check if user account is active

### User Cannot Access Features

**Problem:** User reports they can't upload documents or access features

**Solutions:**
1. Verify user's role (should be PLATFORM_USER for uploads)
2. Check if user account is active
3. Verify user is logged in correctly
4. Check if user is trying to access correct dashboard
5. Review role-based permissions

### Book Shop Item Not Appearing

**Problem:** Created Book Shop item doesn't show in Member catalog

**Solutions:**
1. Verify item is marked as "Published"
2. Check if document is properly linked
3. Clear browser cache and refresh
4. Verify document exists in system
5. Check application logs for errors

### Member Cannot Add Document

**Problem:** Member reports they can't add document to My jstudyroom

**Solutions:**
1. Check Member's document counts (view Member details)
2. Verify they haven't exceeded limits (5 free, 5 paid, 10 total)
3. Check if document is already in their My jstudyroom
4. Verify Book Shop item is published
5. Check if document type matches available slots

### Payment Not Processing

**Problem:** Member's payment fails or doesn't complete

**Solutions:**
1. Check Razorpay configuration (API keys)
2. Verify Razorpay account is active
3. Check payment status in Payments section
4. Review Razorpay dashboard for error details
5. Verify Member hasn't exceeded paid document limit
6. Check application logs for payment errors

---

## Support

For technical issues or questions:
- Check application logs in Vercel dashboard
- Review Supabase logs for database issues
- Check Resend dashboard for email delivery
- Contact development team for code-related issues

---

## Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| Approve new Platform User | Access Requests → Click request → Approve & Create User |
| Create Book Shop item | Book Shop → Create New Item → Fill form → Create |
| Edit Book Shop item | Book Shop → Click Edit → Update fields → Save |
| View Member details | Members → Click Member row → View details |
| Reset Member password | Members → Click Member → Reset Password → Confirm |
| Track payment | Payments → Filter by status → View details |
| Deactivate Member | Members → Click Member → Deactivate → Confirm |
| Find Member | Members → Use search box |
| Review access request | Access Requests → Click request row |

### Keyboard Shortcuts

- `Ctrl/Cmd + K` - Search users (if implemented)
- `Esc` - Close modals
- `Tab` - Navigate form fields

### Important URLs

- Admin Dashboard: `/admin`
- Access Requests: `/admin/access-requests`
- User Management: `/admin/users`
- Book Shop Management: `/admin/bookshop`
- Member Management: `/admin/members`
- Payment Tracking: `/admin/payments`
- Login Page: `/login`
- Landing Page: `/`

---

**Last Updated:** November 2025
**Version:** 1.0
