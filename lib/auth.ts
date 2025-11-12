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

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
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

        // Return user object for session (including emailVerified status)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          subscription: user.subscription,
          role: user.role,
          emailVerified: user.emailVerified
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
        token.emailVerified = (user as any).emailVerified;
      }
      
      // Refresh emailVerified status on update trigger
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { emailVerified: true }
        });
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified;
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
        session.user.emailVerified = token.emailVerified as boolean;
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
      return true;
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
