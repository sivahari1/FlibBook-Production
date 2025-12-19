/**
 * Admin-specific type definitions
 * Used for admin dashboard, user management, and administrative operations
 */

/**
 * User role enumeration
 */
export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'PLATFORM_USER' | 'MEMBER' | 'READER_USER';

/**
 * Price plan enumeration
 */
export type PricePlan = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

/**
 * Admin user interface
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  userRole: UserRole;
  pricePlan: PricePlan | null;
  notes: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    documents: number;
    shares?: number;
  };
}

/**
 * Member user interface (for member management)
 */
export interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    purchases: number;
  };
}

/**
 * Access request interface
 */
export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bookshop item interface
 */
export interface BookshopItem {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  contentType: string;
  fileUrl: string | null;
  linkUrl: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    purchases: number;
  };
}

/**
 * Payment transaction interface
 */
export interface PaymentTransaction {
  id: string;
  userId: string;
  bookshopItemId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
  user?: {
    name: string | null;
    email: string;
  };
  bookshopItem?: {
    title: string;
  };
}

/**
 * Document analytics interface
 */
export interface DocumentAnalytics {
  documentId: string;
  totalViews: number;
  uniqueViewers: number;
  totalShares: number;
  activeShares: number;
  lastViewedAt: Date | null;
}

/**
 * System analytics interface
 */
export interface SystemAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  totalShares: number;
  totalStorage: number;
  recentActivity: ActivityLog[];
}

/**
 * Activity log interface
 */
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user?: {
    name: string | null;
    email: string;
  };
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  user?: {
    name: string | null;
    email: string;
  };
}

/**
 * Admin dashboard statistics
 */
export interface DashboardStats {
  users: {
    total: number;
    active: number;
    new: number;
  };
  documents: {
    total: number;
    uploaded: number;
    shared: number;
  };
  shares: {
    total: number;
    active: number;
    expired: number;
  };
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
  revenue?: {
    total: number;
    thisMonth: number;
    lastMonth: number;
  };
}

/**
 * User filter options
 */
export interface UserFilterOptions {
  role?: UserRole;
  pricePlan?: PricePlan;
  isActive?: boolean;
  emailVerified?: boolean;
  search?: string;
}

/**
 * Bookshop filter options
 */
export interface BookshopFilterOptions {
  category?: string;
  contentType?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

/**
 * Payment filter options
 */
export interface PaymentFilterOptions {
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
  userId?: string;
  bookshopItemId?: string;
  startDate?: Date;
  endDate?: Date;
}
