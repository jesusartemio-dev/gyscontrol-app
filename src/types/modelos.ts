// ===================================================
// 📁 Archivo: modelos.ts
// 📌 Ubicación: src/types/
// 🔧 Descripción: Contiene todas las interfaces TypeScript 
//    que representan los modelos de datos principales del sistema,
//    alineados con el esquema Prisma (schema.prisma).
//
// 🧠 Uso: Se importa en cualquier componente, página o servicio
//    que necesite acceder a estructuras de datos tipadas.
// ===================================================


// Tipos generales
export type Estado = 'pendiente' | 'aprobado' | 'rechazado'
export type TipoFormula = 'Fijo' | 'Proporcional' | 'Escalonada'
export type RolUsuario =
  | 'colaborador'
  | 'comercial'
  | 'presupuestos'
  | 'proyectos'
  | 'coordinador'
  | 'logistico'
  | 'gestor'
  | 'gerente'
  | 'admin'

export type EstadoEquipo =
  | 'pendiente'
  | 'revisado_tecnico'
  | 'aprobado_coordinador'
  | 'aprobado_gestor'
  | 'en_lista'
  | 'comprado'
  | 'reemplazado'
  | 'entregado'

export type EstadoListaEquipo =
  | 'borrador'
  | 'por_revisar'
  | 'por_cotizar'
  | 'por_validar'
  | 'por_aprobar'
  | 'aprobado'
  | 'rechazado'

export type EstadoPedido =
  | 'borrador'
  | 'enviado'
  | 'atendido'
  | 'parcial'
  | 'entregado'
  | 'cancelado'

export type EstadoPedidoItem =
  | 'pendiente'
  | 'atendido'
  | 'parcial'
  | 'entregado'


// ============================
// 🛡️ Autenticación y Sesión
// ============================
export interface User {
  id: string
  name?: string | null
  email: string
  emailVerified?: string | null
  password: string
  role: RolUsuario
  image?: string | null

  // Relaciones
  proyectosComercial: Proyecto[]
  proyectosGestor: Proyecto[]
  cotizaciones: Cotizacion[]
  ProyectoEquipos: ProyectoEquipo[]
  ProyectoEquipoItems: ProyectoEquipoItem[]
  ProyectoServicios: ProyectoServicio[]
  ProyectoServicioItems: ProyectoServicioItem[]
}

export interface Account {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token?: string
  access_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
  id_token?: string
  session_state?: string
}

export interface Session {
  id: string
  sessionToken: string
  userId: string
  expires: string
}
export interface VerificationToken {
  identifier: string
  token: string
  expires: string
}


// ============================
// 📒 Generales
// ============================
export interface Cliente {
  id: string
  nombre: string
  ruc?: string
  direccion?: string
  telefono?: string
  correo?: string
  createdAt: string
  updatedAt: string
  cotizaciones?: Cotizacion[]
  proyectos?: Proyecto[]
}

export interface Unidad {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
}

export interface UnidadServicio {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
  servicios?: CatalogoServicio[]
  plantillaServicioItems?: PlantillaServicioItem[]
}

export interface CategoriaEquipo {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
}

export interface NivelServicio {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
}

export interface CategoriaServicio {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
  servicios?: CatalogoServicio[] // 🔁 Relación real completa
}


export interface Recurso {
  id: string
  nombre: string
  costoHora: number
  createdAt: string
  updatedAt: string
  servicios?: CatalogoServicio[]
  plantillaServicioItems?: PlantillaServicioItem[]
}

// ======================
// 📦 Catálogo de Equipos
// ======================
export interface CatalogoEquipo {
  id: string
  codigo: string
  descripcion: string
  categoriaId: string
  unidadId: string
  categoria: {
    id: string
    nombre: string
  }
  unidad: {
    id: string
    nombre: string
  }
  marca: string
  precioInterno: number
  margen: number
  precioVenta: number
  estado: string
  createdAt: string
  updatedAt: string
}

// ========================
// ⚙️ Catálogo de Servicios
// ========================
export interface CatalogoServicio {
  id: string
  nombre: string
  descripcion: string
  formula: TipoFormula // 'Fijo' | 'Proporcional' | 'Escalonada'
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  categoriaId: string
  unidadServicioId: string
  recursoId: string
  createdAt: string
  updatedAt: string
  // Relaciones anidadas (incluidas desde API)
  categoria: {
    id: string
    nombre: string
  }
  unidadServicio: {
    id: string
    nombre: string
  }
  recurso: {
    id: string
    nombre: string
    costoHora: number
  }
}

