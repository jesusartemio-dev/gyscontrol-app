/**
 * 🎭 Fixtures y Mocks para Testing
 * 
 * Datos de prueba reutilizables y mocks para tests unitarios,
 * de integración y E2E del sistema GYS.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

import { 
  User, 
  Proyecto, 
  CatalogoEquipo, 
  Proveedor, 
  PedidoEquipo
} from '@prisma/client'

// ✅ Tipos de aprovisionamiento eliminados
// OrdenCompra, ItemOrdenCompra, Recepcion, Pago removidos

// 👥 Mock Users
export const mockUsers: Record<string, Partial<User>> = {
  admin: {
    id: 'user-admin-mock',
    email: 'admin@gys.com',
    name: 'Admin Usuario',
    role: 'ADMIN',
    estado: 'ACTIVO',
    emailVerified: new Date('2024-01-01')
  },
  gerente: {
    id: 'user-gerente-mock',
    email: 'gerente@gys.com',
    name: 'Gerente Usuario',
    role: 'GERENTE',
    estado: 'ACTIVO',
    emailVerified: new Date('2024-01-01')
  },
  comercial: {
    id: 'user-comercial-mock',
    email: 'comercial@gys.com',
    name: 'Comercial Usuario',
    role: 'COMERCIAL',
    estado: 'ACTIVO',
    emailVerified: new Date('2024-01-01')
  },
  logistica: {
    id: 'user-logistica-mock',
    email: 'logistica@gys.com',
    name: 'Logística Usuario',
    role: 'LOGISTICA',
    estado: 'ACTIVO',
    emailVerified: new Date('2024-01-01')
  },
  finanzas: {
    id: 'user-finanzas-mock',
    email: 'finanzas@gys.com',
    name: 'Finanzas Usuario',
    role: 'FINANZAS',
    estado: 'ACTIVO',
    emailVerified: new Date('2024-01-01')
  }
}

// 📋 Mock Proyectos
export const mockProyectos: Partial<Proyecto>[] = [
  {
    id: 'proyecto-mock-001',
    nombre: 'Proyecto Test Alpha',
    codigo: 'PROJ-ALPHA-001',
    descripcion: 'Proyecto de prueba para testing',
    cliente: 'Cliente Test S.A.C.',
    ubicacion: 'Lima, Perú',
    fechaInicio: new Date('2024-01-15'),
    fechaFinEstimada: new Date('2024-06-15'),
    presupuesto: 500000,
    moneda: 'PEN',
    estado: 'ACTIVO',
    prioridad: 'ALTA',
    responsableId: 'user-gerente-mock',
    progreso: 35
  },
  {
    id: 'proyecto-mock-002',
    nombre: 'Proyecto Test Beta',
    codigo: 'PROJ-BETA-002',
    descripcion: 'Segundo proyecto de prueba',
    cliente: 'Beta Corp',
    ubicacion: 'Arequipa, Perú',
    fechaInicio: new Date('2024-02-01'),
    fechaFinEstimada: new Date('2024-08-01'),
    presupuesto: 750000,
    moneda: 'USD',
    estado: 'ACTIVO',
    prioridad: 'MEDIA',
    responsableId: 'user-gerente-mock',
    progreso: 15
  }
]

// 🔧 Mock Equipos
export const mockEquipos: Partial<CatalogoEquipo>[] = [
  {
    id: 'equipo-mock-001',
    nombre: 'Excavadora CAT 320',
    codigo: 'EXC-CAT-320',
    categoria: 'MAQUINARIA_PESADA',
    subcategoria: 'Excavadoras',
    marca: 'Caterpillar',
    modelo: '320 GC',
    especificaciones: {
      potencia: '122 HP',
      peso: '20.5 ton',
      capacidad: '1.2 m³',
      alcance: '9.7 m'
    },
    precioReferencial: 180000,
    moneda: 'USD',
    estado: 'ACTIVO',
    requiereMantenimiento: true,
    vidaUtilAnios: 12
  },
  {
    id: 'equipo-mock-002',
    nombre: 'Volquete Volvo FMX',
    codigo: 'VOL-VOLVO-FMX',
    categoria: 'TRANSPORTE',
    subcategoria: 'Volquetes',
    marca: 'Volvo',
    modelo: 'FMX 8x4',
    especificaciones: {
      capacidad: '15 m³',
      potencia: '420 HP',
      peso: '16 ton'
    },
    precioReferencial: 250000,
    moneda: 'USD',
    estado: 'ACTIVO',
    requiereMantenimiento: true,
    vidaUtilAnios: 10
  }
]

// 🏢 Mock Proveedores
export const mockProveedores: Partial<Proveedor>[] = [
  {
    id: 'prov-mock-001',
    nombre: 'Ferreyros S.A.',
    ruc: '20100047218',
    email: 'ventas@ferreyros.com.pe',
    telefono: '01-6261600',
    direccion: 'Av. Cristóbal de Peralta Norte 820, Lima',
    estado: 'ACTIVO',
    tipoProveedor: 'EQUIPOS',
    contactoPrincipal: 'Juan Carlos Mendoza',
    condicionesPago: '30 días',
    calificacion: 5
  },
  {
    id: 'prov-mock-002',
    nombre: 'Volvo Construction Equipment',
    ruc: '20512345678',
    email: 'info@volvoce.com.pe',
    telefono: '01-7001234',
    direccion: 'Av. El Derby 254, Lima',
    estado: 'ACTIVO',
    tipoProveedor: 'EQUIPOS',
    contactoPrincipal: 'María Elena Vásquez',
    condicionesPago: '45 días',
    calificacion: 4
  },
  {
    id: 'prov-inactivo-mock',
    nombre: 'Proveedor Inactivo S.A.C.',
    ruc: '20987654321',
    email: 'contacto@inactivo.com',
    telefono: '01-5555555',
    direccion: 'Calle Falsa 123',
    estado: 'INACTIVO',
    tipoProveedor: 'EQUIPOS',
    contactoPrincipal: 'Pedro Pérez',
    condicionesPago: '15 días',
    calificacion: 2
  }
]

// 📦 Mock Pedidos de Equipo
export const mockPedidosEquipo: Partial<PedidoEquipo>[] = [
  {
    id: 'pedido-mock-001',
    proyectoId: 'proyecto-mock-001',
    equipoId: 'equipo-mock-001',
    cantidad: 3,
    fechaNecesaria: new Date('2024-03-15'),
    prioridad: 'ALTA',
    estado: 'APROBADO',
    observaciones: 'Urgente para inicio de obra',
    solicitanteId: 'user-comercial-mock',
    fechaSolicitud: new Date('2024-01-20')
  },
  {
    id: 'pedido-mock-002',
    proyectoId: 'proyecto-mock-002',
    equipoId: 'equipo-mock-002',
    cantidad: 2,
    fechaNecesaria: new Date('2024-04-01'),
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    observaciones: 'Para transporte de materiales',
    solicitanteId: 'user-comercial-mock',
    fechaSolicitud: new Date('2024-02-01')
  }
]

// 🛒 Mocks de aprovisionamiento eliminados
// mockOrdenesCompra removido

// 📦 Mocks de recepciones eliminados
// mockRecepciones removido

// 💰 Mocks de pagos eliminados
// mockPagos removido

// 🎭 Mock Responses para APIs
export const mockApiResponses = {
  // ✅ Respuestas exitosas
  success: {
    create: { success: true, message: 'Creado exitosamente' },
    update: { success: true, message: 'Actualizado exitosamente' },
    delete: { success: true, message: 'Eliminado exitosamente' },
    list: { success: true, data: [], total: 0, page: 1, limit: 10 }
  },
  
  // ❌ Respuestas de error
  error: {
    unauthorized: { error: 'No autorizado', status: 401 },
    forbidden: { error: 'Acceso denegado', status: 403 },
    notFound: { error: 'Recurso no encontrado', status: 404 },
    validation: { error: 'Datos inválidos', status: 400, details: [] },
    server: { error: 'Error interno del servidor', status: 500 }
  }
}

// 🔧 Funciones utilitarias para mocks
export const mockHelpers = {
  /**
   * 🏗️ Crear mock de usuario con rol específico
   */
  createMockUser: (role: string, overrides: Partial<User> = {}): Partial<User> => ({
    ...mockUsers[role.toLowerCase()],
    ...overrides
  }),
  
  /**
   * 📋 Crear mock de proyecto
   */
  createMockProyecto: (overrides: Partial<Proyecto> = {}): Partial<Proyecto> => ({
    ...mockProyectos[0],
    ...overrides
  }),
  
  /**
   * 🔧 Crear mock de equipo
   */
  createMockEquipo: (overrides: Partial<CatalogoEquipo> = {}): Partial<CatalogoEquipo> => ({
    ...mockEquipos[0],
    ...overrides
  }),
  
  /**
   * 🏢 Crear mock de proveedor
   */
  createMockProveedor: (overrides: Partial<Proveedor> = {}): Partial<Proveedor> => ({
    ...mockProveedores[0],
    ...overrides
  }),
  
  /**
   * 🛒 Crear mock de orden de compra completa
   */
  createMockOrdenCompleta: (overrides: any = {}) => ({
    ...mockOrdenesCompra[0],
    proveedor: mockProveedores[0],
    items: mockOrdenesCompra[0].items?.map(item => ({
      ...item,
      pedidoEquipo: {
        ...mockPedidosEquipo[0],
        equipo: mockEquipos[0],
        proyecto: mockProyectos[0]
      }
    })),
    ...overrides
  }),
  
  /**
   * 📊 Crear mock de respuesta paginada
   */
  createMockPaginatedResponse: <T>(data: T[], page = 1, limit = 10, total?: number) => ({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: total ?? data.length,
      totalPages: Math.ceil((total ?? data.length) / limit)
    }
  }),
  
  /**
   * ⏱️ Crear mock con delay (para simular latencia)
   */
  createDelayedMock: <T>(data: T, delay = 100): Promise<T> => 
    new Promise(resolve => setTimeout(() => resolve(data), delay)),
  
  /**
   * 🎲 Generar datos aleatorios
   */
  generateRandomId: () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  generateRandomEmail: () => `test-${Date.now()}@gys.com`,
  
  generateRandomRUC: () => `20${Math.floor(Math.random() * 900000000) + 100000000}`,
  
  /**
   * 📅 Generar fechas de prueba
   */
  generateTestDates: () => {
    const now = new Date()
    return {
      past: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
      present: now,
      future: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 días adelante
    }
  }
}

// 🧪 Configuraciones de test específicas
export const testConfig = {
  // ⏱️ Timeouts
  timeouts: {
    short: 1000,
    medium: 5000,
    long: 10000
  },
  
  // 📊 Límites
  limits: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxItems: 100,
    maxRetries: 3
  },
  
  // 🔐 Credenciales de prueba
  testCredentials: {
    validPassword: 'Test123!',
    invalidPassword: '123',
    testDomain: '@gys.com'
  },
  
  // 🌐 URLs de prueba
  testUrls: {
    api: '/api',
    login: '/auth/login',
    dashboard: '/dashboard',
    proyectos: '/proyectos',
    finanzas: '/finanzas'
  }
}

export default {
  mockUsers,
  mockProyectos,
  mockEquipos,
  mockProveedores,
  mockPedidosEquipo,
  // mockOrdenesCompra, mockRecepciones, mockPagos eliminados
  mockApiResponses,
  mockHelpers,
  testConfig
}