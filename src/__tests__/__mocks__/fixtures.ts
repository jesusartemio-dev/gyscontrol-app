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
export const mockUsers: Partial<User>[] = [
  {
    id: 'user-admin-mock',
    name: 'Admin Test',
    email: 'admin@test.com',
    password: 'hashedpassword123',
    role: 'admin'
  },
  {
    id: 'user-gerente-mock',
    name: 'Gerente Test',
    email: 'gerente@test.com',
    password: 'hashedpassword123',
    role: 'gerente'
  },
  {
    id: 'user-comercial-mock',
    name: 'Comercial Test',
    email: 'comercial@test.com',
    password: 'hashedpassword123',
    role: 'comercial'
  },
  {
    id: 'user-logistico-mock',
    name: 'Logístico Test',
    email: 'logistico@test.com',
    password: 'hashedpassword123',
    role: 'logistico'
  },
  {
    id: 'user-gestor-mock',
    name: 'Gestor Test',
    email: 'gestor@test.com',
    password: 'hashedpassword123',
    role: 'gestor'
  }
]

// 📋 Mock Proyectos
export const mockProyectos: Partial<Proyecto>[] = [
  {
    id: 'proyecto-mock-001',
    clienteId: 'cliente-mock-001',
    comercialId: 'user-comercial-mock',
    gestorId: 'user-gestor-mock',
    nombre: 'Proyecto Test Alpha',
    codigo: 'PROJ-ALPHA-001',
    estado: 'activo',
    fechaInicio: new Date('2024-01-15'),
    fechaFin: new Date('2024-06-15'),
    totalInterno: 450000,
    totalCliente: 500000,
    grandTotal: 500000
  },
  {
    id: 'proyecto-mock-002',
    clienteId: 'cliente-mock-002',
    comercialId: 'user-comercial-mock',
    gestorId: 'user-gestor-mock',
    nombre: 'Proyecto Test Beta',
    codigo: 'PROJ-BETA-002',
    estado: 'activo',
    fechaInicio: new Date('2024-02-01'),
    fechaFin: new Date('2024-08-01'),
    totalInterno: 675000,
    totalCliente: 750000,
    grandTotal: 750000
  }
]

// 🔧 Mock Equipos
export const mockEquipos: Partial<CatalogoEquipo>[] = [
  {
    id: 'equipo-mock-001',
    codigo: 'EXC-CAT-320',
    descripcion: 'Excavadora CAT 320',
    categoriaId: 'categoria-mock-001',
    unidadId: 'unidad-mock-001',
    marca: 'Caterpillar',
    precioInterno: 150000,
    margen: 1.2,
    precioVenta: 180000,
    estado: 'ACTIVO'
  },
  {
    id: 'equipo-mock-002',
    codigo: 'VOL-VOLVO-FMX',
    descripcion: 'Volquete Volvo FMX',
    categoriaId: 'categoria-mock-002',
    unidadId: 'unidad-mock-002',
    marca: 'Volvo',
    precioInterno: 200000,
    margen: 1.25,
    precioVenta: 250000,
    estado: 'ACTIVO'
  }
]

// 🏢 Mock Proveedores
export const mockProveedores: Partial<Proveedor>[] = [
  {
    id: 'prov-mock-001',
    nombre: 'Ferreyros S.A.',
    ruc: '20100047218'
  },
  {
    id: 'prov-mock-002',
    nombre: 'Volvo Construction Equipment',
    ruc: '20512345678'
  },
  {
    id: 'prov-inactivo-mock',
    nombre: 'Proveedor Inactivo S.A.C.',
    ruc: '20987654321'
  }
]

// 📦 Mock Pedidos de Equipo
export const mockPedidosEquipo: Partial<PedidoEquipo>[] = [
  {
    id: 'pedido-mock-001',
    proyectoId: 'proyecto-mock-001',
    responsableId: 'user-comercial-mock',
    codigo: 'PED-001',
    numeroSecuencia: 1,
    estado: 'enviado',
    fechaPedido: new Date('2024-01-20'),
    fechaNecesaria: new Date('2024-03-15'),
    observacion: 'Urgente para inicio de obra'
  },
  {
    id: 'pedido-mock-002',
    proyectoId: 'proyecto-mock-002',
    responsableId: 'user-comercial-mock',
    codigo: 'PED-002',
    numeroSecuencia: 2,
    estado: 'borrador',
    fechaPedido: new Date('2024-02-01'),
    fechaNecesaria: new Date('2024-04-01'),
    observacion: 'Para transporte de materiales'
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
   * 👥 Crear mock de usuario por rol
   */
  createMockUser: (role: string, overrides: Partial<User> = {}): Partial<User> => {
    const user = mockUsers.find(u => u.role === role.toLowerCase());
    if (!user) {
      throw new Error(`Mock user with role '${role}' not found`);
    }
    return {
      ...user,
      ...overrides
    };
  },
  
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
  
  // 🛒 createMockOrdenCompleta eliminado - modelo OrdenCompra removido del sistema
  
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
