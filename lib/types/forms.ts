/**
 * Form data type definitions
 * Used across authentication and user input forms
 */

/**
 * Login form data structure
 */
export interface LoginFormData {
  email: string;
  password: string;
  callbackUrl?: string;
}

/**
 * Registration form data structure
 */
export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Forgot password form data structure
 */
export interface ForgotPasswordFormData {
  email: string;
}

/**
 * Reset password form data structure
 */
export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  token: string;
}

/**
 * Email verification form data structure
 */
export interface EmailVerificationFormData {
  token: string;
}

/**
 * Change password form data structure
 */
export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Document upload form data structure
 */
export interface DocumentUploadFormData {
  title: string;
  file: File;
  contentType?: string;
}

/**
 * Link upload form data structure
 */
export interface LinkUploadFormData {
  title: string;
  url: string;
  contentType: 'LINK';
}

/**
 * Share link form data structure
 */
export interface ShareLinkFormData {
  expiresIn?: number;
  maxViews?: number;
  password?: string;
  allowDownload?: boolean;
  watermarkText?: string;
}

/**
 * Email share form data structure
 */
export interface EmailShareFormData {
  recipientEmail: string;
  message?: string;
  expiresIn?: number;
  allowDownload?: boolean;
  watermarkText?: string;
}

/**
 * Bookshop item form data structure
 */
export interface BookshopItemFormData {
  title: string;
  description: string;
  category: string;
  price: number;
  contentType: string;
  file?: File;
  url?: string;
  thumbnailUrl?: string;
}

/**
 * User edit form data structure
 */
export interface UserEditFormData {
  name: string;
  email: string;
  userRole: string;
  pricePlan?: string;
  notes?: string;
  isActive: boolean;
}

/**
 * User creation form data structure
 */
export interface UserCreationFormData {
  name: string;
  email: string;
  password: string;
  userRole: string;
  pricePlan?: string;
  notes?: string;
}

/**
 * Access request form data structure
 */
export interface AccessRequestFormData {
  name: string;
  email: string;
  organization?: string;
  purpose: string;
}

/**
 * Form validation error structure
 */
export interface FormErrors {
  [key: string]: string;
}

/**
 * Form submission state
 */
export interface FormState {
  isLoading: boolean;
  isSuccess: boolean;
  errors: FormErrors;
  serverError?: string;
}