// ==================
// 🧹 Plantilla
// ==================
export interface Plantilla {
  id: string
  nombre: string
  estado: string
  // Totales por sección
  totalEquiposInterno: number
  totalEquiposCliente: number
  totalServiciosInterno: number
  totalServiciosCliente: number
  totalGastosInterno: number
  totalGastosCliente: number
  // Totales globales
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number
  // Fechas
  createdAt: string
  updatedAt: string
  // Relaciones
  equipos: PlantillaEquipo[]
  servicios: PlantillaServicio[]
  gastos: PlantillaGasto[]
}


export interface PlantillaEquipo {
  id: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
  createdAt: string
  updatedAt: string
  items: PlantillaEquipoItem[]
}

export interface PlantillaEquipoItem {
  id: string
  plantillaEquipoId: string
  catalogoEquipoId?: string
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  precioInterno: number
  precioCliente: number
  cantidad: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
  // Relaciones opcionales si haces include
  catalogoEquipo?: {
    id: string
    codigo: string
    descripcion: string
    categoria: string
    unidad: string
    marca: string
    precioInterno: number
    precioCliente: number
  }
}


export interface PlantillaServicio {
  id: string
  plantillaId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
  createdAt: string
  updatedAt: string
  items: PlantillaServicioItem[] // ← relación anidada
}

export interface PlantillaServicioItem {
  id: string
  plantillaServicioId: string
  catalogoServicioId?: string
  unidadServicioId: string
  recursoId: string
    // 📋 Datos copiados desde catálogo
  nombre: string
  descripcion: string
  categoria: string
  unidadServicioNombre: string
  recursoNombre: string
  formula: TipoFormula // 'Fijo' | 'Proporcional' | 'Escalonada'
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  costoHora: number
  // 🧮 Datos personalizados
  cantidad: number
  horaTotal: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  // Auditoría
  createdAt: string
  updatedAt: string
  // Relaciones anidadas (por .include())
  unidadServicio: {
    id: string
    nombre: string
  }

  recurso: {
    id: string
    nombre: string
    costoHora: number
  }
  catalogoServicio?: {
    id: string
    nombre: string
    descripcion: string
  }
}

export interface PlantillaGasto {
  id: string
  plantillaId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
  createdAt: string
  updatedAt: string

  // Relaciones anidadas
  plantilla: {
    id: string
    nombre: string
  }

  items: PlantillaGastoItem[]
}

export interface PlantillaGastoItem {
  id: string
  gastoId: string
  nombre: string
  descripcion?: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
}


// ============================
// 💲 Cotización
// ============================

export interface Cotizacion {
  id: string
  nombre: string
  estado: string
  etapa: string
  prioridad?: string | null
  probabilidad?: number | null
  fechaEnvio?: string | null
  fechaCierreEstimada?: string | null
  notas?: string | null

  totalEquiposInterno: number
  totalEquiposCliente: number
  totalServiciosInterno: number
  totalServiciosCliente: number
  totalGastosInterno: number
  totalGastosCliente: number
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number
  createdAt: string
  updatedAt: string
  cliente: {
    id: string
    nombre: string
  } | null
  comercial: {
    id: string
    nombre: string
  } | null
  plantilla: {
    id: string
    nombre: string
  } | null
  equipos: CotizacionEquipo[]
  servicios: CotizacionServicio[]
  gastos: CotizacionGasto[]
}



export interface CotizacionEquipo {
  id: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
  createdAt: string
  updatedAt: string
  items: CotizacionEquipoItem[]
}

export interface CotizacionEquipoItem {
  id: string
  cotizacionEquipoId: string
  catalogoEquipoId?: string
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  precioInterno: number
  precioCliente: number
  cantidad: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
  // Relaciones opcionales si haces include
  catalogoEquipo?: {
    id: string
    codigo: string
    descripcion: string
    categoria: string
    unidad: string
    marca: string
    precioInterno: number
    precioCliente: number
  }
}


