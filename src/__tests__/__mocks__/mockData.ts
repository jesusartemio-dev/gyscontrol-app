/**
 * 🧪 Mock Data for Tests
 * 
 * Centralized mock data for Lista Equipo testing.
 * Includes realistic data structures for:
 * - Lista Equipo Master
 * - Lista Equipo Detail
 * - Lista Equipo Items
 * - Proyectos
 * - API responses
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { 
  ListaEquipo,
  ListaEquipoMaster,
  ListaEquipoItem,
  Proyecto,
  ListaEquipoStats,
  ListaEquipoFilters
} from '@/types/modelos';

// ✅ Mock Proyecto
export const mockProyecto: Proyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  descripcion: 'Proyecto de prueba para testing',
  estado: 'ACTIVO',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  presupuesto: 100000,
  clienteId: 'cliente-1',
  responsableId: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

// ✅ Mock Lista Equipo Master
export const mockListaEquipoMaster: ListaEquipoMaster = {
  id: 'lista-1',
  nombre: 'Lista de Equipos Test',
  descripcion: 'Lista de equipos para testing',
  estado: 'ACTIVA',
  progreso: 75,
  costoTotal: 15000,
  totalItems: 5,
  itemsCompletados: 3,
  fechaCreacion: new Date('2024-01-15'),
  fechaActualizacion: new Date('2024-01-20'),
  proyectoId: 'proyecto-1',
  proyecto: {
    nombre: 'Proyecto Test',
    estado: 'ACTIVO'
  }
};

// ✅ Mock Lista Equipo Detail
export const mockListaEquipo: ListaEquipo = {
  id: 'lista-1',
  nombre: 'Lista de Equipos Test',
  descripcion: 'Lista de equipos para testing',
  estado: 'ACTIVA',
  progreso: 75,
  costoTotal: 15000,
  totalItems: 5,
  itemsCompletados: 3,
  fechaCreacion: new Date('2024-01-15'),
  fechaActualizacion: new Date('2024-01-20'),
  proyectoId: 'proyecto-1',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20')
};

// ✅ Mock Lista Equipo Items
export const mockListaEquipoItem: ListaEquipoItem = {
  id: 'item-1',
  nombre: 'Excavadora CAT 320',
  descripcion: 'Excavadora hidráulica para movimiento de tierras',
  categoria: 'MAQUINARIA_PESADA',
  subcategoria: 'EXCAVADORAS',
  marca: 'Caterpillar',
  modelo: '320',
  especificaciones: {
    potencia: '122 HP',
    peso: '20 ton',
    capacidad: '1.2 m³'
  },
  cantidad: 2,
  unidad: 'UNIDAD',
  costoUnitario: 5000,
  costoTotal: 10000,
  progreso: 80,
  estado: 'EN_PROCESO',
  prioridad: 'ALTA',
  fechaInicio: new Date('2024-01-16'),
  fechaFin: new Date('2024-02-15'),
  responsableId: 'user-2',
  observaciones: 'Equipo en buen estado',
  listaEquipoId: 'lista-1',
  createdAt: new Date('2024-01-16'),
  updatedAt: new Date('2024-01-18')
};

// ✅ Additional mock items for testing
export const mockListaEquipoItems: ListaEquipoItem[] = [
  mockListaEquipoItem,
  {
    ...mockListaEquipoItem,
    id: 'item-2',
    nombre: 'Volquete Mercedes',
    categoria: 'TRANSPORTE',
    subcategoria: 'VOLQUETES',
    marca: 'Mercedes-Benz',
    modelo: 'Actros',
    cantidad: 3,
    costoUnitario: 2000,
    costoTotal: 6000,
    progreso: 100,
    estado: 'COMPLETADO'
  },
  {
    ...mockListaEquipoItem,
    id: 'item-3',
    nombre: 'Grúa Torre',
    categoria: 'MAQUINARIA_PESADA',
    subcategoria: 'GRUAS',
    marca: 'Liebherr',
    modelo: 'EC-B 125',
    cantidad: 1,
    costoUnitario: 8000,
    costoTotal: 8000,
    progreso: 50,
    estado: 'PENDIENTE'
  }
];

// ✅ Mock Lista Equipo Master array
export const mockListasEquipoMaster: ListaEquipoMaster[] = [
  mockListaEquipoMaster,
  {
    ...mockListaEquipoMaster,
    id: 'lista-2',
    nombre: 'Lista de Herramientas',
    descripcion: 'Herramientas menores para construcción',
    progreso: 90,
    costoTotal: 5000,
    totalItems: 10,
    itemsCompletados: 9,
    estado: 'ACTIVA'
  },
  {
    ...mockListaEquipoMaster,
    id: 'lista-3',
    nombre: 'Lista Completada',
    descripcion: 'Lista ya finalizada',
    progreso: 100,
    costoTotal: 20000,
    totalItems: 8,
    itemsCompletados: 8,
    estado: 'COMPLETADA'
  }
];

// ✅ Mock Stats
export const mockListaEquipoStats: ListaEquipoStats = {
  totalListas: 3,
  totalCosto: 40000,
  progresoPromedio: 88.33,
  statusDistribution: {
    ACTIVA: 2,
    COMPLETADA: 1,
    PAUSADA: 0,
    CANCELADA: 0
  }
};

// ✅ Mock Filters
export const mockListaEquipoFilters: ListaEquipoFilters = {
  search: '',
  estado: undefined,
  progreso: undefined,
  fechaInicio: undefined,
  fechaFin: undefined,
  costoMin: undefined,
  costoMax: undefined
};

// ✅ Mock API Responses
export const mockMasterResponse = {
  data: mockListasEquipoMaster,
  pagination: {
    total: 3,
    pages: 1,
    page: 1,
    limit: 12
  },
  stats: mockListaEquipoStats
};

export const mockDetailResponse = {
  lista: mockListaEquipo,
  items: mockListaEquipoItems,
  proyecto: mockProyecto
};

// ✅ Mock Error Responses
export const mockErrorResponse = {
  error: 'Internal Server Error',
  message: 'Something went wrong',
  statusCode: 500
};

export const mockNotFoundResponse = {
  error: 'Not Found',
  message: 'Lista de equipo no encontrada',
  statusCode: 404
};

// ✅ Mock Form Data
export const mockCreateListaPayload = {
  nombre: 'Nueva Lista de Equipos',
  descripcion: 'Lista creada para testing',
  proyectoId: 'proyecto-1'
};

export const mockUpdateListaPayload = {
  nombre: 'Lista Actualizada',
  descripcion: 'Descripción actualizada'
};

export const mockCreateItemPayload = {
  nombre: 'Nuevo Equipo',
  descripcion: 'Equipo creado para testing',
  categoria: 'MAQUINARIA_PESADA',
  subcategoria: 'EXCAVADORAS',
  marca: 'Caterpillar',
  modelo: '330',
  cantidad: 1,
  unidad: 'UNIDAD',
  costoUnitario: 6000,
  listaEquipoId: 'lista-1'
};

export const mockUpdateItemPayload = {
  nombre: 'Equipo Actualizado',
  progreso: 90,
  estado: 'EN_PROCESO'
};

// ✅ Mock User Data
export const mockUser = {
  id: 'user-1',
  nombre: 'Usuario Test',
  email: 'test@example.com',
  rol: 'ADMIN'
};

// ✅ Mock Session
export const mockSession = {
  user: mockUser,
  expires: '2024-12-31'
};

// ✅ Helper functions for creating mock data
export const createMockListaEquipo = (overrides: Partial<ListaEquipo> = {}): ListaEquipo => ({
  ...mockListaEquipo,
  ...overrides
});

export const createMockListaEquipoMaster = (overrides: Partial<ListaEquipoMaster> = {}): ListaEquipoMaster => ({
  ...mockListaEquipoMaster,
  ...overrides
});

export const createMockListaEquipoItem = (overrides: Partial<ListaEquipoItem> = {}): ListaEquipoItem => ({
  ...mockListaEquipoItem,
  ...overrides
});

export const createMockProyecto = (overrides: Partial<Proyecto> = {}): Proyecto => ({
  ...mockProyecto,
  ...overrides
});

// ✅ Mock data generators for bulk testing
export const generateMockListas = (count: number): ListaEquipoMaster[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockListaEquipoMaster,
    id: `lista-${index + 1}`,
    nombre: `Lista ${index + 1}`,
    progreso: Math.floor(Math.random() * 100),
    costoTotal: Math.floor(Math.random() * 50000) + 5000
  }));
};

export const generateMockItems = (count: number, listaId: string): ListaEquipoItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockListaEquipoItem,
    id: `item-${listaId}-${index + 1}`,
    nombre: `Equipo ${index + 1}`,
    listaEquipoId: listaId,
    progreso: Math.floor(Math.random() * 100),
    costoUnitario: Math.floor(Math.random() * 10000) + 1000
  }));
};

// ✅ Export all mocks as default
export default {
  proyecto: mockProyecto,
  listaEquipo: mockListaEquipo,
  listaEquipoMaster: mockListaEquipoMaster,
  listaEquipoItem: mockListaEquipoItem,
  listaEquipoItems: mockListaEquipoItems,
  listasEquipoMaster: mockListasEquipoMaster,
  stats: mockListaEquipoStats,
  filters: mockListaEquipoFilters,
  masterResponse: mockMasterResponse,
  detailResponse: mockDetailResponse,
  errorResponse: mockErrorResponse,
  notFoundResponse: mockNotFoundResponse,
  user: mockUser,
  session: mockSession
};