/**
 * 🔑 React-Safe Key Generator
 * 
 * Generates stable, unique keys that work correctly with React 19's Strict Mode.
 * Uses a combination of context, prefix, and controlled randomness to ensure
 * keys remain consistent across re-renders while being globally unique.
 * 
 * @param prefix - The prefix for the key (e.g., 'equipos', 'servicios')
 * @param contextId - Context identifier for scoping uniqueness
 * @returns Stable unique key string
 */

// Global counter for ensuring uniqueness within the same session
let globalCounter = 0;

// Cache for storing generated keys to ensure consistency
const keyCache = new Map<string, string>();

// Component instance counter to handle multiple instances of the same component
let componentInstanceCounter = 0;
const componentInstances = new Map<string, number>();

function generateStableUniqueKey(prefix: string, contextId?: string): string {
  const baseKey = `${prefix}-${contextId || 'default'}`;
  
  // Generate a unique instance identifier for this component context
  if (!componentInstances.has(baseKey)) {
    componentInstances.set(baseKey, ++componentInstanceCounter);
  }
  
  const instanceId = componentInstances.get(baseKey)!;
  const cacheKey = `${baseKey}-instance-${instanceId}`;
  
  // Return cached key if it exists (ensures consistency across re-renders)
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }
  
  // Generate new stable key with instance identifier
  const timestamp = Date.now();
  const counter = ++globalCounter;
  const sessionId = Math.random().toString(36).substring(2, 8);
  
  const parts = [
    prefix,
    contextId || 'default',
    `inst${instanceId}`,
    timestamp.toString(36),
    counter.toString(36),
    sessionId
  ];
  
  const newKey = parts.join('-');
  keyCache.set(cacheKey, newKey);
  
  return newKey;
}

/**
 * Generate unique key for equipos category
 */
export function generateEquiposKey(contextId?: string): string {
  return generateStableUniqueKey('equipos', contextId);
}

/**
 * Generate unique key for servicios category
 */
export function generateServiciosKey(contextId?: string): string {
  return generateStableUniqueKey('servicios', contextId);
}

/**
 * Generate unique key for gastos category
 */
export function generateGastosKey(contextId?: string): string {
  return generateStableUniqueKey('gastos', contextId);
}

/**
 * Generate unique key with custom prefix
 */
export function generateUniqueKey(prefix: string, contextId?: string): string {
  return generateStableUniqueKey(prefix, contextId);
}

/**
 * Clear the key cache (useful for testing or when context changes)
 */
export function clearKeyCache(): void {
  keyCache.clear();
  componentInstances.clear();
  globalCounter = 0;
  componentInstanceCounter = 0;
}
