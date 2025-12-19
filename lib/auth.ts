import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { logger } from "./logger";
import { AuthUser } from "./types/common";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required");
          }

          // Rate limiting for login attempts
          const { checkRateLimit, RATE_LIMITS } = await import('./rate-limit');
          const rateLimitResult = checkRateLimit(
            `login:${credentials.email}`,
            RATE_LIMITS.LOGIN_ATTEMPT
          );

          if (!rateLimitResult.success) {
            logger.logRateLimitViolation('login', credentials.email, {
              retryAfter: rateLimitResult.retryAfter,
            });
            throw new Error(`Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`);
          }

          // Find user by email with database error handling
          let user;
          try {
            user = await prisma.user.findUnique({
              where: { email: credentials.email },
              select: {
                id: true,
                email: true,
                name: true,
                passwordHash: true,
                subscription: true,
                role: true,
                userRole: true,
                additionalRoles: true,
                emailVerified: true,
                isActive: true
              }
            });
          } catch (dbError) {
            // Log the actual database error for debugging
            const error = dbError as { message?: string; code?: string };
            logger.error('Database error during login', {
              email: credentials.email,
              error: error.message,
              code: error.code
            });
            
            // Check if it's a connection error
            if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
              throw new Error("Database temporarily unavailable. Please try again in a few seconds.");
            }
            
            // For other database errors, throw a generic message
            throw new Error("Login service temporarily unavailable. Please try again.");
          }

          if (!user) {
            // Log failed login attempt
            logger.warn('Login attempt with invalid email', { email: credentials.email });
            throw new Error("Invalid email or password");
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            logger.warn('Login attempt with invalid password', { 
              email: credentials.email,
              userId: user.id 
            });
            throw new Error("Invalid email or password");
          }

          // Check if user is active
          if (!user.isActive) {
            logger.warn('Login attempt by inactive user', { 
              email: credentials.email,
              userId: user.id 
            });
            throw new Error("Account is inactive. Please contact support.");
          }

          // Successful login
          logger.info('Successful login', {
            userId: user.id,
            email: user.email,
            userRole: user.userRole
          });

          // Return user object for session (including emailVerified status and userRole)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            subscription: user.subscription,
            role: user.role,
            userRole: user.userRole,
            additionalRoles: user.additionalRoles || [],
            emailVerified: user.emailVerified,
            isActive: user.isActive
          };
        } catch (error) {
          // Re-throw the error with the message intact
          // NextAuth will display this message to the user
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
    verifyRequest: "/verify-email",
    newUser: "/dashboard"
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Add user data to token on sign in
      if (user) {
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name;
        token.subscription = authUser.subscription;
        token.role = authUser.role;
        token.userRole = authUser.userRole;
        token.additionalRoles = authUser.additionalRoles || [];
        token.emailVerified = authUser.emailVerified;
        token.isActive = authUser.isActive;
      }
      
      // Refresh emailVerified status and userRole on update trigger
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { 
            emailVerified: true,
            userRole: true,
            additionalRoles: true,
            isActive: true
          }
        });
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified;
          token.userRole = dbUser.userRole;
          token.additionalRoles = dbUser.additionalRoles || [];
          token.isActive = dbUser.isActive;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Add user data from token to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.subscription = token.subscription as string;
        session.user.role = token.role as string;
        session.user.userRole = token.userRole as string;
        session.user.additionalRoles = token.additionalRoles as string[] || [];
        session.user.emailVerified = token.emailVerified as boolean;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
    async signIn({ user }) {
      // Allow sign in but will redirect unverified users in middleware
      const authUser = user as AuthUser;
      if (user && !authUser.emailVerified) {
        logger.info('Unverified user login attempt', { 
          userId: user.id, 
          email: user.email 
        });
      }
      
      // Log role-based login for audit
      if (user) {
        logger.info('User login', {
          userId: user.id,
          email: user.email,
          userRole: authUser.userRole
        });
        
        // Log audit event for admin logins
        if (authUser.userRole === 'ADMIN') {
          // Import dynamically to avoid circular dependencies
          import('./audit-log').then(({ logAuditEvent }) => {
            logAuditEvent({
              action: 'admin_login',
              userId: user.id,
              userEmail: user.email,
              success: true,
            }).catch(err => {
              logger.error('Failed to log admin login audit event', err);
            });
          });
        }
      }
      
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development"
};

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper function to verify passwords
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
