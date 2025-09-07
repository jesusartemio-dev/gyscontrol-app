/**
 * @fileoverview Mock data para tests de cotizaciones
 * Proporciona datos de prueba consistentes para validar UX/UI
 */

import { Cotizacion, CotizacionEquipo, CotizacionServicio, CotizacionGasto } from '@/types/modelos'

// Mock de equipo de cotización
export const mockCotizacionEquipo: CotizacionEquipo = {
  id: 'equipo-1',
  cotizacionId: 'cotizacion-1',
  nombre: 'Sección de Equipos de Prueba',
  descripcion: 'Descripción de equipos de prueba',
  items: [
    {
      id: 'item-1',
      nombre: 'Equipo Test 1',
      descripcion: 'Descripción del equipo test',
      cantidad: 2,
      precioUnitario: 1500.00,
      costoUnitario: 1000.00,
      total: 3000.00,
      costoTotal: 2000.00,
      rentabilidad: 33.33,
      unidad: 'unidad',
      categoria: 'Equipos',
      marca: 'Test Brand',
      modelo: 'Test Model',
      especificaciones: 'Especificaciones de prueba'
    }
  ],
  subtotal: 3000.00,
  costoTotal: 2000.00,
  rentabilidad: 33.33,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
}

// Mock de servicio de cotización
export const mockCotizacionServicio: CotizacionServicio = {
  id: 'servicio-1',
  cotizacionId: 'cotizacion-1',
  nombre: 'Sección de Servicios de Prueba',
  descripcion: 'Descripción de servicios de prueba',
  items: [
    {
      id: 'item-1',
      nombre: 'Servicio Test 1',
      descripcion: 'Descripción del servicio test',
      cantidad: 1,
      precioUnitario: 2000.00,
      costoUnitario: 1200.00,
      total: 2000.00,
      costoTotal: 1200.00,
      rentabilidad: 40.00,
      unidad: 'servicio',
      categoria: 'Instalación',
      tipoServicio: 'Instalación y configuración',
      duracionEstimada: '2 días'
    }
  ],
  subtotal: 2000.00,
  costoTotal: 1200.00,
  rentabilidad: 40.00,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
}

// Mock de gasto de cotización
export const mockCotizacionGasto: CotizacionGasto = {
  id: 'gasto-1',
  cotizacionId: 'cotizacion-1',
  nombre: 'Sección de Gastos de Prueba',
  descripcion: 'Descripción de gastos de prueba',
  items: [
    {
      id: 'item-1',
      nombre: 'Gasto Test 1',
      descripcion: 'Descripción del gasto test',
      cantidad: 1,
      precioUnitario: 500.00,
      costoUnitario: 500.00,
      total: 500.00,
      costoTotal: 500.00,
      rentabilidad: 0.00,
      unidad: 'servicio',
      categoria: 'Logística',
      tipoGasto: 'Transporte'
    }
  ],
  subtotal: 500.00,
  costoTotal: 500.00,
  rentabilidad: 0.00,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
}

