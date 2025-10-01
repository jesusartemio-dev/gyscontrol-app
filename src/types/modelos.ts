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

// 📋 Importaciones de tipos desde Prisma Client
import type { 
   // ❌ Eliminado: Producto as PrismaProducto - no forma parte del sistema GYS
 } from '@prisma/client';

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

// ✅ Tipos para el sistema de notificaciones del sidebar
export type NotificationBadgeType = 
  | 'ordenes-pendientes'
  

// ✅ Tipo para enlaces del sidebar con notificaciones
export interface SidebarLink {
  href: string
  label: string
  icon: any // Lucide icon component
  badge?: NotificationBadgeType
  submenu?: SidebarLink[] // ✅ Submenú opcional para enlaces anidados
}

// ✅ Tipo para secciones del sidebar
export interface SidebarSection {
  key: string
  title: string
  icon: any // Lucide icon component
  color: string
  roles: RolUsuario[]
  links: SidebarLink[]
}

export type EstadoEquipo =
  | 'pendiente'
  | 'revisado_tecnico'
  | 'aprobado_coordinador'
  | 'aprobado_gestor'
  | 'en_lista'
  | 'comprado'
  | 'reemplazado'
  | 'entregado'

  export type EstadoEquipoItem =
  | 'pendiente'
  | 'en_lista'
  | 'reemplazado'
  | 'descartado'

export type EstadoListaItem =
  | 'borrador'
  | 'por_revisar'
  | 'por_cotizar'
  | 'por_validar'
  | 'por_aprobar'
  | 'aprobado'
  | 'rechazado'

export type OrigenListaItem =
  | 'cotizado'
  | 'nuevo'
  | 'reemplazo'

export type EstadoListaEquipo =
  | 'borrador'
  | 'por_revisar'
  | 'por_cotizar'
  | 'por_validar'
  | 'por_aprobar'
  | 'aprobado'
  | 'rechazado'

export type EstadoFase =
  | 'planificado'
  | 'en_progreso'
  | 'completado'
  | 'pausado'
  | 'cancelado'

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

export enum EstadoEntregaItem {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  PARCIAL = 'parcial',
  ENTREGADO = 'entregado',
  RETRASADO = 'retrasado',
  CANCELADO = 'cancelado'
}

// ============================
// 📊 TIPOS DE TRAZABILIDAD
// ============================

/**
 * Evento de trazabilidad para timeline
 */
export interface TrazabilidadEvent {
  id: string;
  fecha: Date;
  tipo: 'creacion' | 'preparacion' | 'envio' | 'transito' | 'entrega' | 'incidencia' | 'devolucion' | 'cancelacion';
  estado: EstadoEntregaItem;
  titulo: string;
  descripcion?: string;
  responsable?: string;
  ubicacion?: string;
  observaciones?: string;
  metadata?: Record<string, any>;
  esHito?: boolean;
  entidadId: string;
  entidadTipo: 'PEDIDO' | 'PROYECTO' | 'ITEM';
}

/**
 * Datos para métricas de entrega
 */
export interface MetricasEntregaData {
  totalPedidos: number;
  pedidosEntregados: number;
  pedidosPendientes: number;
  pedidosRetrasados: number;
  tiempoPromedioEntrega: number;
  porcentajeEntregaATiempo: number;
  valorTotalEntregado: number;
  tendenciaEntregas: 'subida' | 'bajada' | 'estable';
  ultimaActualizacion: Date;
}

/**
 * Datos para gráfico de progreso
 */
export interface GraficoProgresoData {
  fecha: string;
  completados: number;
  pendientes: number;
  retrasados: number;
  cancelados: number;
  meta?: number;
  valorTotal?: number;
}

/**
 * Evento de trazabilidad (alias para compatibilidad)
 */
export type EventoTrazabilidad = TrazabilidadEvent;

export type EstadoCotizacionProveedor =
  | 'pendiente'
  | 'solicitado'
  | 'cotizado'
  | 'rechazado'
  | 'seleccionado'

// ✅ Nuevo tipo para estados de cotización
export type EstadoCotizacion =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'rechazada'

// ✅ Nuevo tipo para estados de oportunidad CRM
export type EstadoOportunidad =
  | 'prospecto'
  | 'contacto_inicial'
  | 'propuesta_enviada'
  | 'negociacion'
  | 'cerrada_ganada'
  | 'cerrada_perdida'

// ===================================================
// 🆕 MODELOS CRM PARA PROYECTOS INDUSTRIALES
// ===================================================

