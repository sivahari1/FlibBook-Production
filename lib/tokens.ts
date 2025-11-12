import crypto from 'crypto';
import { prisma } from './db';
import { logger } from './logger';

// Token type definition matching Prisma schema
type TokenType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

/**
 * Token data returned after generation
 */
export interface TokenData {
  token: string;      // Plain text token (sent to user)
  hashedToken: string; // Hashed token (stored in DB)
  expiresAt: Date;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  valid: boolean;
  userId?: string;
  error?: string;
}

/**
 * Generate a cryptographically secure verification token
 * 
 * @param userId - The user ID to associate with the token
 * @param type - The type of token (EMAIL_VERIFICATION or PASSWORD_RESET)
 * @returns TokenData containing the plain token, hashed token, and expiration date
 */
export async function generateVerificationToken(
  userId: string,
  type: TokenType
): Promise<TokenData> {
  try {
    // Generate a cryptographically secure random token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');

    // Hash the token using SHA-256 for secure storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Set expiration based on token type
    const expirationHours = type === 'EMAIL_VERIFICATION' ? 24 : 1;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    // Store the hashed token in the database
    await prisma.verificationToken.create({
      data: {
        userId,
        token: hashedToken,
        type,
        expiresAt,
      },
    });

    logger.info('Verification token generated', {
      userId,
      type,
      expiresAt,
    });

    // Return the plain token (to send to user) along with metadata
    return {
      token,
      hashedToken,
      expiresAt,
    };
  } catch (error) {
    logger.error('Failed to generate verification token', {
      userId,
      type,
      error,
    });
    throw new Error('Failed to generate verification token');
  }
}

/**
 * Validate a verification token
 * 
 * @param token - The plain text token to validate
 * @param type - The expected token type
 * @returns TokenValidation result with validity status and user ID if valid
 */
export async function validateToken(
  token: string,
  type: TokenType
): Promise<TokenValidation> {
  try {
    // Hash the received token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find the token in the database
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    // Check if token exists
    if (!tokenRecord) {
      logger.warn('Token validation failed: token not found', { type });
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    // Check if token type matches
    if (tokenRecord.type !== type) {
      logger.warn('Token validation failed: type mismatch', {
        expected: type,
        actual: tokenRecord.type,
      });
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    // Check if token has expired
    if (tokenRecord.expiresAt < new Date()) {
      logger.warn('Token validation failed: token expired', {
        userId: tokenRecord.userId,
        type,
        expiresAt: tokenRecord.expiresAt,
      });
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    logger.info('Token validated successfully', {
      userId: tokenRecord.userId,
      type,
    });

    return {
      valid: true,
      userId: tokenRecord.userId,
    };
  } catch (error) {
    logger.error('Token validation error', { type, error });
    return {
      valid: false,
      error: 'Token validation failed',
    };
  }
}

/**
 * Invalidate all tokens for a user
 * 
 * @param userId - The user ID whose tokens should be invalidated
 * @param type - Optional token type to filter by (if not provided, all types are invalidated)
 */
export async function invalidateUserTokens(
  userId: string,
  type?: TokenType
): Promise<void> {
  try {
    const where: { userId: string; type?: TokenType } = { userId };
    
    if (type) {
      where.type = type;
    }

    const result = await prisma.verificationToken.deleteMany({
      where,
    });

    logger.info('User tokens invalidated', {
      userId,
      type: type || 'all',
      count: result.count,
    });
  } catch (error) {
    logger.error('Failed to invalidate user tokens', {
      userId,
      type,
      error,
    });
    throw new Error('Failed to invalidate tokens');
  }
}

/**
 * Clean up expired tokens from the database
 * This should be run periodically (e.g., daily cron job)
 * 
 * @returns The number of tokens deleted
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    // Delete tokens that expired more than 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    logger.info('Expired tokens cleaned up', {
      count: result.count,
      olderThan: sevenDaysAgo,
    });

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired tokens', { error });
    throw new Error('Failed to cleanup expired tokens');
  }
}
