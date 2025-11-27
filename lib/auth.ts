import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { logger } from "./logger";

export const authOptions: NextAuthOptions = {
  adapter: process.env.DATABASE_URL ? (PrismaAdapter(prisma) as any) : undefined,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
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

        // Find user by email
        const user = await prisma.user.findUnique({
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

        if (!user) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error("Account is inactive. Please contact support.");
        }

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
    error: "/login"
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
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.subscription = (user as any).subscription;
        token.role = (user as any).role;
        token.userRole = (user as any).userRole;
        token.additionalRoles = (user as any).additionalRoles || [];
        token.emailVerified = (user as any).emailVerified;
        token.isActive = (user as any).isActive;
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
      if (user && !(user as any).emailVerified) {
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
          userRole: (user as any).userRole
        });
        
        // Log audit event for admin logins
        if ((user as any).userRole === 'ADMIN') {
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
      // Handle role-based redirects after sign in
      // If the URL is the base URL or login page, redirect based on role
      if (url === baseUrl || url.startsWith(baseUrl + '/login')) {
        // Get the user's role from the session (this is called after JWT callback)
        // We'll use a query parameter approach or check the token
        return baseUrl;
      }
      
      // If there's a callbackUrl, use it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default to base URL
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