// 📋 Gestión de Oportunidades
export interface CrmOportunidad {
  id: string
  clienteId: string
  nombre: string
  descripcion?: string
  valorEstimado?: number
  probabilidad: number // 0-100
  fechaCierreEstimada?: string
  fuente?: string // "licitación", "referido", "prospección"
  estado: EstadoOportunidad // Estado del ciclo de vida de la oportunidad
  prioridad: string
  comercialId?: string
  responsableId?: string
  fechaUltimoContacto?: string
  notas?: string
  competencia?: string // Competidores identificados
  createdAt: string
  updatedAt: string

  // Relaciones
  cliente: Cliente
  comercial?: User
  responsable?: User
  cotizacionId?: string
  cotizacion?: Cotizacion
  actividades: CrmActividad[]
}

// 📞 Seguimiento de Actividades
export interface CrmActividad {
  id: string
  oportunidadId: string
  tipo: string // "llamada", "email", "reunión", "propuesta", "seguimiento"
  descripcion: string
  fecha: string
  resultado?: string // "positivo", "neutro", "negativo"
  notas?: string
  usuarioId: string
  usuario: User
  createdAt: string
  updatedAt: string

  oportunidad: CrmOportunidad
}
  
// ============================
// ️ Autenticación y Sesión
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
  ProyectoEquipos: ProyectoEquipoCotizado[]
  ProyectoEquipoItems: ProyectoEquipoCotizadoItem[]
  ProyectoServicios: ProyectoServicioCotizado[]
  ProyectoServicioItems: ProyectoServicioCotizadoItem[]
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
  codigo: string // ✅ Código automático formato CLI-XXXX-YY
  numeroSecuencia: number // ✅ Número secuencial para generación de código
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
  descripcion?: string
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
  descripcion?: string
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
  
  // 🔗 Relaciones
  listaEquipoItems?: ListaEquipoItem[]
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
  tipo: 'completa' | 'equipos' | 'servicios' | 'gastos' // ✅ Nuevo campo para tipo de plantilla
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
}


export interface PlantillaServicio {
  id: string
  plantillaId: string
  nombre: string
  categoria: string
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
    codigo: string // ✅ Código automático formato GYS-XXXX-YY
    numeroSecuencia: number // ✅ Número secuencial para generación de código
    nombre: string
    estado: EstadoCotizacion // ✅ Ahora usa enum
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

   // ✅ Nuevos campos para cabecera comercial
   referencia?: string | null
   formaPago?: string | null
   validezOferta?: number | null
   fechaValidezHasta?: string | null
   moneda?: string | null
   revision?: string | null
   incluyeIGV?: boolean | null

