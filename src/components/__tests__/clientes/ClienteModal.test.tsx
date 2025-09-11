import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClienteModal } from './ClienteModal';
import type { Cliente } from '@/types/cliente';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock de react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock de servicios
jest.mock('@/services/clienteService', () => ({
  crearCliente: jest.fn(),
  actualizarCliente: jest.fn(),
}));

const mockCliente: Cliente = {
  id: '1',
  nombre: 'Cliente Test',
  ruc: '12345678901',
  direccion: 'Dirección Test',
  telefono: '987654321',
  correo: 'test@cliente.com',
  fechaCreacion: new Date(),
  fechaActualizacion: new Date(),
};

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  onClienteGuardado: jest.fn(),
  cliente: null,
};

describe('ClienteModal', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly in create mode', async () => {
      render(<ClienteModal {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /nombre/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /ruc/i })).toBeInTheDocument();
    });

    it('should render correctly in edit mode', async () => {
      render(<ClienteModal {...mockProps} cliente={mockCliente} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
      
      // Wait for form to be populated with client data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('User Interactions', () => {
    it('should handle form submission in create mode', async () => {
      const user = userEvent.setup();
      const { crearCliente } = require('@/services/clienteService');
      crearCliente.mockResolvedValue({ success: true });
      
      render(<ClienteModal {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Fill form
      await user.type(screen.getByRole('textbox', { name: /nombre/i }), 'Nuevo Cliente');
      await user.type(screen.getByRole('textbox', { name: /ruc/i }), '12345678901');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /guardar/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(crearCliente).toHaveBeenCalled();
        expect(mockProps.onClose).toHaveBeenCalled();
      });
      
      // onClienteGuardado se llama después de un delay
      await waitFor(() => {
        expect(mockProps.onClienteGuardado).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('should handle form submission in edit mode', async () => {
      const user = userEvent.setup();
      const { actualizarCliente } = require('@/services/clienteService');
      actualizarCliente.mockResolvedValue({ success: true });
      
      render(<ClienteModal {...mockProps} cliente={mockCliente} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Wait for form to be populated
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      }, { timeout: 200 });
      
      // Modify form
      const nameInput = screen.getByDisplayValue('Cliente Test');
      await user.clear(nameInput);
      await user.type(nameInput, 'Cliente Modificado');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /guardar/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(actualizarCliente).toHaveBeenCalled();
        expect(mockProps.onClose).toHaveBeenCalled();
      });
      
      // onClienteGuardado se llama después de un delay
      await waitFor(() => {
        expect(mockProps.onClienteGuardado).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible in create mode', async () => {
      render(<ClienteModal {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should be accessible in edit mode', async () => {
      render(<ClienteModal {...mockProps} cliente={mockCliente} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('Aria-hidden Conflict Prevention', () => {
    it('should not have aria-hidden conflicts in edit mode', async () => {
      // Simulate the main application container with flex h-full class
      const appContainer = document.createElement('div');
      appContainer.className = 'flex h-full';
      document.body.appendChild(appContainer);
      
      // Mock console.warn to capture aria-hidden warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<ClienteModal {...mockProps} cliente={mockCliente} />, {
        container: appContainer
      });
      
      // Simulate Radix UI applying aria-hidden to the container
      setTimeout(() => {
        appContainer.setAttribute('aria-hidden', 'true');
      }, 10);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Wait for form to be populated and aria-hidden conflict prevention to run
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      }, { timeout: 300 });
      
      // Interact with the save button to ensure no aria-hidden warnings
      const user = userEvent.setup();
      const submitButton = screen.getByRole('button', { name: /guardar/i });
      await user.click(submitButton);
      
      // Check that no aria-hidden warnings were generated
      const ariaHiddenWarnings = consoleSpy.mock.calls.filter(call => 
        call[0] && call[0].includes && call[0].includes('aria-hidden')
      );
      
      expect(ariaHiddenWarnings).toHaveLength(0);
      
      consoleSpy.mockRestore();
      document.body.removeChild(appContainer);
    });

    it('should remove aria-hidden from focusable elements in edit mode', async () => {
      render(<ClienteModal {...mockProps} cliente={mockCliente} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Wait for form to be populated and conflict prevention to run
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      }, { timeout: 300 });
      
      // Manually add aria-hidden to a focusable element to test removal
      const nameInput = screen.getByDisplayValue('Cliente Test');
      nameInput.setAttribute('aria-hidden', 'true');
      
      // Wait for the conflict prevention effect to run
      await waitFor(() => {
        expect(nameInput).not.toHaveAttribute('aria-hidden');
      }, { timeout: 200 });
    });

    it('should handle multiple dialog elements correctly', async () => {
      // Create multiple dialog elements to test the prevention logic
      const extraDialog = document.createElement('div');
      extraDialog.setAttribute('role', 'dialog');
      extraDialog.innerHTML = '<button aria-hidden="true">Extra Button</button>';
      document.body.appendChild(extraDialog);
      
      render(<ClienteModal {...mockProps} cliente={mockCliente} />);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Wait for conflict prevention to run
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      }, { timeout: 300 });
      
      // Check that aria-hidden was removed from the extra button
      const extraButton = extraDialog.querySelector('button');
      expect(extraButton).not.toHaveAttribute('aria-hidden');
      
      document.body.removeChild(extraDialog);
    });
  });
});
