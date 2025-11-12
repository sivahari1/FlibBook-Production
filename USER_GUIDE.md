# FlipBook DRM User Guide

Welcome to FlipBook DRM! This guide will help you get started with managing and sharing your PDF documents securely.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Account Management](#account-management)
3. [Document Management](#document-management)
4. [Sharing Documents](#sharing-documents)
5. [Viewing Shared Documents](#viewing-shared-documents)
6. [Analytics](#analytics)
7. [Subscription Plans](#subscription-plans)
8. [Frequently Asked Questions](#frequently-asked-questions)

## Getting Started

### Creating Your Account

1. **Navigate to Registration**:
   - Go to the FlipBook DRM homepage
   - Click "Sign Up" or "Register"

2. **Fill in Your Details**:
   - Enter your email address
   - Create a strong password (minimum 8 characters)
   - Password must include:
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - At least one special character

3. **Submit Registration**:
   - Click "Create Account"
   - You'll see a success message

4. **Verify Your Email**:
   - Check your email inbox for a verification email
   - Click the "Verify Email Address" button in the email
   - You'll be redirected to your dashboard
   - **Important**: You must verify your email before accessing your account

### Email Verification

**Why do I need to verify my email?**
- Ensures you own the email address
- Enables password recovery
- Protects your account from unauthorized access
- Required for receiving share notifications

**What if I didn't receive the verification email?**

1. Check your spam/junk folder
2. Wait a few minutes (emails can be delayed)
3. Click "Resend Verification Email" on the verification page
4. Make sure you entered the correct email address

**How long is the verification link valid?**
- Verification links expire after 24 hours
- If expired, simply request a new verification email
- You can resend as many times as needed (with 60-second cooldown)

### Logging In

1. **Go to Login Page**:
   - Click "Login" or "Sign In"

2. **Enter Credentials**:
   - Email address
   - Password

3. **Access Dashboard**:
   - After successful login, you'll see your dashboard
   - If your email isn't verified, you'll be redirected to verify first

## Account Management

### Resetting Your Password

**If you forgot your password:**

1. **Go to Login Page**:
   - Click "Forgot Password?" link

2. **Enter Your Email**:
   - Type the email address associated with your account
   - Click "Send Reset Link"

3. **Check Your Email**:
   - Look for a password reset email
   - Click the "Reset Password" button in the email
   - **Note**: Reset links expire after 1 hour

4. **Create New Password**:
   - Enter your new password
   - Confirm the new password
   - Password must meet security requirements
   - Click "Reset Password"

5. **Login with New Password**:
   - You'll be redirected to the login page
   - Use your new password to sign in
   - All previous sessions will be logged out for security

**Security Tips:**
- Never share your password with anyone
- Use a unique password for FlipBook DRM
- Consider using a password manager
- Change your password regularly

### Resending Verification Email

If you need a new verification email:

1. **Go to Verification Page**:
   - You'll be automatically redirected if unverified
   - Or visit `/verify-email` directly

2. **Click "Resend Verification Email"**:
   - A new email will be sent immediately
   - Previous verification links will be invalidated

3. **Rate Limiting**:
   - You can request a new email once per 60 seconds
   - This prevents spam and abuse

## Document Management

### Uploading Documents

1. **Access Dashboard**:
   - Login to your account
   - You'll see your document list

2. **Click "Upload Document"**:
   - Select a PDF file from your computer
   - Maximum file size: 50MB
   - Only PDF files are supported

3. **Wait for Upload**:
   - Upload progress will be displayed
   - Document will appear in your list when complete

### Viewing Your Documents

- **Document List**: Shows all your uploaded PDFs
- **Search**: Find documents by name
- **Sort**: Organize by date, name, or size
- **Details**: Click on a document to see full details

### Deleting Documents

1. **Select Document**:
   - Click on the document you want to delete

2. **Click "Delete"**:
   - Confirm deletion
   - **Warning**: This action cannot be undone
   - All shares will be revoked

## Sharing Documents

FlipBook DRM offers two ways to share documents: Link Sharing and Email Sharing.

### Link Sharing

**Create a shareable link for your document:**

1. **Open Document Details**:
   - Click on the document you want to share

2. **Click "Share via Link"**:
   - A dialog will open with sharing options

3. **Configure Share Settings**:

   **Expiration Date** (Optional):
   - Set when the link should stop working
   - Leave blank for no expiration

   **Password Protection** (Optional):
   - Add a password for extra security
   - Recipients must enter password to view

   **View Limit** (Optional):
   - Limit number of times document can be viewed
   - Range: 1 to 10,000 views

   **Email Restriction** (Optional):
   - Limit access to specific email address
   - Only that email can view the document

   **Download Permission**:
   - Allow or prevent downloading
   - Recommended: Keep disabled for DRM protection

4. **Generate Link**:
   - Click "Generate Share Link"
   - Copy the link to share with recipients

5. **Share the Link**:
   - Send via email, chat, or any method
   - Include password separately if used

### Email Sharing

**Share directly to someone's email:**

1. **Open Document Details**:
   - Click on the document you want to share

2. **Click "Share via Email"**:
   - A dialog will open

3. **Enter Recipient Details**:

   **Email Address** (Required):
   - Enter recipient's email address
   - Can be any valid email

   **Personal Note** (Optional):
   - Add a message for the recipient
   - Maximum 500 characters

   **Expiration Date** (Optional):
   - Set when access should expire

   **Download Permission**:
   - Allow or prevent downloading

4. **Send Share**:
   - Click "Share Document"
   - Recipient will receive notification (if implemented)
   - Share will appear in their inbox

### Managing Shares

**View and manage all shares for a document:**

1. **Open Document Details**:
   - Click on any document

2. **View "Shares" Tab**:
   - See all active shares
   - View share details (type, recipient, expiration)

3. **Copy Share Link**:
   - Click copy icon next to link shares
   - Share link copied to clipboard

4. **Revoke Share**:
   - Click "Revoke" button
   - Confirm revocation
   - Share will be immediately disabled
   - Recipients can no longer access document

## Viewing Shared Documents

### Accessing Your Inbox

**View documents others have shared with you:**

1. **Click "Inbox" in Navigation**:
   - See all documents shared with you

2. **Browse Shared Documents**:
   - **Title**: Document name
   - **Shared By**: Who shared it with you
   - **Shared On**: When it was shared
   - **Expires**: When access ends (if set)
   - **Note**: Personal message from sender

3. **Sort and Filter**:
   - Sort by title, sender, or date
   - Find specific documents quickly

4. **View Document**:
   - Click "View" to open the document
   - Document opens in secure viewer

### Using the Document Viewer

**When viewing a shared document:**

1. **Navigation**:
   - Use arrow buttons to navigate pages
   - Or use keyboard arrows (← →)
   - Page counter shows current page

2. **Zoom Controls**:
   - Zoom in/out buttons
   - Fit to width/height options

3. **Watermarks**:
   - Your email appears on each page
   - Timestamp shows when you viewed it
   - This tracks document usage

4. **DRM Protection**:
   - Right-click is disabled
   - Text selection is disabled
   - Printing is disabled
   - Screenshots are discouraged
   - These protect the document owner's content

5. **Download** (if allowed):
   - Click download button if enabled
   - Original PDF will be downloaded
   - Watermark may be applied

## Analytics

**Track who viewed your documents:**

1. **Open Document Details**:
   - Click on any document you own

2. **View "Analytics" Tab**:
   - See view history
   - View timeline chart

3. **Analytics Data**:
   - **Viewer Email**: Who viewed the document
   - **View Time**: When they viewed it
   - **IP Address**: Where they viewed from
   - **Device Info**: Browser and device used
   - **Duration**: How long they viewed

4. **Insights**:
   - Total views count
   - Unique viewers count
   - Most active viewers
   - View patterns over time

## Subscription Plans

### Free Plan

**Included:**
- 100MB storage
- Up to 5 documents
- Basic sharing features
- Email verification
- Password reset

**Limitations:**
- Storage limit
- Document limit

### Pro Plan (₹999/month)

**Included:**
- 10GB storage
- Unlimited documents
- All sharing features
- Priority support
- Advanced analytics

**Upgrade Benefits:**
- More storage for large PDFs
- No document limits
- Better for professionals

### Enterprise Plan (₹4999/month)

**Included:**
- Unlimited storage
- Unlimited documents
- API access
- Custom branding
- Dedicated support
- SLA guarantees

**Best For:**
- Organizations
- High-volume users
- Custom integrations

### Upgrading Your Plan

1. **Go to Subscription Page**:
   - Click "Subscription" in navigation

2. **Choose Plan**:
   - Review plan features
   - Click "Upgrade" on desired plan

3. **Complete Payment**:
   - Enter payment details
   - Powered by Razorpay (secure)
   - Confirm subscription

4. **Enjoy New Features**:
   - Limits updated immediately
   - Access to new features

## Frequently Asked Questions

### Account & Security

**Q: Why do I need to verify my email?**

A: Email verification ensures you own the email address, enables password recovery, and protects your account from unauthorized access. It's a security best practice.

**Q: I didn't receive the verification email. What should I do?**

A: First, check your spam/junk folder. If it's not there, wait a few minutes as emails can be delayed. You can also click "Resend Verification Email" on the verification page. Make sure you entered the correct email address during registration.

**Q: How long is the verification link valid?**

A: Verification links expire after 24 hours for security reasons. If your link has expired, simply request a new one by clicking "Resend Verification Email."

**Q: Can I change my email address?**

A: Currently, email changes are not supported through the UI. Contact support if you need to change your email address.

**Q: How do I reset my password?**

A: Click "Forgot Password?" on the login page, enter your email, and follow the instructions in the reset email. The reset link expires after 1 hour.

**Q: What if I don't receive the password reset email?**

A: Check your spam folder first. If you still don't see it, try requesting another reset email. Make sure you're using the email address associated with your account.

**Q: Why was I logged out after resetting my password?**

A: For security, all active sessions are terminated when you reset your password. This prevents unauthorized access if someone else had access to your account.

**Q: How often can I request verification or reset emails?**

A: You can request a new email once per 60 seconds. This rate limit prevents spam and abuse while still allowing you to resend if needed.

### Document Management

**Q: What file types can I upload?**

A: Currently, only PDF files are supported. The maximum file size is 50MB.

**Q: How many documents can I upload?**

A: Free plan: 5 documents. Pro plan: Unlimited. Enterprise plan: Unlimited.

**Q: Can I edit a document after uploading?**

A: No, documents cannot be edited after upload. You'll need to upload a new version.

**Q: What happens to shares when I delete a document?**

A: All shares are automatically revoked when you delete a document. Recipients will no longer be able to access it.

### Sharing

**Q: What's the difference between link sharing and email sharing?**

A: Link sharing generates a URL you can share anywhere. Email sharing sends access directly to a specific email address and appears in their inbox.

**Q: Can I password-protect a share?**

A: Yes, when creating a link share, you can add password protection. Recipients must enter the password to view the document.

**Q: How do I revoke a share?**

A: Open the document details, go to the "Shares" tab, and click "Revoke" next to the share you want to disable.

**Q: Can I see who viewed my shared document?**

A: Yes, go to the document's "Analytics" tab to see detailed view history including viewer email, time, and device information.

**Q: What does "view limit" mean?**

A: View limit restricts how many times a document can be viewed through a share link. Once the limit is reached, the link stops working.

**Q: Can recipients download my documents?**

A: Only if you enable download permission when creating the share. By default, downloads are disabled to protect your content.

### Email Verification & Password Reset

**Q: Do I need to verify my email to use the app?**

A: Yes, email verification is required to access your dashboard and use FlipBook DRM features. This ensures account security and enables password recovery.

**Q: Can I use the app while waiting for verification?**

A: No, you must verify your email before accessing any features. This is a security requirement.

**Q: What if my verification link expired?**

A: No problem! Just click "Resend Verification Email" on the verification page. You'll receive a new link that's valid for 24 hours.

**Q: How many times can I resend the verification email?**

A: You can resend as many times as needed, but there's a 60-second cooldown between requests to prevent spam.

**Q: I clicked the verification link but got an error. What should I do?**

A: The link may have expired (24-hour limit) or already been used. Request a new verification email and try again. If the problem persists, contact support.

**Q: Can I verify my email later?**

A: You can delay verification, but you won't be able to access your dashboard or any features until you verify. We recommend verifying immediately after registration.

**Q: What if I entered the wrong email during registration?**

A: Contact support to update your email address. You won't be able to verify with an incorrect email.

**Q: How secure is the password reset process?**

A: Very secure! Reset links expire after 1 hour, can only be used once, and all your active sessions are logged out when you reset your password.

**Q: Can someone else reset my password?**

A: No. Even if someone requests a reset for your email, they would need access to your email inbox to get the reset link. Always keep your email account secure.

**Q: Why does the reset link expire so quickly?**

A: The 1-hour expiration is a security measure. It minimizes the window for potential unauthorized access if someone intercepts the email.

### DRM & Security

**Q: Why can't I copy text from documents?**

A: This is part of the DRM (Digital Rights Management) protection to prevent unauthorized copying of content.

**Q: Why are watermarks added to documents?**

A: Watermarks track who viewed the document and when. This discourages unauthorized sharing and helps identify the source if content is leaked.

**Q: Can I remove watermarks?**

A: No, watermarks are automatically applied to all viewed documents for security and tracking purposes.

**Q: What information is tracked when I view a document?**

A: We track viewer email, view time, IP address, device information, and viewing duration. This helps document owners understand how their content is being used.

### Subscription & Billing

**Q: Can I try Pro features before upgrading?**

A: Currently, there's no free trial. However, you can use the Free plan to test basic features before upgrading.

**Q: How do I cancel my subscription?**

A: Contact support to cancel your subscription. Your access will continue until the end of your billing period.

**Q: What happens if I exceed my storage limit?**

A: You won't be able to upload new documents until you delete some or upgrade your plan.

**Q: Are payments secure?**

A: Yes, all payments are processed through Razorpay, a secure payment gateway. We never store your payment information.

### Technical Issues

**Q: The app isn't loading. What should I do?**

A: Try refreshing the page, clearing your browser cache, or using a different browser. If the problem persists, contact support.

**Q: I'm getting an error when uploading. Why?**

A: Check that your file is a PDF and under 50MB. Also ensure you haven't reached your document limit. If the error continues, try a different browser.

**Q: Why is my document taking so long to load?**

A: Large documents may take longer to load. Ensure you have a stable internet connection. The viewer loads pages progressively for better performance.

**Q: Can I use FlipBook DRM on mobile?**

A: Yes, the app is responsive and works on mobile devices. However, some features work best on desktop browsers.

### Privacy & Data

**Q: Who can see my documents?**

A: Only you and people you explicitly share with can see your documents. Documents are private by default.

**Q: Is my data encrypted?**

A: Yes, all data is transmitted over HTTPS. Passwords are hashed using bcrypt. Documents are stored securely in Supabase Storage.

**Q: Can FlipBook DRM staff see my documents?**

A: Staff do not access user documents unless required for technical support and with user permission.

**Q: How long is my data stored?**

A: Your data is stored as long as your account is active. Deleted documents are permanently removed from storage.

**Q: Can I export my data?**

A: Contact support to request a data export. We'll provide your documents and account information.

## Getting Help

### Contact Support

If you need assistance:

1. **Check this User Guide**: Most questions are answered here
2. **Review FAQ**: Common issues and solutions
3. **Contact Support**: Email support with your issue
4. **Include Details**: Account email, error messages, screenshots

### Reporting Issues

When reporting a problem:

- Describe what you were trying to do
- Explain what happened instead
- Include any error messages
- Mention your browser and device
- Attach screenshots if helpful

### Feature Requests

Have an idea for a new feature?

- Email your suggestion to support
- Explain the use case
- Describe how it would help you
- We review all feedback!

---

**Thank you for using FlipBook DRM!**

We're committed to providing secure, reliable document sharing. If you have any questions or feedback, please don't hesitate to reach out.

**Last Updated**: November 2025  
**Version**: 1.0.0
