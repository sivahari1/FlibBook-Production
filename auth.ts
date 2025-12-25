import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Export the auth function for server-side usage
export const auth = () => getServerSession(authOptions);