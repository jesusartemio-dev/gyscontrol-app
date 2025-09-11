import { updateCliente, createCliente } from '@/lib/services/cliente';
import { buildApiUrl } from '@/lib/utils';
import type { Cliente } from '@/types/modelos';

// Mock fetch
global.fetch = jest.fn();

// Mock buildApiUrl
jest.mock('@/lib/utils', () => ({
  buildApiUrl: jest.fn((path: string) => `http://localhost:3000${path}`),
}));

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

describe('Cliente Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateCliente', () => {
    it('should update cliente successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockCliente),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const updateData = {
        id: 'test-id-123',
        nombre: 'Cliente Actualizado',
        ruc: '12345678901',
        direccion: 'Nueva Dirección',
        telefono: '987654321',
        correo: 'nuevo@example.com',
      };

      const result = await updateCliente(updateData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/clientes',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );
      expect(result).toEqual(mockCliente);
    });

    it('should throw error when update fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const updateData = {
        id: 'test-id-123',
        nombre: 'Cliente Test',
        ruc: null,
        direccion: null,
        telefono: null,
        correo: null,
      };

      await expect(updateCliente(updateData)).rejects.toThrow('Error al actualizar cliente');
    });

    it('should send correct payload structure', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockCliente),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const updateData = {
        id: 'test-id-123',
        nombre: 'Cliente Test',
        ruc: '12345678901',
        direccion: 'Dirección Test',
        telefono: '987654321',
        correo: 'test@example.com',
      };

      await updateCliente(updateData);

      const fetchCall = (fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody).toEqual({
        id: 'test-id-123',
        nombre: 'Cliente Test',
        ruc: '12345678901',
        direccion: 'Dirección Test',
        telefono: '987654321',
        correo: 'test@example.com',
      });
      expect(requestBody.id).toBeDefined();
      expect(typeof requestBody.id).toBe('string');
    });
  });

  describe('createCliente', () => {
    it('should create cliente successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockCliente),
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const createData = {
        nombre: 'Nuevo Cliente',
        ruc: '12345678901',
        direccion: 'Dirección Nueva',
        telefono: '987654321',
        correo: 'nuevo@example.com',
      };

      const result = await createCliente(createData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/clientes',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData),
        }
      );
      expect(result).toEqual(mockCliente);
    });

    it('should throw error when create fails', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
      };
      
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const createData = {
        nombre: 'Cliente Test',
      };

      await expect(createCliente(createData)).rejects.toThrow('Error al crear cliente');
    });
  });
});
