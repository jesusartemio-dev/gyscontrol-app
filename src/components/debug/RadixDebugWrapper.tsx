/**
 * RadixDebugWrapper - Component to debug Radix UI ref issues
 * Wraps components and logs ref-related operations to identify infinite loops
 */
'use client';

import React, { useRef, useEffect, forwardRef, useCallback } from 'react';

interface RadixDebugWrapperProps {
  children: React.ReactNode;
  componentName: string;
  debugLevel?: 'minimal' | 'detailed' | 'verbose';
}

// ✅ Counter to track ref operations
let refOperationCount = 0;
const MAX_REF_OPERATIONS = 100;

// ✅ Map to track component render counts
const componentRenderCounts = new Map<string, number>();

// ✅ Debug wrapper component
export const RadixDebugWrapper = forwardRef<HTMLDivElement, RadixDebugWrapperProps>(
  ({ children, componentName, debugLevel = 'minimal' }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const renderCountRef = useRef(0);
    
    // ✅ Track render count
    renderCountRef.current += 1;
    const currentRenderCount = componentRenderCounts.get(componentName) || 0;
    componentRenderCounts.set(componentName, currentRenderCount + 1);

    // ✅ Ref callback with debugging
    const debugRef = useCallback((node: HTMLDivElement | null) => {
      refOperationCount += 1;
      
      if (debugLevel === 'verbose' || refOperationCount > MAX_REF_OPERATIONS) {
        console.log(`🔍 [RadixDebug] ${componentName} - Ref operation #${refOperationCount}`, {
          node: node ? 'attached' : 'detached',
          renderCount: renderCountRef.current,
          totalRenders: componentRenderCounts.get(componentName)
        });
      }

      // ✅ Warning for excessive ref operations
      if (refOperationCount > MAX_REF_OPERATIONS) {
        console.error(`🚨 [RadixDebug] INFINITE LOOP DETECTED in ${componentName}!`, {
          refOperations: refOperationCount,
          renderCount: renderCountRef.current,
          component: componentName
        });
      }

      // ✅ Set internal ref
      if (internalRef.current !== node) {
        internalRef.current = node;
      }

      // ✅ Forward ref if provided
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        ref.current = node;
      }
    }, [componentName, debugLevel, ref]);

    // ✅ Effect to log component lifecycle
    useEffect(() => {
      if (debugLevel === 'detailed' || debugLevel === 'verbose') {
        console.log(`📊 [RadixDebug] ${componentName} mounted/updated`, {
          renderCount: renderCountRef.current,
          refOperations: refOperationCount
        });
      }

      return () => {
        if (debugLevel === 'verbose') {
          console.log(`🗑️ [RadixDebug] ${componentName} cleanup`);
        }
      };
    }, [componentName, debugLevel]);

    // ✅ Reset counter periodically to prevent false positives
    useEffect(() => {
      const interval = setInterval(() => {
        if (refOperationCount > 0) {
          refOperationCount = Math.max(0, refOperationCount - 10);
        }
      }, 1000);

      return () => clearInterval(interval);
    }, []);

    return (
      <div 
        ref={debugRef}
        data-radix-debug={componentName}
        data-render-count={renderCountRef.current}
      >
        {children}
      </div>
    );
  }
);

RadixDebugWrapper.displayName = 'RadixDebugWrapper';

// ✅ Hook to get debug stats
export const useRadixDebugStats = () => {
  return {
    refOperationCount,
    componentRenderCounts: Object.fromEntries(componentRenderCounts),
    resetStats: () => {
      refOperationCount = 0;
      componentRenderCounts.clear();
    }
  };
};

// ✅ Component to display debug info
export const RadixDebugPanel: React.FC<{ show?: boolean }> = ({ show = false }) => {
  const stats = useRadixDebugStats();
  
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">🔍 Radix Debug Stats</h3>
      <div>Ref Operations: {stats.refOperationCount}</div>
      <div className="mt-2">
        <strong>Component Renders:</strong>
        {Object.entries(stats.componentRenderCounts).map(([name, count]) => (
          <div key={name} className={count > 50 ? 'text-red-400' : ''}>
            {name}: {count}
          </div>
        ))}
      </div>
      <button 
        onClick={stats.resetStats}
        className="mt-2 bg-blue-600 px-2 py-1 rounded text-xs"
      >
        Reset Stats
      </button>
    </div>
  );
};
