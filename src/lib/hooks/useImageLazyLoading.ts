/**
 * 🖼️ Hook para Lazy Loading de Imágenes con WebP
 * 
 * Implementa lazy loading inteligente de imágenes con soporte para WebP y fallbacks.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// 📡 Tipos para el hook
interface UseImageLazyLoadingOptions {
  src: string;
  fallbackSrc?: string;
  webpSrc?: string;
  threshold?: number;
  rootMargin?: string;
  enableWebP?: boolean;
  placeholder?: string;
}

interface UseImageLazyLoadingReturn {
  imageSrc: string;
  isLoading: boolean;
  isError: boolean;
  imageRef: React.RefObject<HTMLImageElement | null>;
  retry: () => void;
}

/**
 * Hook para lazy loading de imágenes con optimizaciones
 * 
 * @param options - Configuración del lazy loading
 * @returns Estado y referencias para la imagen
 */
export const useImageLazyLoading = ({
  src,
  fallbackSrc,
  webpSrc,
  threshold = 0.1,
  rootMargin = '50px',
  enableWebP = true,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+',
}: UseImageLazyLoadingOptions): UseImageLazyLoadingReturn => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ✅ Detectar soporte para WebP
  const supportsWebP = useCallback((): Promise<boolean> => {
    if (!enableWebP) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }, [enableWebP]);

  // 🔄 Cargar imagen con fallbacks
  const loadImage = useCallback(async () => {
    if (!isIntersecting) return;
    
    setIsLoading(true);
    setIsError(false);
    
    try {
      // 📊 Determinar la mejor fuente de imagen
      let targetSrc = src;
      
      if (webpSrc && await supportsWebP()) {
        targetSrc = webpSrc;
      }
      
      // 🖼️ Precargar la imagen
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = targetSrc;
      });
      
      setImageSrc(targetSrc);
      setIsLoading(false);
      
    } catch (error) {
      console.warn('🖼️ Error loading primary image, trying fallback:', error);
      
      // 🔁 Intentar con fallback
      if (fallbackSrc && fallbackSrc !== src) {
        try {
          const fallbackImg = new Image();
          
          await new Promise<void>((resolve, reject) => {
            fallbackImg.onload = () => resolve();
            fallbackImg.onerror = () => reject(new Error('Fallback failed'));
            fallbackImg.src = fallbackSrc;
          });
          
          setImageSrc(fallbackSrc);
          setIsLoading(false);
          
        } catch (fallbackError) {
          console.error('🖼️ Fallback image also failed:', fallbackError);
          setIsError(true);
          setIsLoading(false);
        }
      } else {
        setIsError(true);
        setIsLoading(false);
      }
    }
  }, [src, webpSrc, fallbackSrc, isIntersecting, supportsWebP]);

  // 🔄 Retry function
  const retry = useCallback(() => {
    setIsError(false);
    setImageSrc(placeholder);
    loadImage();
  }, [loadImage, placeholder]);

  // 👀 Configurar Intersection Observer
  useEffect(() => {
    const currentImageRef = imageRef.current;
    
    if (!currentImageRef) return;
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observerRef.current?.unobserve(currentImageRef);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );
    
    observerRef.current.observe(currentImageRef);
    
    return () => {
      if (observerRef.current && currentImageRef) {
        observerRef.current.unobserve(currentImageRef);
      }
    };
  }, [threshold, rootMargin]);

  // 🖼️ Cargar imagen cuando sea visible
  useEffect(() => {
    if (isIntersecting) {
      loadImage();
    }
  }, [isIntersecting, loadImage]);

  // 🧹 Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    imageSrc,
    isLoading,
    isError,
    imageRef,
    retry,
  };
};

// 📊 Métricas de performance (desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('🖼️ useImageLazyLoading: Hook cargado');
}