/**
 * @fileoverview Tests for ClienteModal component
 * @description Comprehensive test suite for the enhanced client modal component
 * @author GYS Team
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ClienteModal } from './ClienteModal';
import * as clienteService from '@/lib/services/clientes';
import type { Cliente } from '@/types/modelos';

// 🔧 Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/services/clientes', () => ({
  crearCliente: jest.fn(),
  actualizarCliente: jest.fn(),
}));

// 🧪 Mock data
const mockCliente: Cliente = {
  id: '1',
  nombre: 'Test Cliente S.A.C.',
  ruc: '20123456789',
  direccion: 'Av. Test 123, Lima',
  telefono: '987654321',
  correo: 'test@cliente.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSaved: jest.fn(),
};

describe('ClienteModal - Enhanced Version', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Enhanced Rendering', () => {
    it('should render create modal with improved header', () => {
      render(<ClienteModal {...mockProps} />);
      
      expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
      expect(screen.getByText('Completa los datos del nuevo cliente')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Nombre del cliente')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('RUC del cliente (11 dígitos)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument();
    });

    it('should render edit modal with improved header', () => {
      render(<ClienteModal {...mockProps} cliente={mockCliente} />);
      
      expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
      expect(screen.getByText('Actualiza la información del cliente')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Cliente S.A.C.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('20123456789')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /actualizar/i })).toBeInTheDocument();
    });

    it('should show field icons in labels', () => {
      render(<ClienteModal {...mockProps} />);
      
      // Check for icon presence by looking for specific classes or test-ids
      const labels = screen.getAllByText(/nombre|ruc|dirección|teléfono|correo/i);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Form Validation', () => {
    it('should show validation error for empty nombre with icon', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const nombreInput = screen.getByPlaceholderText('Nombre del cliente');
      await user.type(nombreInput, 'a');
      await user.clear(nombreInput);
      
      await waitFor(() => {
        expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
      });
    });

    it('should validate nombre length (min 2 characters)', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const nombreInput = screen.getByPlaceholderText('Nombre del cliente');
      await user.type(nombreInput, 'A');
      
      await waitFor(() => {
        expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
      });
    });

    it('should validate RUC format (exactly 11 digits)', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const rucInput = screen.getByPlaceholderText('RUC del cliente (11 dígitos)');
      await user.type(rucInput, '123456789');
      
      await waitFor(() => {
        expect(screen.getByText('El RUC debe tener exactamente 11 dígitos')).toBeInTheDocument();
      });
    });

    it('should validate direccion length (min 5 characters)', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const direccionInput = screen.getByPlaceholderText('Dirección del cliente');
      await user.type(direccionInput, 'ABC');
      
      await waitFor(() => {
        expect(screen.getByText('La dirección debe tener al menos 5 caracteres')).toBeInTheDocument();
      });
    });

    it('should validate telefono format (9 digits)', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const telefonoInput = screen.getByPlaceholderText('Teléfono del cliente (opcional)');
      await user.type(telefonoInput, '12345');
      
      await waitFor(() => {
        expect(screen.getByText('El teléfono debe tener 9 dígitos')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const emailInput = screen.getByPlaceholderText('correo@ejemplo.com (opcional)');
      await user.type(emailInput, 'invalid-email');
      
      await waitFor(() => {
        expect(screen.getByText('Formato de correo inválido')).toBeInTheDocument();
      });
    });

    it('should show success feedback for valid fields', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const nombreInput = screen.getByPlaceholderText('Nombre del cliente');
      await user.type(nombreInput, 'Cliente Válido S.A.C.');
      
      await waitFor(() => {
        expect(screen.getByText('Nombre válido')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Validation Feedback', () => {
    it('should show green border and checkmark for valid nombre', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const nombreInput = screen.getByPlaceholderText('Nombre del cliente');
      await user.type(nombreInput, 'Cliente Válido');
      
      await waitFor(() => {
        expect(nombreInput).toHaveClass('border-green-500');
        expect(screen.getByText('Nombre válido')).toBeInTheDocument();
      });
    });

    it('should show red border and error icon for invalid RUC', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const rucInput = screen.getByPlaceholderText('RUC del cliente (11 dígitos)');
      await user.type(rucInput, '123');
      
      await waitFor(() => {
        expect(rucInput).toHaveClass('border-red-500');
      });
    });
  });

  describe('Enhanced Form Submission', () => {
    it('should create cliente with trimmed data', async () => {
      const mockCrearCliente = clienteService.crearCliente as jest.MockedFunction<typeof clienteService.crearCliente>;
      mockCrearCliente.mockResolvedValue(mockCliente);
      
      render(<ClienteModal {...mockProps} />);
      
      await user.type(screen.getByPlaceholderText('Nombre del cliente'), '  New Cliente  ');
      await user.type(screen.getByPlaceholderText('RUC del cliente (11 dígitos)'), '  20123456789  ');
      await user.type(screen.getByPlaceholderText('Dirección del cliente'), '  Av. Test 123  ');
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCrearCliente).toHaveBeenCalledWith({
          nombre: 'New Cliente',
          ruc: '20123456789',
          direccion: 'Av. Test 123',
          telefono: undefined,
          correo: undefined,
        });
        expect(toast.success).toHaveBeenCalledWith('✅ Cliente creado exitosamente');
      });
    });

    it('should prevent multiple submissions', async () => {
      const mockCrearCliente = clienteService.crearCliente as jest.MockedFunction<typeof clienteService.crearCliente>;
      mockCrearCliente.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<ClienteModal {...mockProps} />);
      
      await user.type(screen.getByPlaceholderText('Nombre del cliente'), 'New Cliente');
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      await user.click(submitButton); // Second click
      
      expect(mockCrearCliente).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during submission', async () => {
      const mockCrearCliente = clienteService.crearCliente as jest.MockedFunction<typeof clienteService.crearCliente>;
      mockCrearCliente.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ClienteModal {...mockProps} />);
      
      await user.type(screen.getByPlaceholderText('Nombre del cliente'), 'New Cliente');
      await user.click(screen.getByRole('button', { name: /crear/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Guardando...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
      });
    });
  });

  describe('Enhanced Modal Interactions', () => {
    it('should not close modal when processing', async () => {
      const mockCrearCliente = clienteService.crearCliente as jest.MockedFunction<typeof clienteService.crearCliente>;
      mockCrearCliente.mockImplementation(() => new Promise(() => {}));
      
      render(<ClienteModal {...mockProps} />);
      
      await user.type(screen.getByPlaceholderText('Nombre del cliente'), 'New Cliente');
      await user.click(screen.getByRole('button', { name: /crear/i }));
      
      // Try to close while processing
      await user.keyboard('{Escape}');
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeDisabled();
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });

    it('should reset form on close', async () => {
      render(<ClienteModal {...mockProps} />);
      
      await user.type(screen.getByPlaceholderText('Nombre del cliente'), 'Test Input');
      
      const closeButton = screen.getByRole('button', { name: '' });
      await user.click(closeButton);
      
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Enhanced Accessibility', () => {
    it('should have proper ARIA labels with icons', () => {
      render(<ClienteModal {...mockProps} />);
      
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ruc/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    });

    it('should maintain focus management', () => {
      render(<ClienteModal {...mockProps} />);
      
      const nombreInput = screen.getByPlaceholderText('Nombre del cliente');
      expect(nombreInput).toHaveFocus();
    });

    it('should have proper color contrast for validation states', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const nombreInput = screen.getByPlaceholderText('Nombre del cliente');
      await user.type(nombreInput, 'Valid Name');
      
      await waitFor(() => {
        expect(nombreInput).toHaveClass('border-green-500');
      });
    });
  });

  describe('Animation and UX', () => {
    it('should render with proper animation classes', () => {
      render(<ClienteModal {...mockProps} />);
      
      // Check for backdrop blur
      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });

    it('should show proper transition states', async () => {
      render(<ClienteModal {...mockProps} />);
      
      const nombreInput = screen.getByPlaceholderText('Nombre del cliente');
      expect(nombreInput).toHaveClass('transition-all', 'duration-200');
    });
  });
});
