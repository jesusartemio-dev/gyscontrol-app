/**
 * ===================================================
 * TESTS: EntregaItemForm
 * ===================================================
 * 
 * Tests unitarios y de integración para el componente
 * EntregaItemForm usando Jest y React Testing Library.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import EntregaItemForm from '@/components/equipos/EntregaItemForm';
import { EstadoEntregaItem } from '@/types/modelos';

// ============================
// 🎭 MOCKS
// ============================

// Mock de toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

// Mock de date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => '2024-01-15'),
  isValid: jest.fn(() => true)
}));

// Mock de date-fns/locale
jest.mock('date-fns/locale', () => ({
  es: {}
}));

// Mock de iconos de Lucide
jest.mock('lucide-react', () => ({
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Truck: () => <div data-testid="truck-icon" />
}));

// Mock de componentes UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>
}));

jest.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormField: ({ render, ...props }: any) => render({ field: { onChange: jest.fn(), value: '', name: 'test' } }),
  FormItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  FormMessage: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} defaultValue={props.value || props.defaultValue} />
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} defaultValue={props.value || props.defaultValue} />
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder, ...props }: any) => <span {...props}>{placeholder}</span>
}));

jest.mock('@/components/ui/calendar', () => ({
  Calendar: (props: any) => <div data-testid="calendar" {...props} />
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PopoverContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PopoverTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>
}));

// Mock de react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => {
      e?.preventDefault?.();
      return fn({});
    },
    formState: { errors: {}, isSubmitting: false },
    reset: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(() => ({})),
    watch: jest.fn(() => '')
  })
}));

// Mock de @hookform/resolvers/zod
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => ({})
}));

// ============================
// 🧪 SUITE DE TESTS
// ============================

describe('EntregaItemForm', () => {
  const defaultProps = {
    pedidoEquipoItemId: 'test-item-id',
    estadoActual: EstadoEntregaItem.PENDIENTE,
    cantidadPendiente: 10
  };

  const mockOnEntregaCompletada = jest.fn();
  const mockOnCancelar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ============================
  // 📋 TESTS DE RENDERIZADO
  // ============================

  describe('Rendering', () => {
    it('should render form with all required fields', () => {
      render(<EntregaItemForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /registrar entrega/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Estado de Entrega/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cantidad Atendida/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Fecha de Entrega Real/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Observaciones de Entrega/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Comentario de Logística/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /registrar entrega/i })).toBeInTheDocument();
    });

    it('should render in update mode when modo is "actualizar"', () => {
      render(
        <EntregaItemForm 
          {...defaultProps} 
          modo="actualizar"
        />
      );

      expect(screen.getByRole('heading', { name: /actualizar entrega/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /actualizar entrega/i })).toBeInTheDocument();
    });

    it('should show current state badge', () => {
      render(<EntregaItemForm {...defaultProps} estadoActual="en_proceso" />);

      expect(screen.getByText('EN_PROCESO')).toBeInTheDocument();
    });

    it('should show cancel button when onCancelar is provided', () => {
      render(
        <EntregaItemForm 
          {...defaultProps} 
          onCancelar={mockOnCancelar}
        />
      );

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should display pending quantity information', () => {
      render(<EntregaItemForm {...defaultProps} cantidadPendiente={5} />);

      expect(screen.getByText('Cantidad pendiente: 5')).toBeInTheDocument();
    });
  });

  // ============================
  // 🎯 TESTS DE INTERACCIONES
  // ============================

  describe('User Interactions', () => {
    it('should handle estado selection', async () => {
      const user = userEvent.setup();
      render(<EntregaItemForm {...defaultProps} />);

      const estadoSelect = screen.getByRole('combobox');
      await user.click(estadoSelect);

      // Verificar que se muestran las opciones de estado
      await waitFor(() => {
        expect(screen.getByText('ENTREGADO')).toBeInTheDocument();
      });
    });

    it('should handle cantidad input changes', async () => {
      const user = userEvent.setup();
      render(<EntregaItemForm {...defaultProps} />);

      const cantidadInput = screen.getByPlaceholderText(/Ingrese la cantidad entregada/i);
      await user.clear(cantidadInput);
      await user.type(cantidadInput, '5');

      expect(cantidadInput).toHaveValue(5);
    });

    it('should handle observaciones input', async () => {
      const user = userEvent.setup();
      render(<EntregaItemForm {...defaultProps} />);

      const observacionesTextarea = screen.getByPlaceholderText(/Ingrese observaciones sobre la entrega/i);
      await user.type(observacionesTextarea, 'Entrega realizada sin problemas');

      expect(observacionesTextarea).toHaveValue('Entrega realizada sin problemas');
    });

    it('should handle comentario logistica input', async () => {
      const user = userEvent.setup();
      render(<EntregaItemForm {...defaultProps} />);

      const comentarioTextarea = screen.getByLabelText(/comentario de logística/i);
      await user.type(comentarioTextarea, 'Coordinar con almacén');

      expect(comentarioTextarea).toHaveValue('Coordinar con almacén');
    });

    it('should call onCancelar when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EntregaItemForm 
          {...defaultProps} 
          onCancelar={mockOnCancelar}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await user.click(cancelButton);

      expect(mockOnCancelar).toHaveBeenCalledTimes(1);
    });
  });

  // ============================
  // 📤 TESTS DE ENVÍO DE FORMULARIO
  // ============================

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      render(
        <EntregaItemForm 
          {...defaultProps} 
          onEntregaCompletada={mockOnEntregaCompletada}
        />
      );

      // Llenar el formulario
      const cantidadInput = screen.getByPlaceholderText(/Ingrese la cantidad entregada/i);
      await user.clear(cantidadInput);
      await user.type(cantidadInput, '8');

      const observacionesTextarea = screen.getByPlaceholderText(/Ingrese observaciones sobre la entrega/i);
      await user.type(observacionesTextarea, 'Entrega completa');

      // Enviar formulario
      const submitButton = screen.getByRole('button', { name: /registrar entrega/i });
      await user.click(submitButton);

      // Verificar loading state
      expect(screen.getByText(/procesando/i)).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

      // Esperar a que se complete
      await waitFor(() => {
        expect(mockOnEntregaCompletada).toHaveBeenCalledWith(
          expect.objectContaining({
            pedidoEquipoItemId: 'test-item-id',
            cantidadAtendida: 8,
            observacionesEntrega: 'Entrega completa'
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Entrega registrada exitosamente');
    });

    it('should show success message for update mode', async () => {
      const user = userEvent.setup();
      render(
        <EntregaItemForm 
          {...defaultProps} 
          modo="actualizar"
          onEntregaCompletada={mockOnEntregaCompletada}
        />
      );

      const submitButton = screen.getByRole('button', { name: /actualizar entrega/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Entrega actualizada exitosamente');
      });
    });

    it('should handle form submission errors', async () => {
      const user = userEvent.setup();
      
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock a failing callback
      const failingCallback = jest.fn().mockRejectedValue(new Error('API Error'));
      
      render(
        <EntregaItemForm 
          {...defaultProps} 
          onEntregaCompletada={failingCallback}
        />
      );

      const submitButton = screen.getByRole('button', { name: /registrar entrega/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al procesar la entrega: Error de red');
      });

      consoleSpy.mockRestore();
    });

    it('should render submit button correctly', async () => {
      render(
        <EntregaItemForm 
          {...defaultProps} 
        />
      );

      const submitButton = screen.getByRole('button', { name: /registrar entrega/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });
  });

  // ============================
  // 🔧 TESTS DE VALIDACIÓN
  // ============================

  describe('Form Validation', () => {
    it('should validate cantidad atendida is positive', async () => {
      const user = userEvent.setup();
      render(<EntregaItemForm {...defaultProps} />);

      const cantidadInput = screen.getByPlaceholderText(/Ingrese la cantidad entregada/i);
      await user.clear(cantidadInput);
      await user.type(cantidadInput, '-1');

      const submitButton = screen.getByRole('button', { name: /registrar entrega/i });
      await user.click(submitButton);

      // El formulario no debería enviarse con valores negativos
      expect(mockOnEntregaCompletada).not.toHaveBeenCalled();
    });

    it('should respect max cantidad limit', () => {
      render(<EntregaItemForm {...defaultProps} cantidadPendiente={5} />);

      const cantidadInput = screen.getByPlaceholderText(/Ingrese la cantidad entregada/i);
      expect(cantidadInput).toHaveAttribute('max', '5');
    });
  });

  // ============================
  // ♿ TESTS DE ACCESIBILIDAD
  // ============================

  describe('Accessibility', () => {
    it('should have proper form elements', () => {
      render(<EntregaItemForm {...defaultProps} />);

      expect(screen.getAllByRole('button')).toHaveLength(3); // Select estado + Calendar + Submit
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });

    it('should have proper button roles', () => {
      render(
        <EntregaItemForm 
          {...defaultProps} 
          onCancelar={mockOnCancelar}
        />
      );

      expect(screen.getByRole('button', { name: /registrar entrega/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<EntregaItemForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /registrar entrega/i })).toBeInTheDocument();
    });
  });

  // ============================
  // 📊 TESTS CON DATOS INICIALES
  // ============================

  describe('Initial Data', () => {
    it('should populate form with initial data', () => {
      const datosIniciales = {
        estadoEntrega: EstadoEntregaItem.PARCIAL,
        cantidadAtendida: 3,
        observacionesEntrega: 'Entrega parcial realizada',
        comentarioLogistica: 'Pendiente completar'
      };

      render(
        <EntregaItemForm 
          {...defaultProps} 
          datosIniciales={datosIniciales}
        />
      );

      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
    });
  });
});