export interface CotizacionServicio {
  id: string
  categoria: string
  subtotalInterno: number
  subtotalCliente: number
  createdAt: string
  updatedAt: string
  items: CotizacionServicioItem[]
}

export interface CotizacionServicioItem {
  id: string
  cotizacionServicioId: string
  catalogoServicioId?: string
  unidadServicioId: string
  recursoId: string
  // 📋 Datos copiados desde catálogo / plantilla
  nombre: string
  descripcion: string
  categoria: string
  unidadServicioNombre: string
  recursoNombre: string
  formula: TipoFormula // 'Fijo' | 'Proporcional' | 'Escalonada'
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  costoHora: number
  // 🧮 Datos personalizados
  cantidad: number
  horaTotal: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  // Auditoría
  createdAt: string
  updatedAt: string
  // 🔗 Relaciones anidadas (por .include())
  unidadServicio: {
    id: string
    nombre: string
  }
  recurso: {
    id: string
    nombre: string
    costoHora: number
  }
  catalogoServicio?: {
    id: string
    nombre: string
    descripcion: string
  }
}

export interface CotizacionGasto {
  id: string
  cotizacionId: string
  nombre: string
  descripcion?: string | null
  subtotalInterno: number
  subtotalCliente: number
  createdAt: string
  updatedAt: string
  items: CotizacionGastoItem[]
}

export interface CotizacionGastoItem {
  id: string
  gastoId: string
  nombre: string
  descripcion?: string | null
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  createdAt: string
  updatedAt: string
}



// ============================
// 🏗️ Proyectos
// ============================


export interface Proyecto {
  id: string
  clienteId: string
  comercialId: string
  gestorId: string
  cotizacionId?: string

  nombre: string
  totalEquiposInterno: number
  totalServiciosInterno: number
  totalGastosInterno: number
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number
  totalRealEquipos: number
  totalRealServicios: number
  totalRealGastos: number
  totalReal: number
  codigo: string
  estado: string
  fechaInicio: string
  fechaFin?: string
  createdAt: string
  updatedAt: string

  cliente: Cliente
  comercial: User
  gestor: User
  cotizacion?: Cotizacion

  equipos: ProyectoEquipo[]
  servicios: ProyectoServicio[]
  gastos: ProyectoGasto[]
  ListaEquipo: ListaEquipo[]
  cotizacionesProveedor: CotizacionProveedor[]
  valorizaciones: Valorizacion[]
  registrosHoras: RegistroHoras[]
}

export interface ProyectoEquipo {
  id: string
  proyectoId: string
  responsableId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
  subtotalReal: number
  createdAt: string
  updatedAt: string

  proyecto: Proyecto
  responsable: User
  items: ProyectoEquipoItem[]
}

export interface ProyectoEquipoItem {
  id: string
  proyectoEquipoId: string
  catalogoEquipoId?: string
  listaId?: string
  equipoOriginalId?: string // 🆕 ID del equipo original si este es un reemplazo

  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string

  precioInterno: number
  precioCliente: number
  cantidad: number
  costoInterno: number
  costoCliente: number

  precioReal: number
  cantidadReal: number
  costoReal: number

  tiempoEntrega?: number
  fechaEntregaEstimada?: string

  estado: EstadoEquipo
  aprobado: boolean
  motivoCambio?: string
  nuevo: boolean

  createdAt: string
  updatedAt: string

  // Relaciones
  proyectoEquipo: ProyectoEquipo
  catalogoEquipo?: CatalogoEquipo
  ListaEquipo: ListaEquipoItem[]

  lista?: {
    id: string
    nombre: string
  }

  // 🆕 Relaciones adicionales para reemplazo
  equipoOriginal?: ProyectoEquipoItem      // si este ítem es reemplazo de otro
  reemplazos?: ProyectoEquipoItem[]        // si este ítem fue reemplazado por otros
}



export interface ProyectoServicio {
  id: string
  proyectoId: string
  responsableId: string

  categoria: string
  subtotalInterno: number
  subtotalCliente: number
  subtotalReal: number // 🔥 Agregado

  createdAt: string
  updatedAt: string

  proyecto: Proyecto
  responsable: User
  items: ProyectoServicioItem[]
}

export interface ProyectoServicioItem {
  id: string
  proyectoServicioId: string
  catalogoServicioId?: string
  responsableId: string