// Mock de cotización completa
export const mockCotizacion: Cotizacion = {
  id: 'cotizacion-1',
  nombre: 'Cotización de Prueba UX/UI',
  descripcion: 'Cotización para validar mejoras de diseño',
  estado: 'BORRADOR',
  clienteId: 'cliente-1',
  cliente: {
    id: 'cliente-1',
    nombre: 'Cliente Test S.A.C.',
    email: 'cliente@test.com',
    telefono: '+51 999 888 777',
    direccion: 'Av. Test 123, Lima, Perú',
    ruc: '20123456789',
    contactoPrincipal: 'Juan Pérez',
    estado: 'ACTIVO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  comercialId: 'comercial-1',
  comercial: {
    id: 'comercial-1',
    nombre: 'María García',
    email: 'maria.garcia@gys.com',
    telefono: '+51 999 777 666',
    rol: 'COMERCIAL',
    estado: 'ACTIVO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  equipos: [mockCotizacionEquipo],
  servicios: [mockCotizacionServicio],
  gastos: [mockCotizacionGasto],
  subtotal: 5500.00,
  impuestos: 990.00,
  total: 6490.00,
  costoTotal: 3700.00,
  rentabilidad: 43.01,
  moneda: 'PEN',
  validoHasta: new Date('2024-02-15T23:59:59Z'),
  condicionesPago: 'Pago contra entrega',
  tiempoEntrega: '15 días hábiles',
  garantia: '12 meses',
  observaciones: 'Cotización de prueba para validar UX/UI',
  version: 1,
  createdAt: '2024-01-15T10:00:00Z',
  fechaActualizacion: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
}

// Mock de cotización vacía (para probar estados vacíos)
export const mockCotizacionVacia: Cotizacion = {
  ...mockCotizacion,
  id: 'cotizacion-vacia',
  nombre: 'Cotización Vacía para Tests',
  equipos: [],
  servicios: [],
  gastos: [],
  subtotal: 0,
  impuestos: 0,
  total: 0,
  costoTotal: 0,
  rentabilidad: 0
}

// Mock de cotización con muchos elementos (para probar performance)
export const mockCotizacionCompleja: Cotizacion = {
  ...mockCotizacion,
  id: 'cotizacion-compleja',
  nombre: 'Cotización Compleja para Tests de Performance',
  equipos: Array.from({ length: 5 }, (_, i) => ({
    ...mockCotizacionEquipo,
    id: `equipo-${i + 1}`,
    nombre: `Sección de Equipos ${i + 1}`,
    items: Array.from({ length: 10 }, (_, j) => ({
      ...mockCotizacionEquipo.items[0],
      id: `equipo-${i + 1}-item-${j + 1}`,
      nombre: `Equipo ${i + 1}-${j + 1}`
    }))
  })),
  servicios: Array.from({ length: 3 }, (_, i) => ({
    ...mockCotizacionServicio,
    id: `servicio-${i + 1}`,
    nombre: `Sección de Servicios ${i + 1}`,
    items: Array.from({ length: 5 }, (_, j) => ({
      ...mockCotizacionServicio.items[0],
      id: `servicio-${i + 1}-item-${j + 1}`,
      nombre: `Servicio ${i + 1}-${j + 1}`
    }))
  })),
  gastos: Array.from({ length: 2 }, (_, i) => ({
    ...mockCotizacionGasto,
    id: `gasto-${i + 1}`,
    nombre: `Sección de Gastos ${i + 1}`,
    items: Array.from({ length: 3 }, (_, j) => ({
      ...mockCotizacionGasto.items[0],
      id: `gasto-${i + 1}-item-${j + 1}`,
      nombre: `Gasto ${i + 1}-${j + 1}`
    }))
  }))
}

// Estados de cotización para tests
export const estadosCotizacion = {
  BORRADOR: 'BORRADOR',
  ENVIADA: 'ENVIADA',
  APROBADA: 'APROBADA',
  RECHAZADA: 'RECHAZADA',
  VENCIDA: 'VENCIDA',
  CERRADA: 'CERRADA'
} as const

// Variantes de estado para badges
export const variantesEstado = {
  BORRADOR: 'secondary',
  ENVIADA: 'default',
  APROBADA: 'default',
  RECHAZADA: 'destructive',
  VENCIDA: 'destructive',
  CERRADA: 'outline'
} as const

// Mock de respuestas de API
export const mockApiResponses = {
  getCotizacion: {
    success: {
      data: mockCotizacion,
      message: 'Cotización obtenida exitosamente'
    },
    error: {
      error: 'Cotización no encontrada',
      message: 'No se pudo encontrar la cotización solicitada'
    },
    loading: {
      loading: true
    }
  },
  updateCotizacion: {
    success: {
      data: { ...mockCotizacion, updatedAt: new Date().toISOString() },
      message: 'Cotización actualizada exitosamente'
    },
    error: {
      error: 'Error al actualizar',
      message: 'No se pudo actualizar la cotización'
    }
  }
}

// Utilidades para tests
export const testUtils = {
  // Crear cotización con estado específico
  createCotizacionWithStatus: (estado: keyof typeof estadosCotizacion) => ({
    ...mockCotizacion,
    estado: estadosCotizacion[estado]
  }),
  
  // Crear cotización con elementos específicos
  createCotizacionWithItems: (equipos = 0, servicios = 0, gastos = 0) => ({
    ...mockCotizacion,
    equipos: equipos > 0 ? Array.from({ length: equipos }, (_, i) => ({
      ...mockCotizacionEquipo,
      id: `equipo-${i + 1}`
    })) : [],
    servicios: servicios > 0 ? Array.from({ length: servicios }, (_, i) => ({
      ...mockCotizacionServicio,
      id: `servicio-${i + 1}`
    })) : [],
    gastos: gastos > 0 ? Array.from({ length: gastos }, (_, i) => ({
      ...mockCotizacionGasto,
      id: `gasto-${i + 1}`
    })) : []
  }),
  
  // Simular delay de red
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generar datos aleatorios para stress testing
  generateRandomCotizacion: () => ({
    ...mockCotizacion,
    id: `cotizacion-${Math.random().toString(36).substr(2, 9)}`,
    nombre: `Cotización ${Math.floor(Math.random() * 1000)}`,
    total: Math.floor(Math.random() * 100000) + 1000
  })
}