/**
 * 📱 Responsive Breakpoints & Utilities
 * 
 * Comprehensive responsive design system with mobile-first approach.
 * Features:
 * - Standardized breakpoints following Tailwind CSS
 * - Touch interaction utilities
 * - Device detection helpers
 * - Responsive component variants
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';

// ✅ Breakpoint definitions (mobile-first)
export const breakpoints = {
  xs: 0,      // Extra small devices (phones)
  sm: 640,    // Small devices (large phones)
  md: 768,    // Medium devices (tablets)
  lg: 1024,   // Large devices (desktops)
  xl: 1280,   // Extra large devices (large desktops)
  '2xl': 1536 // 2X Extra large devices (larger desktops)
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ✅ Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  
  // Max-width queries
  'max-xs': `(max-width: ${breakpoints.sm - 1}px)`,
  'max-sm': `(max-width: ${breakpoints.md - 1}px)`,
  'max-md': `(max-width: ${breakpoints.lg - 1}px)`,
  'max-lg': `(max-width: ${breakpoints.xl - 1}px)`,
  'max-xl': `(max-width: ${breakpoints['2xl'] - 1}px)`,
  
  // Range queries
  'sm-only': `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  'md-only': `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  'lg-only': `(min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  
  // Device-specific
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
  
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // Touch capabilities
  touch: '(hover: none) and (pointer: coarse)',
  'no-touch': '(hover: hover) and (pointer: fine)'
} as const;

// ✅ Custom hook for responsive breakpoints
export const useBreakpoint = (breakpoint: Breakpoint) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mediaQueries[breakpoint]);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [breakpoint]);

  return matches;
};

// ✅ Custom hook for current breakpoint
export const useCurrentBreakpoint = (): Breakpoint => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return currentBreakpoint;
};

// ✅ Device detection hooks
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mediaQueries.mobile);
    setIsMobile(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isMobile;
};

export const useIsTablet = () => {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mediaQueries.tablet);
    setIsTablet(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setIsTablet(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isTablet;
};

export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mediaQueries.desktop);
    setIsDesktop(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDesktop;
};

// ✅ Touch detection
export const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(mediaQueries.touch);
    setIsTouchDevice(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setIsTouchDevice(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isTouchDevice;
};

// ✅ Responsive grid configurations
export const gridConfigs = {
  masterList: {
    xs: 'grid-cols-1',
    sm: 'sm:grid-cols-1',
    md: 'md:grid-cols-2',
    lg: 'lg:grid-cols-3',
    xl: 'xl:grid-cols-4',
    '2xl': '2xl:grid-cols-5'
  },
  statsCards: {
    xs: 'grid-cols-1',
    sm: 'sm:grid-cols-2',
    md: 'md:grid-cols-2',
    lg: 'lg:grid-cols-4',
    xl: 'xl:grid-cols-4',
    '2xl': '2xl:grid-cols-4'
  },
  dashboard: {
    xs: 'grid-cols-1',
    sm: 'sm:grid-cols-1',
    md: 'md:grid-cols-2',
    lg: 'lg:grid-cols-3',
    xl: 'xl:grid-cols-4',
    '2xl': '2xl:grid-cols-6'
  }
} as const;

// ✅ Responsive spacing
export const spacing = {
  container: {
    xs: 'px-4',
    sm: 'sm:px-6',
    lg: 'lg:px-8'
  },
  section: {
    xs: 'py-6',
    sm: 'sm:py-8',
    lg: 'lg:py-12'
  },
  card: {
    xs: 'p-4',
    sm: 'sm:p-6',
    lg: 'lg:p-8'
  }
} as const;

// ✅ Responsive typography
export const typography = {
  heading: {
    xs: 'text-2xl',
    sm: 'sm:text-3xl',
    lg: 'lg:text-4xl'
  },
  subheading: {
    xs: 'text-lg',
    sm: 'sm:text-xl',
    lg: 'lg:text-2xl'
  },
  body: {
    xs: 'text-sm',
    sm: 'sm:text-base',
    lg: 'lg:text-lg'
  }
} as const;

// ✅ Touch interaction utilities
export const touchInteractions = {
  // Touch-friendly button sizes
  button: {
    touch: 'min-h-[44px] min-w-[44px]', // Apple's recommended minimum
    desktop: 'min-h-[36px] min-w-[36px]'
  },
  
  // Touch-friendly spacing
  touchSpacing: {
    xs: 'gap-2',
    touch: 'gap-4'
  },
  
  // Hover states (disabled on touch)
  hover: {
    desktop: 'hover:bg-gray-50 hover:shadow-md',
    touch: 'active:bg-gray-50 active:scale-95'
  }
} as const;

// ✅ Utility function to get responsive classes
export const getResponsiveClasses = (
  config: Record<string, string> | null | undefined,
  prefix: string = ''
): string => {
  // ✅ Handle null/undefined config
  if (!config || typeof config !== 'object') {
    return '';
  }
  
  return Object.entries(config)
    .map(([breakpoint, className]) => {
      if (breakpoint === 'xs') {
        return `${prefix}${className}`;
      }
      return `${breakpoint}:${prefix}${className}`;
    })
    .join(' ');
};

// ✅ Utility function for conditional responsive classes
export const responsiveClass = (
  mobile: string,
  tablet?: string,
  desktop?: string
): string => {
  const classes = [mobile];
  
  if (tablet) {
    classes.push(`md:${tablet}`);
  }
  
  if (desktop) {
    classes.push(`lg:${desktop}`);
  }
  
  return classes.join(' ');
};

// ✅ Container queries support (experimental)
export const containerQueries = {
  sm: '@container (min-width: 20rem)',
  md: '@container (min-width: 28rem)',
  lg: '@container (min-width: 32rem)',
  xl: '@container (min-width: 36rem)',
  '2xl': '@container (min-width: 42rem)'
} as const;

export default {
  breakpoints,
  mediaQueries,
  useBreakpoint,
  useCurrentBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouchDevice,
  gridConfigs,
  spacing,
  typography,
  touchInteractions,
  getResponsiveClasses,
  responsiveClass,
  containerQueries
};
