/**
 * 🎯 Hook useDebounce - Optimización de performance para inputs
 * 
 * Implementa debouncing para evitar llamadas excesivas a APIs
 * durante la escritura del usuario.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';

/**
 * Hook para debouncing de valores
 * 
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos (default: 300ms)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // ⏱️ Set timeout para actualizar el valor debounced
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 🧹 Cleanup: cancelar timeout si value cambia antes del delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para debouncing de callbacks
 * 
 * @param callback - Función a debounce
 * @param delay - Delay en milisegundos (default: 300ms)
 * @param deps - Dependencias del callback
 * @returns Función debounced
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): T {
  const [debouncedCallback, setDebouncedCallback] = useState<T>(() => callback);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCallback(() => callback);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay, ...deps]);

  return debouncedCallback;
}

export default useDebounce;