   cliente: {
     id: string
     nombre: string
     ruc?: string
     direccion?: string
     correo?: string
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

   // ✅ Nueva relación con cronograma comercial
   cronograma: CotizacionEdt[]

   // ✅ Nuevas relaciones para exclusiones y condiciones
   exclusiones: CotizacionExclusion[]
   condiciones: CotizacionCondicion[]

   // ✅ NUEVA RELACIÓN CON OPORTUNIDAD CRM
   oportunidadCrm?: CrmOportunidad
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
  nombre: string
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

// ✅ Nuevos modelos para exclusiones y condiciones de cotización
export interface CotizacionExclusion {
  id: string
  cotizacionId: string
  descripcion: string
  orden: number
  createdAt: string
  updatedAt: string
}

export interface CotizacionCondicion {
  id: string
  cotizacionId: string
  tipo?: string | null
  descripcion: string
  orden: number
  createdAt: string
  updatedAt: string
}

// ✅ Nuevo modelo CotizacionEdt para cronograma comercial
export interface CotizacionEdt {
  id: string
  cotizacionId: string
  categoriaServicioId: string
  zona?: string | null
  fechaInicioCom?: string | null
  fechaFinCom?: string | null
  horasCom?: number | null
  prioridad: PrioridadEdt
  responsableId?: string | null
  descripcion?: string | null
  createdAt: string
  updatedAt: string

  // Relaciones
  categoriaServicio: CategoriaServicio
  responsable?: User
  tareas: CotizacionTarea[]
}

// ✅ Nuevo modelo CotizacionTarea para tareas del cronograma comercial
export interface CotizacionTarea {
  id: string
  cotizacionEdtId: string
  nombre: string
  fechaInicioCom?: string | null
  fechaFinCom?: string | null
  horasCom?: number | null
  prioridad: PrioridadTarea
  dependenciaDeId?: string | null
  orden: number
  descripcion?: string | null
  createdAt: string
  updatedAt: string

  // Relaciones
  cotizacionEdt: CotizacionEdt
  dependenciaDe?: CotizacionTarea
  dependientes: CotizacionTarea[]
  responsable?: User
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

  equipos: ProyectoEquipoCotizado[]
  servicios: ProyectoServicioCotizado[]
  gastos: ProyectoCotizadoGasto[]
  ListaEquipo: ListaEquipo[]
  cotizaciones: CotizacionProveedor[]
  valorizaciones: Valorizacion[]
  registrosHoras: RegistroHoras[]

  // ✅ Nueva relación con cronogramas
  cronogramas: ProyectoCronograma[]
}

export interface ProyectoEquipoCotizado {
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
  items: ProyectoEquipoCotizadoItem[]
}

export interface ProyectoEquipoCotizadoItem {
  id: string
  proyectoEquipoId: string
  catalogoEquipoId?: string
  listaId?: string
  listaEquipoSeleccionadoId?: string // 🆕 ID del ListaEquipoItem vigente seleccionado

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

  estado: EstadoEquipoItem
  motivoCambio?: string

  createdAt: string
  updatedAt: string

  // Relaciones
  proyectoEquipo: ProyectoEquipoCotizado
  catalogoEquipo?: CatalogoEquipo
  listaEquipos: ListaEquipoItem[]
  listaEquipoSeleccionado?: ListaEquipoItem // 🆕 El item vigente actual
  lista?: {
    id: string
    nombre: string
    codigo?: string
  }
}



export interface ProyectoServicioCotizado {
  id: string
  proyectoId: string
  responsableId: string
  nombre: string
  categoria: string
  subtotalInterno: number
  subtotalCliente: number
  subtotalReal: number // 🔥 Agregado

  createdAt: string
  updatedAt: string

  proyecto: Proyecto
  responsable: User
  items: ProyectoServicioCotizadoItem[]
}

export interface ProyectoServicioCotizadoItem {
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

  proyectoServicio: ProyectoServicioCotizado
  responsable: User
  catalogoServicio?: CatalogoServicio
}

export interface ProyectoCotizadoGasto {
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
  items: ProyectoGastoCotizadoItem[]
}
export interface ProyectoGastoCotizadoItem {
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

  gasto: ProyectoCotizadoGasto
}

// ============================
// 🏗️ GESTION EQUIPOS
// ============================

export interface ListaEquipo {
  id: string
  proyectoId: string
  responsableId: string            // ✅ ID del usuario responsable de la lista
  codigo: string                   // ✅ antes era 'nombre', ahora es el código único (ej. CJM27-LST-001)
  nombre: string
  numeroSecuencia: number          // ✅ número crudo, usado para construir el código
  estado: EstadoListaEquipo
  createdAt: string
  updatedAt: string
  
  // ✅ Campos de fecha de seguimiento
  fechaNecesaria?: string
  fechaEnvioRevision?: string
  fechaValidacion?: string
  fechaAprobacionRevision?: string
  fechaEnvioLogistica?: string
  fechaInicioCotizacion?: string
  fechaFinCotizacion?: string
  fechaAprobacionFinal?: string
  
  // ✅ Coherencia financiera
  coherencia?: number              // Porcentaje de coherencia (0-100)
  
  // ✅ Prisma count aggregation (opcional, disponible cuando se incluye en queries)
  _count?: {
    items: number
  }
  
  items: ListaEquipoItem[]
  proyecto?: Proyecto | null       // ✅ incluye info del proyecto si se hace include en la API
}



export interface ListaEquipoItem {
  id: string
  listaId: string
  proyectoEquipoItemId?: string
  proyectoEquipoId?: string
  reemplazaProyectoEquipoItemId?: string // 🆕 Si este item reemplaza uno cotizado
  catalogoEquipoId?: string

  proveedorId?: string
  cotizacionSeleccionadaId?: string

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
  estado: EstadoListaItem
  origen: OrigenListaItem
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  createdAt: string
  updatedAt: string

  // 🔗 Relaciones
  lista: ListaEquipo
  proveedor?: Proveedor
  catalogoEquipo?: CatalogoEquipo
  cotizaciones: CotizacionProveedorItem[]
  pedidos: PedidoEquipoItem[]
  cotizacionSeleccionada?: CotizacionProveedorItem

  // 🧠 Relaciones de origen y reemplazo
  proyectoEquipoItem?: {
    id: string
    proyectoEquipo?: {
      nombre: string
    }
  }

  reemplazaProyectoEquipoItem?: {
    id: string
    proyectoEquipo?: {
      nombre: string
    }
  }

  proyectoEquipo?: {
    nombre: string
  }
}




export interface Proveedor {
  id: string
  nombre: string
  ruc?: string
  direccion?: string
  telefono?: string
  correo?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface CotizacionProveedor {
  id: string
  proveedorId: string
  proyectoId: string
  codigo: string                               // ✅ antes 'nombre', ahora es el código único (ej. CJM27-COT-001)
  numeroSecuencia: number                      // ✅ número puro para control interno
  estado: EstadoCotizacionProveedor  // ✅ nuevo
  createdAt: string
  updatedAt: string
  proveedor: Proveedor
  proyecto: Proyecto
  items: CotizacionProveedorItem[]
}


export interface CotizacionProveedorItem {
  id: string
  cotizacionId: string
  listaEquipoItemId?: string  // <- también opcional por si es null
  listaId?: string            // ✅ nuevo campo opcional
  lista?: ListaEquipo         // ✅ relación opcional
  // 📋 Copiados de ListaEquipoItem (para trazabilidad)
  codigo: string
  descripcion: string
  unidad: string
  cantidadOriginal: number
  presupuesto?: number
  // 💵 Datos cotizados (pueden ser llenados luego)
  precioUnitario?: number
  cantidad?: number
  costoTotal?: number
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  // ✅ Estado y selección
  estado: EstadoCotizacionProveedor
  esSeleccionada?: boolean
  createdAt: string
  updatedAt: string
  // 🔗 Relaciones
  cotizacion: CotizacionProveedor
  listaEquipoItem?: ListaEquipoItem
}

export interface PedidoEquipo {
  id: string
  proyectoId: string
  responsableId: string
  listaId?: string
  codigo: string                         // ✅ Código obligatorio
  numeroSecuencia: number               // ✅ número puro usado para construir el código (ej. 1 → PED-001)
  estado: EstadoPedido
  fechaPedido: string                   // ✅ mantenido por compatibilidad
  fechaNecesaria: string               // ✅ Proyectos indica esta fecha
  fechaEntregaEstimada?: string        // Logística propone esta fecha
  fechaEntregaReal?: string            // Fecha real de entrega
  observacion?: string

  // ✅ Coherencia financiera
  coherencia?: number                  // Porcentaje de coherencia (0-100)

  responsable?: User
  lista?: ListaEquipo
  items: PedidoEquipoItem[]
}


export interface PedidoEquipoItem {
  id: string
  pedidoId: string
  listaId?: string
  listaEquipoItemId?: string
  cantidadPedida: number
  cantidadAtendida?: number
  precioUnitario?: number
  costoTotal?: number
  estado: EstadoPedidoItem
  comentarioLogistica?: string
  // Copiados desde ListaEquipoItem
  codigo: string
  descripcion: string
  unidad: string

  tiempoEntrega?: string              // Ej: "stock", "7 días", etc.
  tiempoEntregaDias?: number         // Ej: 0, 7, 14


  createdAt?: string
  updatedAt?: string

  listaEquipoItem?: ListaEquipoItem
  pedido?: PedidoEquipo              // ✅ Relación al pedido padre para acceder al código
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
  proyectoServicio: ProyectoServicioCotizado
  recurso: Recurso
  usuario: {
    id: string;
    name: string | null;
    email: string | null;
  }
}

// ============================
// 🧾 Lista de Requerimientos
// ============================
export interface ListaRequerimiento {
  id: string
  proyectoId: string
  nombre: string
  descripcion?: string
  estado: Estado
  fechaAprobacion?: string
  createdAt: string
  updatedAt: string
  items: ListaRequerimientoItem[]
}

export interface ListaRequerimientoItem {
  id: string
  listaRequerimientoId: string
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  estado: Estado
  fechaRequerida?: string
  createdAt: string
  updatedAt: string
}

// Payloads para crear/actualizar
export interface ListaRequerimientoPayload {
  proyectoId: string
  nombre: string
  descripcion?: string
  estado?: Estado
}

export interface ListaRequerimientoItemPayload {
  listaRequerimientoId: string
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  estado?: Estado
  fechaRequerida?: string
}

// ============================
// 📦 Paquetes de Compra
// ============================
export interface PaqueteCompra {
  id: string
  proyectoId: string
  nombre: string
  descripcion?: string
  estado: Estado
  fechaAprobacion?: string
  montoTotal: number
  createdAt: string
  updatedAt: string
  items: PaqueteCompraItem[]
}

export interface PaqueteCompraItem {
  id: string
  paqueteCompraId: string
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
  montoTotal: number
  createdAt: string
  updatedAt: string
}

// Payloads para crear/actualizar
export interface PaqueteCompraPayload {
  proyectoId: string
  nombre: string
  descripcion?: string
  estado?: Estado
  montoTotal?: number
}

export interface PaqueteCompraItemPayload {
  paqueteCompraId: string
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
  montoTotal?: number
}

// ============================
// 📋 Sistema de Tareas y Subtareas
// ============================

// 🏷️ Enums para el sistema de tareas
export type EstadoTarea = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'pausada'
export type PrioridadTarea = 'baja' | 'media' | 'alta' | 'critica'
export type TipoDependencia = 'fin_a_inicio' | 'inicio_a_inicio' | 'fin_a_fin' | 'inicio_a_fin'
export type TipoRecurso = 'humano' | 'material' | 'equipo'

// 📋 Interfaz base de Tarea (sin relaciones)
export interface TareaBase {
  id: string
  proyectoServicioId: string
  nombre: string
  descripcion?: string
  estado: EstadoTarea
  prioridad: PrioridadTarea
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  porcentajeCompletado: number // 0-100
  horasPlan: number
  horasReales: number
  responsableId: string
  createdAt: string
  updatedAt: string
}

// 📋 Interfaz completa de Tarea con relaciones
export interface Tarea extends TareaBase {
  // 🔗 Relaciones
  proyectoServicio: ProyectoServicioCotizado
  responsable: User
  subtareas: Subtarea[]
  dependenciasOrigen: DependenciaTarea[] // Tareas que dependen de esta
  dependenciasDestino: DependenciaTarea[] // Tareas de las que depende esta
  asignaciones: AsignacionRecurso[]
  registrosProgreso: RegistroProgreso[]
}

// 📋 Tipo para respuestas de API con relaciones específicas
export interface TareaConRelaciones extends TareaBase {
  proyectoServicio: {
    id: string
    nombre: string
    proyecto: {
      id: string
      nombre: string
    }
  }
  responsable: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    subtareas: number
    dependenciasOrigen: number
    dependenciasDestino: number
    asignaciones: number
    registrosProgreso: number
  }
}

// 📝 Interfaz de Subtarea
export interface Subtarea {
  id: string
  tareaId: string
  nombre: string
  descripcion?: string
  estado: EstadoTarea
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  porcentajeCompletado: number // 0-100
  horasPlan: number
  horasReales: number
  asignadoId?: string
  createdAt: string
  updatedAt: string
  
  // 🔗 Relaciones
  tarea: Tarea
  asignado?: User
  registrosProgreso: RegistroProgreso[]
}

// 🔗 Interfaz de Dependencia entre Tareas
export interface DependenciaTarea {
  id: string
  tareaOrigenId: string
  tareaDestinoId: string
  tipo: TipoDependencia
  retrasoMinimo: number // días de retraso mínimo
  createdAt: string
  updatedAt: string
  
  // 🔗 Relaciones
  tareaOrigen: Tarea
  tareaDestino: Tarea
}

// 👥 Interfaz de Asignación de Recursos
export interface AsignacionRecurso {
  id: string
  tareaId: string
  usuarioId: string
  tipoRecurso: TipoRecurso
  porcentajeAsignacion: number // 0-100
  fechaAsignacion: string
  fechaDesasignacion?: string
  activo: boolean
  createdAt: string
  updatedAt: string
  
  // 🔗 Relaciones
  tarea: Tarea
  usuario: User
}

// 📊 Interfaz de Registro de Progreso
export interface RegistroProgreso {
  id: string
  tareaId?: string
  subtareaId?: string
  usuarioId: string
  fecha: string
  horasTrabajadas: number
  progresoAnterior: number
  progresoNuevo: number
  descripcion?: string
  observaciones?: string
  createdAt: string
  updatedAt: string
  
  // 🔗 Relaciones
  tarea?: Tarea
  subtarea?: Subtarea
  usuario: User
}

// ===== TIPOS BASE (ALIASES PARA MEJOR LEGIBILIDAD) =====

// ❌ Eliminado: Producto - no forma parte del sistema GYS

/**
 * 🛒 Orden de Compra - Documento que formaliza la solicitud de productos/servicios a un proveedor
 */
// ===== ENUMS RE-EXPORTADOS PARA CONSISTENCIA =====



/**
 * 🔄 Tipos de Movimiento - Clasificación de transacciones
 */


// ===== TIPOS COMPUESTOS CON RELACIONES =====

// ===== TIPOS PARA DASHBOARDS Y REPORTES =====

// ✅ Reportes

// ===================================================
// 📋 SISTEMA EDT (ESTRUCTURA DE DESGLOSE DE TRABAJO)
// ===================================================

// 🔧 Enums para el sistema EDT
export type EstadoEdt = 'planificado' | 'en_progreso' | 'detenido' | 'completado' | 'cancelado'
export type PrioridadEdt = 'baja' | 'media' | 'alta' | 'critica'
export type OrigenTrabajo = 'planificado' | 'adicional' | 'correctivo' | 'emergencia'
export type ProyectoEstado = 'creado' | 'en_planificacion' | 'en_ejecucion' | 'pausado' | 'completado' | 'cancelado' | 'listas_pendientes' | 'listas_aprobadas' | 'pedidos_creados'

// 📋 Interface principal para ProyectoEdt
export interface ProyectoEdt {
  id: string
  proyectoId: string
  nombre: string // Nombre descriptivo del EDT
  categoriaServicioId: string
  zona?: string
  fechaInicio?: string
  fechaFin?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  horasPlan: number
  horasReales: number
  estado: EstadoEdt
  responsableId?: string
  porcentajeAvance: number // 0-100
  descripcion?: string
  prioridad: PrioridadEdt
  createdAt: string
  updatedAt: string
  
  // 🔗 Relaciones
  proyecto: {
    id: string
    nombre: string
    codigo: string
    estado: ProyectoEstado
  }
  categoriaServicio: {
    id: string
    nombre: string
  }
  responsable?: {
    id: string
    name: string | null
    email: string
  }
  registrosHoras?: RegistroHoras[]
}

// 📊 Interface para métricas EDT
export interface MetricasEdt {
  totalEdts: number
  edtsPendientes: number
  edtsEnProgreso: number
  edtsCompletados: number
  edtsPausados: number
  edtsCancelados: number
  porcentajeAvancePromedio: number
  horasPlanTotal: number
  horasRealesTotal: number
  eficienciaPromedio: number // horasReales / horasPlan * 100
  ultimaActualizacion: Date
}

// 📈 Interface para datos de gráficos EDT
export interface GraficoEdtData {
  fecha: string
  pendientes: number
  enProgreso: number
  completados: number
  pausados: number
  cancelados: number
  horasPlan?: number
  horasReales?: number
  eficiencia?: number
}

// 🎯 Interface para resumen EDT por proyecto
export interface ResumenEdtProyecto {
  proyectoId: string
  proyectoNombre: string
  proyectoCodigo: string
  totalEdts: number
  edtsCompletados: number
  porcentajeAvance: number
  horasPlan: number
  horasReales: number
  eficiencia: number
  estadoProyecto: ProyectoEstado
  fechaInicio?: string
  fechaFin?: string
  responsables: {
    id: string
    name: string | null
    totalEdts: number
  }[]
}

// ===================================================
// 📋 SISTEMA DE CRONOGRAMA DE PROYECTOS - FASE 4
// ===================================================

// 🎯 Interface para control de tipos de cronograma
export interface ProyectoCronograma {
  id: string
  proyectoId: string
  tipo: 'comercial' | 'planificacion' | 'ejecucion'
  nombre: string
  copiadoDesdeCotizacionId?: string
  esBaseline: boolean
  version: number
  createdAt: string
  updatedAt: string

  // Relaciones
  proyecto: Proyecto
  fases: ProyectoFase[]
  edts: ProyectoEdt[]
  tareas: ProyectoTarea[]
}

// 📋 Interface para fases de proyecto
export interface ProyectoFase {
  id: string
  proyectoId: string
  proyectoCronogramaId: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: EstadoFase
  porcentajeAvance: number
  createdAt: string
  updatedAt: string

  // Relaciones
  proyecto: Proyecto
  proyectoCronograma: ProyectoCronograma
  edts: ProyectoEdt[]
}

// 📋 Interface para tareas de proyecto (4to nivel)
export interface ProyectoTarea {
  id: string
  proyectoEdtId: string
  proyectoCronogramaId: string
  nombre: string
  descripcion?: string
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  horasEstimadas?: number
  horasReales: number
  estado: EstadoTarea
  prioridad: PrioridadTarea
  porcentajeCompletado: number
  dependenciaId?: string
  responsableId?: string
  createdAt: string
  updatedAt: string

  // Relaciones
  proyectoEdt: ProyectoEdt
  proyectoCronograma: ProyectoCronograma
  dependencia?: ProyectoTarea
  tareasDependientes: ProyectoTarea[]
  responsable?: User
  registrosHoras: RegistroHoras[]
  subtareas: ProyectoSubtarea[]
}

// 📋 Interface para subtareas de ProyectoTarea
export interface ProyectoSubtarea {
  id: string
  proyectoTareaId: string
  nombre: string
  descripcion?: string
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: EstadoTarea
  porcentajeCompletado: number
  horasEstimadas?: number
  horasReales?: number
  asignadoId?: string
  createdAt: string
  updatedAt: string

  // Relaciones
  proyectoTarea: ProyectoTarea
  asignado?: User
}

// 🔗 Interface para dependencias entre ProyectoTarea
export interface ProyectoDependenciaTarea {
  id: string
  tipo: TipoDependencia
  tareaOrigenId: string
  tareaDependienteId: string
  createdAt: string

  // Relaciones
  tareaOrigen: ProyectoTarea
  tareaDependiente: ProyectoTarea
}

// ===================================================
// 📊 INTERFACES PARA SERVICIOS DE CRONOGRAMA - FASE 4
// ===================================================

// 📊 Interface para KPIs principales del cronograma
export interface KpisCronograma {
  totalEdts: number
  edtsPlanificados: number
  edtsEnProgreso: number
  edtsCompletados: number
  edtsRetrasados: number
  horasPlanTotal: number
  horasRealesTotal: number
  promedioAvance: number
  eficienciaGeneral: number // porcentaje de eficiencia
  cumplimientoFechas: number // porcentaje de cumplimiento
  desviacionPresupuestaria: number // porcentaje de desviación
  fechaCalculo: Date
}

// 📈 Interface para tendencias mensuales
export interface TendenciaMensual {
  mes: Date
  totalEdts: number
  edtsCompletados: number
  tasaCompletitud: number // porcentaje
  horasPlan: number
  horasReales: number
  eficiencia: number // porcentaje
  promedioAvance: number
}

// 🎯 Interface para análisis de rendimiento por categoría
export interface AnalisisRendimiento {
  categoriaServicioId: string
  categoriaServicioNombre: string
  totalEdts: number
  horasPlan: number
  horasReales: number
  promedioAvance: number
  eficiencia: number
  desviacion: number // porcentaje de desviación
  nivelRendimiento: 'excelente' | 'bueno' | 'regular' | 'deficiente'
}

// 🚨 Interface para alertas del cronograma
export interface AlertaCronograma {
  tipo: 'retraso' | 'vencimiento_proximo' | 'desviacion_horas' | 'sin_progreso'
  severidad: 'alta' | 'media' | 'baja'
  titulo: string
  descripcion: string
  proyectoId: string
  edtId: string
  responsableId?: string
  fechaDeteccion: Date
  datos: Record<string, any> // Datos específicos de la alerta
}

// 📊 Interface para métricas comparativas entre proyectos
export interface MetricasComparativas {
  proyectoId: string
  proyectoNombre: string
  proyectoCodigo: string
  totalEdts: number
  porcentajeCompletitud: number
  eficienciaGeneral: number
  cumplimientoFechas: number
  desviacionPresupuestaria: number
  horasPlanTotal: number
  horasRealesTotal: number
}

// 📋 Interface para resumen de cronograma
export interface ResumenCronograma {
  proyectoId: string
  proyectoNombre: string
  totalEdts: number
  edtsPlanificados: number
  edtsEnProgreso: number
  edtsCompletados: number
  horasPlanTotal: number
  horasRealesTotal: number
  porcentajeAvanceGeneral: number
}

// 📊 Interface para comparativo plan vs real
export interface ComparativoPlanReal {
  categoriaServicioId: string
  categoriaServicioNombre: string
  zona?: string | null
  horasPlan: number
  horasReales: number
  porcentajeAvance: number
  estado: EstadoEdt
  diasRetraso?: number
}

// 🔍 Interface para filtros de cronograma
export interface FiltrosCronogramaData {
  proyectoId?: string
  categoriaServicioId?: string
  responsableId?: string
  estado?: EstadoEdt
  prioridad?: PrioridadEdt
  zona?: string
  fechaDesde?: Date
  fechaHasta?: Date
  soloConRetrasos?: boolean
  soloSinProgreso?: boolean
}

// 🏗️ Interface para datos de creación EDT
export interface CreateProyectoEdtData {
  proyectoId: string
  proyectoCronogramaId: string
  nombre: string
  categoriaServicioId: string
  responsableId?: string
  zona?: string | null
  fechaInicioPlan?: Date | null
  fechaFinPlan?: Date | null
  horasPlan?: number | null
  prioridad: PrioridadEdt
  descripcion?: string | null
}

// 🔄 Interface para datos de actualización EDT
export interface UpdateProyectoEdtData {
  id?: string
  nombre?: string
  responsableId?: string
  zona?: string | null
  fechaInicioPlan?: Date | null
  fechaFinPlan?: Date | null
  fechaInicioReal?: Date | null
  fechaFinReal?: Date | null
  horasPlan?: number | null
  porcentajeAvance?: number
  estado?: EstadoEdt
  prioridad?: PrioridadEdt
  descripcion?: string | null
}

// 🔗 Interface para EDT con relaciones completas
export interface ProyectoEdtConRelaciones {
  // Propiedades base de ProyectoEdt
  id: string
  proyectoId: string
  nombre: string // Nombre descriptivo del EDT
  categoriaServicioId: string
  zona?: string
  fechaInicio?: string
  fechaFin?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  horasPlan: number
  horasReales: number
  estado: EstadoEdt
  responsableId?: string
  porcentajeAvance: number
  descripcion?: string
  prioridad: PrioridadEdt
  createdAt: string
  updatedAt: string
  
  // Relaciones expandidas
  proyecto: {
    id: string
    nombre: string
    codigo: string
    estado: ProyectoEstado
  }
  categoriaServicio: {
    id: string
    nombre: string
  }
  responsable?: {
    id: string
    name: string | null
    email: string
  }
  registrosHoras: {
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
    proyectoEdtId: string
    categoriaServicioId: string
    origen: string
    ubicacion: string
    createdAt: string
    updatedAt: string
    usuario: {
      id: string
      name: string | null
      email: string
    }
  }[]
}

// ✅ Interfaz para Contactos de Cliente CRM
export interface CrmContactoCliente {
  id?: string
  nombre: string
  cargo?: string
  email?: string
  telefono?: string
  celular?: string
  esDecisionMaker: boolean
  areasInfluencia?: string
  relacionComercial?: string
  fechaUltimoContacto?: string
  notas?: string
  createdAt?: string
  updatedAt?: string
}

// ===================================================
// 📋 SISTEMA DE PERMISOS GRANULARES
// ===================================================

// ✅ Tipos de acciones de permisos
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'view' | 'export' | 'import'

// ✅ Recursos del sistema
export type PermissionResource =
  | 'users'
  | 'roles'
  | 'permissions'
  | 'projects'
  | 'cotizaciones'
  | 'clientes'
  | 'proveedores'
  | 'equipos'
  | 'servicios'
  | 'gastos'
  | 'listas'
  | 'pedidos'
  | 'valorizaciones'
  | 'reportes'
  | 'configuracion'
  | 'auditoria'

// ✅ Interfaz de Permiso
export interface Permission {
  id: string
  name: string              // Ej: 'users.create', 'projects.read'
  description: string
  resource: PermissionResource
  action: PermissionAction
  isSystemPermission: boolean  // Los permisos base del sistema
  createdAt: string
  updatedAt: string
}

// ✅ Interfaz de Rol Personalizado (además de los system roles)
export interface CustomRole {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ✅ Interfaz extendida de Usuario con permisos
export interface UserWithPermissions extends User {
  customPermissions: UserPermission[]
  effectivePermissions: Permission[]  // Permisos calculados (rol + overrides)
}

// ✅ Tipos de permisos de usuario (overrides)
export type UserPermissionType = 'grant' | 'deny'

export interface UserPermission {
  id: string
  userId: string
  permissionId: string
  type: UserPermissionType  // grant o deny
  createdBy: string
  createdAt: string
  updatedAt: string

  // Relaciones
  permission: Permission
}

// ✅ Interfaz para matriz de permisos
export interface PermissionMatrix {
  resource: PermissionResource
  actions: {
    [K in PermissionAction]?: {
      permission: Permission
      hasPermission: boolean
      source: 'role' | 'user_grant' | 'user_deny'
    }
  }
}

// ✅ Interfaz para configuración de permisos por rol
export interface RolePermissionConfig {
  role: RolUsuario
  permissions: {
    [resource in PermissionResource]?: PermissionAction[]
  }
}

// ===================================================
//  SISTEMA DE AUDITORÍA E HISTORIAL
// ===================================================

// ✅ Interfaz para registros de auditoría
export interface AuditLog {
  id: string
  entidadTipo: string // 'LISTA_EQUIPO', 'PEDIDO_EQUIPO', 'PROYECTO', 'COTIZACION', 'OPORTUNIDAD'
  entidadId: string // ID de la entidad afectada
  accion: string // 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'CAMBIAR_ESTADO', etc.
  usuarioId: string // Usuario que realizó la acción
  descripcion: string // Descripción legible de la acción
  cambios: string | null // JSON con { campo: { anterior: valor, nuevo: valor } }
  metadata: string | null // JSON con información adicional del contexto
  createdAt: Date

  // Relación con usuario
  usuario: {
    id: string
    name: string | null
    email: string
  }
}
