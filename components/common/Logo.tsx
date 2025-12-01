'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  href?: string;
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

// Horizontal logo dimensions (vertical book, 2:3 aspect ratio, navbar-friendly)
const horizontalSizeMap = {
  sm: { width: 40, height: 60, text: 'text-sm' },
  md: { width: 60, height: 90, text: 'text-base' },
  lg: { width: 80, height: 120, text: 'text-lg' },
  xl: { width: 100, height: 150, text: 'text-2xl' }
};

// Vertical logo dimensions (2:3 aspect ratio)
const verticalSizeMap = {
  sm: { width: 67, height: 100, text: 'text-sm' },
  md: { width: 100, height: 150, text: 'text-base' },
  lg: { width: 133, height: 200, text: 'text-lg' },
  xl: { width: 167, height: 250, text: 'text-2xl' }
};

export default function Logo({ 
  size = 'md', 
  showText = true, 
  href = '/',
  className = '',
  variant = 'horizontal'
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeMap = variant === 'horizontal' ? horizontalSizeMap : verticalSizeMap;
  const { width, height, text } = sizeMap[size];

  // Determine logo source based on variant and theme
  const getLogoSrc = () => {
    if (!mounted) {
      // Default fallback during SSR
      return variant === 'horizontal' ? '/logo-horizontal.svg' : '/logo.svg';
    }

    if (variant === 'vertical') {
      return '/logo.svg'; // Original vertical logo
    }

    // Horizontal logo with theme support
    const isDark = resolvedTheme === 'dark';
    return isDark ? '/logo-horizontal-dark.svg' : '/logo-horizontal.svg';
  };

  const logoContent = (
    <div className={`flex items-center ${variant === 'horizontal' ? 'gap-0' : 'gap-2'} ${className}`}>
      <Image
        src={getLogoSrc()}
        alt="jStudyRoom Logo"
        width={width}
        height={height}
        priority
        className="object-contain"
      />
      {/* For horizontal variant, text is included in SVG. For vertical, show optional text */}
      {showText && variant === 'vertical' && (
        <span className={`font-bold text-gray-900 dark:text-white ${text}`}>
          jStudyRoom
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
