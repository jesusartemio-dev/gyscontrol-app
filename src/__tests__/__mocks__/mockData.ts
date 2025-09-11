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
  ListaEquipoItem,
  Proyecto,
  RolUsuario,
} from '@/types/modelos';

// ✅ Tipos locales para testing (no existen en modelos.ts)
interface ListaEquipoMaster {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: string;
  progreso: number;
  costoTotal: number;
  totalItems: number;
  itemsCompletados: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  proyectoId: string;
  proyecto: {
    nombre: string;
    estado: string;
  };
}

interface ListaEquipoStats {
  totalListas: number;
  totalCosto: number;
  progresoPromedio: number;
  statusDistribution: {
    ACTIVA: number;
    COMPLETADA: number;
    PAUSADA: number;
    CANCELADA: number;
  };
}

interface ListaEquipoFilters {
  search: string;
  estado?: string;
  progreso?: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  costoMin?: number;
  costoMax?: number;
}

// ✅ Mock Proyecto
export const mockProyecto: Proyecto = {
  id: 'proyecto-1',
  clienteId: 'cliente-1',
  comercialId: 'comercial-1',
  gestorId: 'gestor-1',
  cotizacionId: 'cotizacion-1',
  nombre: 'Proyecto Test',
  totalEquiposInterno: 80000,
  totalServiciosInterno: 15000,
  totalGastosInterno: 5000,
  totalInterno: 100000,
  totalCliente: 120000,
  descuento: 0,
  grandTotal: 120000,
  totalRealEquipos: 82000,
  totalRealServicios: 16000,
  totalRealGastos: 5500,
  totalReal: 103500,
  codigo: 'PRY-001',
  estado: 'activo',
  fechaInicio: '2024-01-01',
  fechaFin: '2024-12-31',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  cliente: {
    id: 'cliente-1',
    nombre: 'Cliente Test',
    ruc: '12345678901',
    direccion: 'Dirección Test',
    telefono: '123456789',
    correo: 'cliente@test.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  comercial: {
    id: 'comercial-1',
    name: 'Comercial Test',
    email: 'comercial@test.com',
    password: 'password',
    role: 'comercial' as RolUsuario,
    proyectosComercial: [],
    proyectosGestor: [],
    cotizaciones: [],
    ProyectoEquipos: [],
    ProyectoEquipoItems: [],
    ProyectoServicios: [],
    ProyectoServicioItems: []
  },
  gestor: {
    id: 'gestor-1',
    name: 'Gestor Test',
    email: 'gestor@test.com',
    password: 'password',
    role: 'gestor' as RolUsuario,
    proyectosComercial: [],
    proyectosGestor: [],
    cotizaciones: [],
    ProyectoEquipos: [],
    ProyectoEquipoItems: [],
    ProyectoServicios: [],
    ProyectoServicioItems: []
  },
  cotizacion: {
    id: 'cotizacion-1',
    nombre: 'Cotización Test',
    estado: 'aprobado',
    etapa: 'cerrada',
    prioridad: 'alta',
    probabilidad: 90,
    fechaEnvio: '2023-12-01',
    fechaCierreEstimada: '2024-01-01',
    notas: 'Cotización de prueba',
    totalEquiposInterno: 80000,
    totalEquiposCliente: 96000,
    totalServiciosInterno: 15000,
    totalServiciosCliente: 18000,
    totalGastosInterno: 5000,
    totalGastosCliente: 6000,
    totalInterno: 100000,
    totalCliente: 120000,
    descuento: 0,
    grandTotal: 120000,
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    cliente: {
      id: 'cliente-1',
      nombre: 'Cliente Test',
      ruc: '12345678901',
      direccion: 'Dirección Test',
      correo: 'cliente@test.com'
    },
    comercial: {
      id: 'comercial-1',
      nombre: 'Comercial Test'
    },
    plantilla: {
      id: 'plantilla-1',
      nombre: 'Plantilla Test'
    },
    equipos: [],
    servicios: [],
    gastos: []
  },
  equipos: [],
  servicios: [],
  gastos: [],
  ListaEquipo: [],
  cotizaciones: [],
  valorizaciones: [],
  registrosHoras: []
}

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

// ✅ Mock ListaEquipo
export const mockListaEquipo: ListaEquipo = {
  id: 'lista-1',
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  codigo: 'LST-001',
  nombre: 'Lista de Equipos Test',
  numeroSecuencia: 1,
  estado: 'aprobado',
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-20T00:00:00Z',
  fechaNecesaria: '2024-02-15T00:00:00Z',
  coherencia: 85,
  items: []
};

// ✅ Mock Lista Equipo Items
export const mockListaEquipoItem: ListaEquipoItem = {
  id: 'item-1',
  listaId: 'lista-1',
  codigo: 'EXC-001',
  descripcion: 'Excavadora hidráulica para movimiento de tierras',
  unidad: 'UNIDAD',
  cantidad: 2,
  verificado: true,
  comentarioRevision: 'Equipo verificado',
  presupuesto: 10000,
  precioElegido: 5000,
  costoElegido: 5000,
  estado: 'aprobado',
  origen: 'cotizado',
  tiempoEntrega: '15 días',
  tiempoEntregaDias: 15,
  createdAt: '2024-01-16T00:00:00Z',
  updatedAt: '2024-01-18T00:00:00Z',
  lista: {
    id: 'lista-1',
    proyectoId: 'proyecto-1',
    responsableId: 'user-1',
    codigo: 'LST-001',
    nombre: 'Lista de Equipos Test',
    numeroSecuencia: 1,
    estado: 'aprobado',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
    items: []
  },
  cotizaciones: [],
  pedidos: []
};

// ✅ Mock array de ListaEquipoItems
export const mockListaEquipoItems: ListaEquipoItem[] = [
  mockListaEquipoItem,
  {
    ...mockListaEquipoItem,
    id: 'item-2',
    codigo: 'VOL-001',
    descripcion: 'Volquete Mercedes para transporte',
    cantidad: 3,
    precioElegido: 2000,
    costoElegido: 2000,
    estado: 'aprobado'
  },
  {
    ...mockListaEquipoItem,
    id: 'item-3',
    codigo: 'GRU-001',
    descripcion: 'Grúa Torre Liebherr',
    cantidad: 1,
    precioElegido: 8000,
    costoElegido: 8000,
    estado: 'por_revisar'
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
