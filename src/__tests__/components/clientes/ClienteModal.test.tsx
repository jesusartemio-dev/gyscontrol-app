import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ClienteModal from '@/components/clientes/ClienteModal';
import * as clienteService from '@/lib/services/cliente';
import type { Cliente } from '@/types/modelos';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/services/cliente', () => ({
  createCliente: jest.fn(),
  updateCliente: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock createPortal to render in place
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Mock document.body for portal
Object.defineProperty(document, 'body', {
  value: document.createElement('body'),
  writable: true,
});

const mockCliente: Cliente = {
  id: 'test-id-123',
  nombre: 'Cliente Test',
  ruc: '12345678901',
  direccion: 'Dirección Test',
  telefono: '987654321',
  correo: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ClienteModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSaved = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create mode when no cliente is provided', () => {
    render(
      <ClienteModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText('Crear Cliente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cliente/i })).toBeInTheDocument();
  });

  it('should render edit mode when cliente is provided', () => {
    render(
      <ClienteModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        cliente={mockCliente}
      />
    );

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /actualizar cliente/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
  });

  it('should create a new cliente successfully', async () => {
    const user = userEvent.setup();
    const mockCreateCliente = jest.mocked(clienteService.createCliente);
    mockCreateCliente.mockResolvedValue(mockCliente);

    render(
      <ClienteModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Fill form
    await user.type(screen.getByLabelText(/nombre/i), 'Nuevo Cliente');
    await user.type(screen.getByLabelText(/ruc/i), '12345678901');
    await user.type(screen.getByLabelText(/correo/i), 'nuevo@example.com');

    // Submit form
    await user.click(screen.getByRole('button', { name: /crear cliente/i }));

    await waitFor(() => {
      expect(mockCreateCliente).toHaveBeenCalledWith({
        nombre: 'Nuevo Cliente',
        ruc: '12345678901',
        direccion: null,
        telefono: null,
        correo: 'nuevo@example.com',
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Cliente creado correctamente');
    expect(mockOnSaved).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should update an existing cliente successfully', async () => {
    const user = userEvent.setup();
    const mockUpdateCliente = jest.mocked(clienteService.updateCliente);
    mockUpdateCliente.mockResolvedValue({ ...mockCliente, nombre: 'Cliente Actualizado' });

    render(
      <ClienteModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
        cliente={mockCliente}
      />
    );

    // Update name
    const nameInput = screen.getByDisplayValue('Cliente Test');
    await user.clear(nameInput);
    await user.type(nameInput, 'Cliente Actualizado');

    // Submit form
    await user.click(screen.getByRole('button', { name: /actualizar cliente/i }));

    await waitFor(() => {
      expect(mockUpdateCliente).toHaveBeenCalledWith({
        id: 'test-id-123',
        nombre: 'Cliente Actualizado',
        ruc: '12345678901',
        direccion: 'Dirección Test',
        telefono: '987654321',
        correo: 'test@example.com',
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Cliente actualizado correctamente');
    expect(mockOnSaved).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    const user = userEvent.setup();

    render(
      <ClienteModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Try to submit without required fields
    await user.click(screen.getByRole('button', { name: /crear cliente/i }));

    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    });

    expect(clienteService.createCliente).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockCreateCliente = jest.mocked(clienteService.createCliente);
    mockCreateCliente.mockRejectedValue(new Error('Error de red'));

    render(
      <ClienteModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Fill form
    await user.type(screen.getByLabelText(/nombre/i), 'Cliente Test');

    // Submit form
    await user.click(screen.getByRole('button', { name: /crear cliente/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al crear cliente');
    });

    expect(mockOnSaved).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should close modal when clicking close button', async () => {
    const user = userEvent.setup();

    render(
      <ClienteModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ClienteModal
        isOpen={false}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.queryByText('Crear Cliente')).not.toBeInTheDocument();
  });
});
