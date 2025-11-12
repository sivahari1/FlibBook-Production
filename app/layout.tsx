import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { validateEnv } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FlipBook DRM - Secure PDF Sharing Platform",
  description: "Upload, share, and protect your PDF documents with advanced DRM, dynamic watermarking, and comprehensive analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Validate environment variables on server side
  if (typeof window === 'undefined') {
    validateEnv();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <SessionProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
