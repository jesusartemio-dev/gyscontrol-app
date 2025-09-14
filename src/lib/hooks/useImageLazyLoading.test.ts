/**
 * 🧪 Tests para useImageLazyLoading
 * 
 * Tests del hook de lazy loading de imágenes con WebP.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageLazyLoading } from './useImageLazyLoading';

// 🔧 Mock de IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: mockIntersectionObserver,
});

// 🔧 Mock de Image
const mockImage = jest.fn();
Object.defineProperty(global, 'Image', {
  writable: true,
  configurable: true,
  value: mockImage,
});

describe('useImageLazyLoading', () => {
  let mockObserver: any;
  let mockImageInstance: any;

  beforeEach(() => {
    // 🔄 Reset mocks
    jest.clearAllMocks();
    
    // 🔧 Mock IntersectionObserver instance
    mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
    mockIntersectionObserver.mockReturnValue(mockObserver);
    
    // 🔧 Mock Image instance
    mockImageInstance = {
      onload: null,
      onerror: null,
      src: '',
      height: 0,
    };
    mockImage.mockImplementation(() => mockImageInstance);
  });

  // ✅ Test de inicialización
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
      })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.imageSrc).toContain('data:image/svg+xml');
    expect(result.current.imageRef.current).toBeNull();
    expect(typeof result.current.retry).toBe('function');
  });

  // 👀 Test de IntersectionObserver setup
  it('should setup IntersectionObserver when imageRef is set', () => {
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
      })
    );

    // 🔧 Simular ref assignment
    const mockElement = document.createElement('img');
    act(() => {
      (result.current.imageRef as any).current = mockElement;
    });

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );
    expect(mockObserver.observe).toHaveBeenCalledWith(mockElement);
  });

  // 🖼️ Test de carga de imagen exitosa
  it('should load image successfully when intersecting', async () => {
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
      })
    );

    // 🔧 Simular intersección
    act(() => {
      const callback = mockIntersectionObserver.mock.calls[0][0];
      callback([{ isIntersecting: true }]);
    });

    // 🔧 Simular carga exitosa de imagen
    act(() => {
      if (mockImageInstance.onload) {
        mockImageInstance.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.imageSrc).toBe('test-image.jpg');
    });
  });

  // ❌ Test de error en carga de imagen
  it('should handle image loading error', async () => {
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'invalid-image.jpg',
        fallbackSrc: 'fallback-image.jpg',
      })
    );

    // 🔧 Simular intersección
    act(() => {
      const callback = mockIntersectionObserver.mock.calls[0][0];
      callback([{ isIntersecting: true }]);
    });

    // 🔧 Simular error en imagen principal
    act(() => {
      if (mockImageInstance.onerror) {
        mockImageInstance.onerror();
      }
    });

    // 🔧 Simular carga exitosa del fallback
    act(() => {
      if (mockImageInstance.onload) {
        mockImageInstance.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.imageSrc).toBe('fallback-image.jpg');
    });
  });

  // 🌐 Test de soporte WebP
  it('should detect WebP support and use WebP source', async () => {
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
        webpSrc: 'test-image.webp',
        enableWebP: true,
      })
    );

    // 🔧 Simular soporte WebP
    act(() => {
      mockImageInstance.height = 2; // Indica soporte WebP
      if (mockImageInstance.onload) {
        mockImageInstance.onload();
      }
    });

    // 🔧 Simular intersección
    act(() => {
      const callback = mockIntersectionObserver.mock.calls[0][0];
      callback([{ isIntersecting: true }]);
    });

    await waitFor(() => {
      expect(mockImageInstance.src).toBe('test-image.webp');
    });
  });

  // 🔄 Test de función retry
  it('should retry loading image when retry is called', async () => {
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
      })
    );

    // 🔧 Simular intersección y error
    act(() => {
      const callback = mockIntersectionObserver.mock.calls[0][0];
      callback([{ isIntersecting: true }]);
    });

    act(() => {
      if (mockImageInstance.onerror) {
        mockImageInstance.onerror();
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // 🔄 Llamar retry
    act(() => {
      result.current.retry();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.imageSrc).toContain('data:image/svg+xml');
  });

  // 🎛️ Test de configuración personalizada
  it('should use custom configuration options', () => {
    const customPlaceholder = 'custom-placeholder.svg';
    
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
        threshold: 0.5,
        rootMargin: '100px',
        placeholder: customPlaceholder,
      })
    );

    expect(result.current.imageSrc).toBe(customPlaceholder);
    
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0.5,
        rootMargin: '100px',
      }
    );
  });

  // 🧹 Test de cleanup
  it('should cleanup observer on unmount', () => {
    const { unmount } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
      })
    );

    unmount();

    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  // 🚫 Test sin WebP
  it('should work without WebP when disabled', async () => {
    const { result } = renderHook(() =>
      useImageLazyLoading({
        src: 'test-image.jpg',
        webpSrc: 'test-image.webp',
        enableWebP: false,
      })
    );

    // 🔧 Simular intersección
    act(() => {
      const callback = mockIntersectionObserver.mock.calls[0][0];
      callback([{ isIntersecting: true }]);
    });

    // 🔧 Simular carga exitosa
    act(() => {
      if (mockImageInstance.onload) {
        mockImageInstance.onload();
      }
    });

    await waitFor(() => {
      expect(result.current.imageSrc).toBe('test-image.jpg');
    });
  });

  // 📊 Test de métricas de desarrollo
  it('should log metrics in development mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const originalEnv = process.env.NODE_ENV;
    
    // 🔧 Simular entorno de desarrollo
    process.env.NODE_ENV = 'development';
    
    // 🔄 Re-importar el módulo
    jest.resetModules();
    require('./useImageLazyLoading');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('useImageLazyLoading: Hook cargado')
    );
    
    // 🧹 Restaurar
    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });
});