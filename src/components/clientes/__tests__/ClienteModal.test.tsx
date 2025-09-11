import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ClienteModal from '../ClienteModal';
import { createCliente, updateCliente } from '@/lib/services/cliente';
import type { Cliente } from '@/types/modelos';
import type { ClientePayload, ClienteUpdatePayload } from '@/types/payloads';

// ✅ Mock de servicios
jest.mock('@/lib/services/cliente', () => ({
  createCliente: jest.fn(),
  updateCliente: jest.fn(),
}));

// ✅ Mock de toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// ✅ Mock de framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
}));

const mockCreateCliente = createCliente as jest.MockedFunction<typeof createCliente>;
const mockUpdateCliente = updateCliente as jest.MockedFunction<typeof updateCliente>;
const mockToast = toast as jest.Mocked<typeof toast>;

// ✅ Cliente de prueba
const clientePrueba: Cliente = {
  id: '1',
  nombre: 'Cliente Test',
  ruc: '12345678901',
  direccion: 'Dirección Test',
  telefono: '987654321',
  correo: 'test@ejemplo.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ✅ Props por defecto
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSaved: jest.fn(),
};

describe('ClienteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado', () => {
    it('debe renderizar el modal cuando está abierto', () => {
      render(<ClienteModal {...defaultProps} />);
      
      expect(screen.getByText('Crear Nuevo Cliente')).toBeInTheDocument();
      expect(screen.getByLabelText('Nombre *')).toBeInTheDocument();
      expect(screen.getByLabelText('RUC')).toBeInTheDocument();
      expect(screen.getByLabelText('Dirección')).toBeInTheDocument();
      expect(screen.getByLabelText('Teléfono')).toBeInTheDocument();
      expect(screen.getByLabelText('Correo Electrónico')).toBeInTheDocument();
    });

    it('no debe renderizar cuando está cerrado', () => {
      render(<ClienteModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Crear Nuevo Cliente')).not.toBeInTheDocument();
    });

    it('debe mostrar título de edición cuando se pasa un cliente', () => {
      render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);
      
      expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument();
    });
  });

  describe('Validación de formulario', () => {
    it('debe mostrar error cuando el nombre está vacío', async () => {
      const user = userEvent.setup();
      render(<ClienteModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
      });
    });

    it('debe validar formato de RUC', async () => {
      const user = userEvent.setup();
      render(<ClienteModal {...defaultProps} />);
      
      const rucInput = screen.getByLabelText('RUC');
      await user.type(rucInput, '123');
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('El RUC debe tener 11 dígitos')).toBeInTheDocument();
      });
    });

    it('debe validar formato de correo', async () => {
      const user = userEvent.setup();
      render(<ClienteModal {...defaultProps} />);
      
      const correoInput = screen.getByLabelText('Correo Electrónico');
      await user.type(correoInput, 'correo-invalido');
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Formato de correo inválido')).toBeInTheDocument();
      });
    });

    it('debe validar formato de teléfono', async () => {
      const user = userEvent.setup();
      render(<ClienteModal {...defaultProps} />);
      
      const telefonoInput = screen.getByLabelText('Teléfono');
      await user.type(telefonoInput, '123');
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Formato de teléfono inválido')).toBeInTheDocument();
      });
    });
  });

  describe('Creación de cliente', () => {
    it('debe crear un cliente exitosamente', async () => {
      const user = userEvent.setup();
      mockCreateCliente.mockResolvedValueOnce({
        id: '2',
        nombre: 'Nuevo Cliente',
        ruc: null,
        direccion: null,
        telefono: null,
        correo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      render(<ClienteModal {...defaultProps} />);
      
      // Llenar formulario
      await user.type(screen.getByLabelText('Nombre *'), 'Nuevo Cliente');
      
      // Enviar formulario
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateCliente).toHaveBeenCalledWith({
          nombre: 'Nuevo Cliente',
          ruc: null,
          direccion: null,
          telefono: null,
          correo: null,
        });
        expect(mockToast.success).toHaveBeenCalledWith('Cliente "Nuevo Cliente" creado exitosamente');
        expect(defaultProps.onSaved).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('debe manejar errores al crear cliente', async () => {
      const user = userEvent.setup();
      mockCreateCliente.mockRejectedValueOnce(new Error('Error de servidor'));
      
      render(<ClienteModal {...defaultProps} />);
      
      await user.type(screen.getByLabelText('Nombre *'), 'Cliente Error');
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error de servidor')).toBeInTheDocument();
        expect(mockToast.error).toHaveBeenCalledWith('Error al guardar cliente');
      });
    });
  });

  describe('Edición de cliente', () => {
    it('debe actualizar un cliente exitosamente', async () => {
      const user = userEvent.setup();
      mockUpdateCliente.mockResolvedValueOnce({
        ...clientePrueba,
        nombre: 'Cliente Actualizado',
      });
      
      render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);
      
      // Modificar nombre
      const nombreInput = screen.getByDisplayValue('Cliente Test');
      await user.clear(nombreInput);
      await user.type(nombreInput, 'Cliente Actualizado');
      
      // Enviar formulario
      const submitButton = screen.getByRole('button', { name: /actualizar/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUpdateCliente).toHaveBeenCalledWith({
          ...clientePrueba,
          nombre: 'Cliente Actualizado',
        });
        expect(mockToast.success).toHaveBeenCalledWith('Cliente "Cliente Actualizado" actualizado exitosamente');
        expect(defaultProps.onSaved).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('debe manejar errores al actualizar cliente', async () => {
      const user = userEvent.setup();
      mockUpdateCliente.mockRejectedValueOnce(new Error('Error de actualización'));
      
      render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);
      
      const submitButton = screen.getByRole('button', { name: /actualizar/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error de actualización')).toBeInTheDocument();
        expect(mockToast.error).toHaveBeenCalledWith('Error al guardar cliente');
      });
    });
  });

  describe('Interacciones', () => {
    it('debe cerrar el modal al hacer clic en Cancelar', async () => {
      const user = userEvent.setup();
      render(<ClienteModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('no debe permitir cerrar el modal mientras está guardando', async () => {
      const user = userEvent.setup();
      // Mock updateCliente to simulate a slow operation
      mockUpdateCliente.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);
      
      // Fill form and submit
      const submitButton = screen.getByRole('button', { name: /actualizar/i });
      await user.click(submitButton);
      
      // Try to close modal while loading
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await user.click(cancelButton);
      
      // Modal should still be open (onClose not called during loading)
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('debe permitir editar nuevamente después de actualizar exitosamente', async () => {
      const user = userEvent.setup();
      mockUpdateCliente.mockResolvedValue(clientePrueba);
      
      const { rerender } = render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);
      
      // Update client
      const nombreInput = screen.getByDisplayValue('Cliente Test');
      await user.clear(nombreInput);
      await user.type(nombreInput, 'Cliente Actualizado');
      
      const submitButton = screen.getByRole('button', { name: /actualizar/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onSaved).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
      
      // Reset mocks and reopen modal
      jest.clearAllMocks();
      rerender(<ClienteModal {...defaultProps} isOpen={true} cliente={clientePrueba} />);
      
      // Should be able to edit again without blocking
      const nombreInputReopen = screen.getByDisplayValue('Cliente Test');
      expect(nombreInputReopen).toBeInTheDocument();
      expect(nombreInputReopen).not.toBeDisabled();
    });

    it('debe prevenir el error "Blocked aria-hidden" específico del modo edición', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const user = userEvent.setup();
      
      // Simular el contenedor principal de la aplicación con clase "flex h-full"
      const appContainer = document.createElement('div');
      appContainer.className = 'flex h-full';
      document.body.appendChild(appContainer);
      
      // Renderizar el modal en modo edición
      const { container } = render(<ClienteModal {...defaultProps} cliente={clientePrueba} />, {
        container: appContainer
      });

      // Esperar a que el modal se abra y el formulario se resetee con delay
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      }, { timeout: 100 });

      // Simular que Radix UI aplica aria-hidden al contenedor principal
      // (esto es lo que causa el problema en producción)
      appContainer.setAttribute('aria-hidden', 'true');
      
      // Intentar interactuar con un botón dentro del modal
      const saveButton = screen.getByRole('button', { name: /actualizar/i });
      
      // Esta interacción NO debería generar warnings de "Blocked aria-hidden"
      await user.click(saveButton);
      
      // Verificar que no se generaron warnings específicos de aria-hidden
      const ariaHiddenWarnings = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes?.('Blocked aria-hidden') || 
        call[0]?.includes?.('aria-hidden')
      );
      expect(ariaHiddenWarnings).toHaveLength(0);
      
      // Limpiar
      document.body.removeChild(appContainer);
      consoleSpy.mockRestore();
    });

    it('debe manejar correctamente el focus cuando el modal se abre', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);

      // Esperar a que el modal se abra completamente
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Verificar que el diálogo tiene los atributos de accesibilidad correctos
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      
      // Verificar que los inputs del formulario no tienen aria-hidden
      const nombreInput = screen.getByDisplayValue('Cliente Test');
      expect(nombreInput).not.toHaveAttribute('aria-hidden', 'true');
      
      // Verificar que se puede hacer focus en los elementos
      nombreInput.focus();
      expect(document.activeElement).toBe(nombreInput);
      
      consoleSpy.mockRestore();
    });

    it('debe reproducir específicamente el problema de aria-hidden de Radix UI', async () => {
      const user = userEvent.setup();
      
      // Mock para simular el comportamiento de Radix UI que causa el problema
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn().mockImplementation((selector) => {
        const element = originalQuerySelector.call(document, selector);
        // Simular que Radix UI aplica aria-hidden al contenedor padre
        if (element && selector.includes('[data-radix-portal]')) {
          element.setAttribute('aria-hidden', 'true');
        }
        return element;
      });
      
      render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);

      // Esperar a que el modal se abra y el formulario se resetee
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      }, { timeout: 100 });

      // Simular la situación específica donde aria-hidden está en el contenedor
      // pero hay elementos focusables dentro
      const dialog = screen.getByRole('dialog');
      const parentContainer = dialog.closest('[data-radix-portal]') || dialog.parentElement;
      if (parentContainer) {
        parentContainer.setAttribute('aria-hidden', 'true');
      }
      
      // Intentar interactuar con elementos que deberían ser focusables
      const nombreInput = screen.getByDisplayValue('Cliente Test');
      
      // Esta interacción debería funcionar sin generar advertencias
      await user.click(nombreInput);
      await user.type(nombreInput, ' Modificado');
      
      // Verificar que la interacción funcionó correctamente
      expect(screen.getByDisplayValue('Cliente Test Modificado')).toBeInTheDocument();
      
      // Restaurar el querySelector original
      document.querySelector = originalQuerySelector;
    });

    it('debe manejar correctamente el estado de carga sin conflictos de aria-hidden', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockCreateCliente.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<ClienteModal {...defaultProps} />);
      
      await user.type(screen.getByLabelText('Nombre *'), 'Cliente Test');
      
      const submitButton = screen.getByRole('button', { name: /crear/i });
      await user.click(submitButton);
      
      // Verificar que los botones están deshabilitados durante la carga
      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
      
      // Verificar que no hay advertencias de aria-hidden durante el estado de carga
      const ariaWarnings = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes('aria-hidden') || call[0]?.includes('Blocked')
      );
      
      expect(ariaWarnings).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });

    it('debe limpiar el formulario sin generar conflictos de aria-hidden', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { rerender } = render(<ClienteModal {...defaultProps} cliente={clientePrueba} />);
      
      // Verificar que tiene datos del cliente
      expect(screen.getByDisplayValue('Cliente Test')).toBeInTheDocument();
      
      // Cambiar a modo creación (esto puede desencadenar el reset del formulario)
      rerender(<ClienteModal {...defaultProps} cliente={null} />);
      
      // Esperar a que cualquier reset asíncrono se complete
      await waitFor(() => {
        expect(screen.getByLabelText('Nombre *')).toHaveValue('');
      }, { timeout: 100 });
      
      // Verificar que el formulario está limpio
      expect(screen.queryByDisplayValue('Cliente Test')).not.toBeInTheDocument();
      
      // Verificar que no se generaron advertencias durante la limpieza
      const ariaWarnings = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes('aria-hidden') || call[0]?.includes('Blocked')
      );
      
      expect(ariaWarnings).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });
});
