import { ListaEquipoItem } from '@/types'

// Mock components
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: jest.fn(),
  },
}))

describe('Stock Control Tests', () => {
  const createMockItem = (id: string, cantidad: number, cantidadPedida: number = 0): ListaEquipoItem => ({
    id,
    listaId: 'lista-1',
    equipoId: `equipo-${id}`,
    codigo: `EQ${id.padStart(3, '0')}`,
    descripcion: `Equipo ${id}`,
    unidad: 'UND',
    cantidad,
    cantidadPedida,
    precioElegido: 100,
    verificado: true,
    estado: 'aprobado',
    origen: 'catalogo',
    cotizacionSeleccionadaId: `cot-${id}`,
    cotizacionSeleccionada: null,
    fechaCreacion: '2025-01-27T00:00:00Z',
    fechaActualizacion: '2025-01-27T00:00:00Z',
  })

  it('should calculate available stock correctly', () => {
    const item1 = createMockItem('1', 10, 3) // 7 disponibles
    const item2 = createMockItem('2', 5, 5)  // 0 disponibles
    
    expect(item1.cantidad - item1.cantidadPedida).toBe(7)
    expect(item2.cantidad - item2.cantidadPedida).toBe(0)
  })
})