  categoria: string
  costoHoraInterno: number
  costoHoraCliente: number
  nombre: string
  cantidadHoras: number
  costoInterno: number
  costoCliente: number

  costoReal: number      // 🔥 Agregado
  horasEjecutadas: number // 🔥 Agregado
  motivoCambio?: string   // 🔥 Agregado
  nuevo: boolean          // 🔥 Agregado

  createdAt: string
  updatedAt: string

  proyectoServicio: ProyectoServicio
  responsable: User
  catalogoServicio?: CatalogoServicio
}

export interface ProyectoGasto {
  id: string
  proyectoId: string

  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
  subtotalReal: number

  createdAt: string
  updatedAt: string

  proyecto: Proyecto
  items: ProyectoGastoItem[]
}
export interface ProyectoGastoItem {
  id: string
  gastoId: string

  nombre: string
  descripcion?: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  costoReal: number

  createdAt: string
  updatedAt: string

  gasto: ProyectoGasto
}

// ============================
// 🏗️ GESTION EQUIPOS
// ============================

export interface ListaEquipo {
  id: string
  proyectoId: string
  nombre: string
  descripcion?: string
  estado: EstadoListaEquipo
  createdAt: string
  updatedAt: string
  items: ListaEquipoItem[]
}

export interface ListaEquipoItem {
  id: string
  listaId: string
  proyectoEquipoItemId?: string
  proveedorId?: string
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  verificado: boolean
  comentarioRevision?: string
  presupuesto?: number
  precioElegido?: number
  costoElegido?: number
  costoPedido?: number
  costoReal?: number
  cantidadPedida?: number
  cantidadEntregada?: number

  lista: ListaEquipo

  createdAt: string
  updatedAt: string
  cotizaciones: CotizacionProveedorItem[]
  pedidos: PedidoEquipoItem[]

  proyectoEquipoItem?: {
    proyectoEquipo?: {
      nombre: string
    }
  }
  proveedor?: Proveedor
}

export interface Proveedor {
  id: string
  nombre: string
  ruc?: string
}

export interface CotizacionProveedor {
  id: string
  proveedorId: string
  proyectoId: string
  nombre: string
  fecha: string
  proveedor: Proveedor
  proyecto:  Proyecto
  items: CotizacionProveedorItem[]
}

export interface CotizacionProveedorItem {
  id: string
  cotizacionId: string
  listaEquipoItemId: string
  precioUnitario: number
  cantidad: number
  costoTotal: number
  tiempoEntrega?: string
  esSeleccionada?: boolean
  cotizacion: CotizacionProveedor
  listaEquipoItem: ListaEquipoItem
}

export interface PedidoEquipo {
  id: string
  proyectoId: string
  responsableId: string
  listaId: string
  codigo?: string
  estado: EstadoPedido
  fechaPedido: string
  observacion?: string
  fechaEntregaEstimada?: string
  fechaEntregaReal?: string
  items: PedidoEquipoItem[]
}

export interface PedidoEquipoItem {
  id: string
  pedidoId: string
  listaEquipoItemId: string
  cantidadPedida: number
  precioUnitario?: number
  costoTotal?: number
  fechaNecesaria: string
  estado: EstadoPedidoItem
  cantidadAtendida?: number
  comentarioLogistica?: string
}


// ============================
// 📊 Valorización de Proyectos
// ============================

export interface Valorizacion {
  id: string
  proyectoId: string
  nombre: string
  descripcion?: string
  periodoInicio: string
  periodoFin: string
  estado: string // 'pendiente' | 'aprobada' | 'observada' | 'enviada'
  montoTotal: number
  createdAt: string
  updatedAt: string

  proyecto: Proyecto
}

// ============================
// ⏱️ Registro de Horas Hombre
// ============================

export interface RegistroHoras {
  id: string
  proyectoId: string
  proyectoServicioId: string
  categoria: string
  nombreServicio: string
  recursoId: string
  recursoNombre: string
  usuarioId: string
  fechaTrabajo: string
  horasTrabajadas: number
  descripcion?: string
  observaciones?: string
  aprobado: boolean
  createdAt: string
  updatedAt: string

  proyecto: Proyecto
  proyectoServicio: ProyectoServicio
  recurso: Recurso
  usuario: User
}
