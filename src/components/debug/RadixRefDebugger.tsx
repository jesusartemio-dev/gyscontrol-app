'use client';

import React, { useEffect, useRef } from 'react';

/**
 * 🔍 Radix Ref Debugger - Detects infinite loops in Radix UI ref composition
 */
export const RadixRefDebugger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const refCallCount = useRef(0);
  const lastRefCallTime = useRef(0);
  const refCallsInLastSecond = useRef(0);
  
  useEffect(() => {
    // Override console.error to catch Radix ref errors
    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (errorMessage.includes('Maximum update depth exceeded')) {
        console.group('🚨 INFINITE LOOP DETECTED!');
        console.error('Original error:', ...args);
        console.error('Ref call count:', refCallCount.current);
        console.error('Ref calls in last second:', refCallsInLastSecond.current);
        console.trace('Stack trace at error detection');
        console.groupEnd();
        
        // Try to identify the problematic component
        const stack = new Error().stack;
        if (stack) {
          const radixMatches = stack.match(/at.*radix.*\.js/gi);
          if (radixMatches) {
            console.error('🎯 Radix components in stack:', radixMatches);
          }
        }
      }
      
      originalError(...args);
    };
    
    // Monitor ref calls frequency
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastCall = now - lastRefCallTime.current;
      
      if (timeSinceLastCall < 1000) {
        refCallsInLastSecond.current++;
        
        if (refCallsInLastSecond.current > 50) {
          console.error('🚨 EXCESSIVE REF CALLS DETECTED!', {
            callsInLastSecond: refCallsInLastSecond.current,
            totalCalls: refCallCount.current
          });
        }
      } else {
        refCallsInLastSecond.current = 0;
      }
    }, 100);
    
    return () => {
      console.error = originalError;
      clearInterval(interval);
    };
  }, []);
  
  // Track ref assignments
  useEffect(() => {
    const originalSetRef = (window as any).setRef;
    
    if (typeof originalSetRef === 'function') {
      (window as any).setRef = (...args: any[]) => {
        refCallCount.current++;
        lastRefCallTime.current = Date.now();
        
        if (refCallCount.current % 100 === 0) {
          console.warn('🔍 Ref call #', refCallCount.current);
        }
        
        return originalSetRef(...args);
      };
    }
  }, []);
  
  return <>{children}</>;
};

export default RadixRefDebugger;