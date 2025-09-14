/**
 * 🖼️ Componente de Imagen Optimizada
 * 
 * Implementa lazy loading, WebP, y optimizaciones de Next.js Image.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

'use client';

import { forwardRef, useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { useImageLazyLoading } from '@/lib/hooks/useImageLazyLoading';
import { Skeleton } from './skeleton';
import { Button } from './button';
import { RefreshCw, ImageIcon } from 'lucide-react';

// 📡 Props extendidas para el componente optimizado
interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'onLoad' | 'onError'> {
  src: string;
  fallbackSrc?: string;
  webpSrc?: string;
  enableLazyLoading?: boolean;
  showRetryButton?: boolean;
  skeletonClassName?: string;
  errorClassName?: string;
  loadingClassName?: string;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Componente de imagen optimizada con lazy loading y WebP
 * 
 * @param props - Props del componente
 * @returns JSX.Element optimizado
 */
export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>((
  {
    src,
    alt,
    fallbackSrc,
    webpSrc,
    enableLazyLoading = true,
    showRetryButton = true,
    className,
    skeletonClassName,
    errorClassName,
    loadingClassName,
    onLoadComplete,
    onError,
    priority = false,
    ...props
  },
  ref
) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // ✅ Hook de lazy loading (solo si está habilitado)
  const {
    imageSrc,
    isLoading: lazyLoading,
    isError: lazyError,
    imageRef,
    retry,
  } = useImageLazyLoading({
    src,
    fallbackSrc,
    webpSrc,
    enableWebP: true,
  });

  // 🔄 Determinar el estado actual
  const isLoading = enableLazyLoading ? lazyLoading : !imageLoaded;
  const hasError = enableLazyLoading ? lazyError : imageError;
  const currentSrc = enableLazyLoading ? imageSrc : src;

  // 📊 Handlers de eventos
  const handleLoad = () => {
    setImageLoaded(true);
    onLoadComplete?.();
  };

  const handleError = (error?: Error) => {
    setImageError(true);
    onError?.(error || new Error('Image failed to load'));
  };

  const handleRetry = () => {
    setImageError(false);
    setImageLoaded(false);
    if (enableLazyLoading) {
      retry();
    }
  };

  // 🖼️ Renderizar skeleton durante carga
  if (isLoading && !hasError) {
    return (
      <div
        ref={enableLazyLoading ? imageRef : undefined}
        className={cn(
          'relative overflow-hidden rounded-md',
          className,
          loadingClassName
        )}
      >
        <Skeleton 
          className={cn(
            'w-full h-full',
            skeletonClassName
          )} 
        />
        {/* 📊 Indicador de carga */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            <span>Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  // ❌ Renderizar estado de error
  if (hasError) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center',
          'bg-muted/50 border-2 border-dashed border-muted-foreground/25',
          'rounded-md p-6 text-center',
          className,
          errorClassName
        )}
      >
        <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground mb-3">
          Error al cargar la imagen
        </p>
        <p className="text-xs text-muted-foreground/75 mb-4">
          {alt || 'Imagen no disponible'}
        </p>
        
        {showRetryButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  // ✅ Renderizar imagen optimizada
  return (
    <div className={cn('relative', className)}>
      <Image
        ref={enableLazyLoading ? imageRef : ref}
        src={currentSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={() => handleError()}
        priority={priority}
        className={cn(
          'transition-opacity duration-300',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        {...props}
      />
      
      {/* 🔄 Overlay de carga para transición suave */}
      {!imageLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse rounded-md" />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// 📊 Métricas de performance (desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('🖼️ OptimizedImage: Componente cargado');
}

export default OptimizedImage;