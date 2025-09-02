/**
 * 🧪 DetailErrorBoundary Component Tests
 * 
 * Comprehensive test suite for the DetailErrorBoundary component.
 * Tests error handling, recovery actions, and different error types.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { DetailErrorBoundary, ErrorType } from '@/components/common/DetailErrorBoundary';

// 🔧 Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className, ...props }: any) => (
    <div data-testid="alert-triangle-icon" className={className} {...props} />
  ),
  RefreshCw: ({ className, ...props }: any) => (
    <div data-testid="refresh-icon" className={className} {...props} />
  ),
  ArrowLeft: ({ className, ...props }: any) => (
    <div data-testid="arrow-left-icon" className={className} {...props} />
  ),
  Home: ({ className, ...props }: any) => (
    <div data-testid="home-icon" className={className} {...props} />
  )
}));

// 🧪 Test component that throws errors
interface ErrorThrowingComponentProps {
  shouldThrow?: boolean;
  errorType?: ErrorType;
  errorMessage?: string;
}

const ErrorThrowingComponent: React.FC<ErrorThrowingComponentProps> = ({
  shouldThrow = false,
  errorType = 'UNKNOWN_ERROR',
  errorMessage = 'Test error'
}) => {
  if (shouldThrow) {
    const error = new Error(errorMessage) as Error & { type?: ErrorType };
    error.type = errorType;
    throw error;
  }
  return <div data-testid="success-component">Success content</div>;
};

describe('DetailErrorBoundary', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockReplace = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
      replace: mockReplace
    });
    
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByTestId('success-component')).toBeInTheDocument();
      expect(screen.getByText('Success content')).toBeInTheDocument();
    });
    
    it('should render multiple children correctly', () => {
      render(
        <DetailErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </DetailErrorBoundary>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });
  
  describe('Error Handling', () => {
    it('should catch and display validation errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="VALIDATION_ERROR"
            errorMessage="Invalid data provided"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByText('Error de Validación')).toBeInTheDocument();
      expect(screen.getByText('Invalid data provided')).toBeInTheDocument();
      expect(screen.getByText('Verifica que los datos ingresados sean correctos.')).toBeInTheDocument();
    });
    
    it('should catch and display network errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="NETWORK_ERROR"
            errorMessage="Connection failed"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByText('Error de Conexión')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText('Verifica tu conexión a internet e intenta nuevamente.')).toBeInTheDocument();
    });
    
    it('should catch and display permission errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="PERMISSION_ERROR"
            errorMessage="Access denied"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByText('Sin Permisos')).toBeInTheDocument();
      expect(screen.getByText('Access denied')).toBeInTheDocument();
      expect(screen.getByText('No tienes permisos para acceder a este recurso.')).toBeInTheDocument();
    });
    
    it('should catch and display not found errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="NOT_FOUND_ERROR"
            errorMessage="Resource not found"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByText('No Encontrado')).toBeInTheDocument();
      expect(screen.getByText('Resource not found')).toBeInTheDocument();
      expect(screen.getByText('El recurso solicitado no existe o ha sido eliminado.')).toBeInTheDocument();
    });
    
    it('should catch and display server errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="SERVER_ERROR"
            errorMessage="Internal server error"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByText('Error del Servidor')).toBeInTheDocument();
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
      expect(screen.getByText('Ocurrió un error en el servidor. Intenta más tarde.')).toBeInTheDocument();
    });
    
    it('should catch and display unknown errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="UNKNOWN_ERROR"
            errorMessage="Something went wrong"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByText('Error Inesperado')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Ocurrió un error inesperado. Intenta recargar la página.')).toBeInTheDocument();
    });
    
    it('should handle errors without type property', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorMessage="Generic error"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByText('Error Inesperado')).toBeInTheDocument();
      expect(screen.getByText('Generic error')).toBeInTheDocument();
    });
  });
  
  describe('Error Actions', () => {
    it('should provide retry action for network errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="NETWORK_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const retryButton = screen.getByText('Reintentar');
      expect(retryButton).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });
    
    it('should provide go back action for permission errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="PERMISSION_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const backButton = screen.getByText('Volver');
      expect(backButton).toBeInTheDocument();
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
    });
    
    it('should provide home action for not found errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="NOT_FOUND_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const homeButton = screen.getByText('Ir al Inicio');
      expect(homeButton).toBeInTheDocument();
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    });
    
    it('should provide retry action for server errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="SERVER_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const retryButton = screen.getByText('Reintentar');
      expect(retryButton).toBeInTheDocument();
    });
    
    it('should provide retry action for unknown errors', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="UNKNOWN_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const retryButton = screen.getByText('Reintentar');
      expect(retryButton).toBeInTheDocument();
    });
  });
  
  describe('User Interactions', () => {
    it('should handle retry action click', async () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setShouldThrow(false), 100);
          return () => clearTimeout(timer);
        }, []);
        
        return (
          <DetailErrorBoundary>
            <ErrorThrowingComponent 
              shouldThrow={shouldThrow} 
              errorType="NETWORK_ERROR"
            />
          </DetailErrorBoundary>
        );
      };
      
      render(<TestComponent />);
      
      // Initially shows error
      expect(screen.getByText('Error de Conexión')).toBeInTheDocument();
      
      // Click retry button
      const retryButton = screen.getByText('Reintentar');
      fireEvent.click(retryButton);
      
      // Should eventually show success content
      await waitFor(() => {
        expect(screen.getByTestId('success-component')).toBeInTheDocument();
      });
    });
    
    it('should handle go back action click', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="PERMISSION_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const backButton = screen.getByText('Volver');
      fireEvent.click(backButton);
      
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
    
    it('should handle go home action click', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="NOT_FOUND_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const homeButton = screen.getByText('Ir al Inicio');
      fireEvent.click(homeButton);
      
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
  
  describe('Custom Props', () => {
    it('should use custom fallback component', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div data-testid="custom-fallback">
          Custom error: {error.message}
        </div>
      );
      
      render(
        <DetailErrorBoundary 
          fallback={CustomFallback}
        >
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorMessage="Custom error message"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error: Custom error message')).toBeInTheDocument();
    });
    
    it('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn();
      
      render(
        <DetailErrorBoundary onError={onErrorMock}>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorMessage="Callback test error"
          />
        </DetailErrorBoundary>
      );
      
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error'
        }),
        expect.any(Object)
      );
    });
  });
  
  describe('Error Recovery', () => {
    it('should reset error state when children change', () => {
      const TestComponent = () => {
        const [key, setKey] = React.useState(0);
        const [shouldThrow, setShouldThrow] = React.useState(true);
        
        return (
          <div>
            <button 
              onClick={() => {
                setKey(k => k + 1);
                setShouldThrow(false);
              }}
              data-testid="change-children"
            >
              Change Children
            </button>
            <DetailErrorBoundary>
              <ErrorThrowingComponent 
                key={key}
                shouldThrow={shouldThrow} 
                errorType="NETWORK_ERROR"
              />
            </DetailErrorBoundary>
          </div>
        );
      };
      
      render(<TestComponent />);
      
      // Initially shows error
      expect(screen.getByText('Error de Conexión')).toBeInTheDocument();
      
      // Change children
      fireEvent.click(screen.getByTestId('change-children'));
      
      // Should show success content
      expect(screen.getByTestId('success-component')).toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="VALIDATION_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
    });
    
    it('should have accessible button labels', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="NETWORK_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const retryButton = screen.getByRole('button', { name: /reintentar/i });
      expect(retryButton).toBeInTheDocument();
    });
  });
  
  describe('Visual States', () => {
    it('should apply correct CSS classes', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="VALIDATION_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveClass('min-h-[400px]');
      expect(errorContainer).toHaveClass('flex');
      expect(errorContainer).toHaveClass('items-center');
      expect(errorContainer).toHaveClass('justify-center');
    });
    
    it('should display error icon', () => {
      render(
        <DetailErrorBoundary>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="SERVER_ERROR"
          />
        </DetailErrorBoundary>
      );
      
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });
  });
});