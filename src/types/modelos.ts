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
  | 'seguridad'
  | 'administracion'
  | 'admin'

// ✅ Tipos para el sistema de notificaciones del sidebar
export type NotificationBadgeType =
  | 'cotizaciones-pendientes'
  | 'proyectos-activos'
  | 'pedidos-pendientes'
  

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
  | 'enviada'
  | 'por_revisar'
  | 'por_cotizar'
  | 'por_validar'
  | 'por_aprobar'
  | 'aprobada'
  | 'rechazada'
  | 'completada'

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
  | 'cancelado'

// ✅ Estados logísticos optimizados para gestión de entregas
export type EstadoPedidoLogistico =
  | 'solicitado'                  // 📋 Pedido solicitado por área de proyectos
  | 'oc_emitida'                  // 📄 Orden de compra emitida por logística
  | 'en_fabricacion'              // 🏭 En proceso de fabricación
  | 'en_transito'                 // 🚚 En tránsito (puede demorar 2-4 semanas)
  | 'recibido_almacen'            // 📦 Recibido en almacén
  | 'entrega_parcial'             // ⚠️ Entrega parcial (algunos items)
  | 'listo_entrega'               // ✅ Listo para entrega final
  | 'entregado'                   // 🎉 Entregado al proyecto
  | 'cancelado'                   // ❌ Cancelado

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

// ✅ Estados de oportunidad CRM
// Flujo: Inicio → Contacto → Propuesta (V.Técnica / V.Comercial) → Negociación → [Seg.Proyecto / Feedback]
export type EstadoOportunidad =
  | 'inicio'
  | 'contacto_cliente'
  | 'validacion_tecnica'    // Propuesta: alcance y recursos
  | 'validacion_comercial'  // Propuesta: costeo, margen, condiciones
  | 'negociacion'           // Post-envío de cotización
  | 'seguimiento_proyecto'  // Ganada: seguimiento de ejecución
  | 'feedback_mejora'       // Perdida: motivo, competidor, aprendizajes
  | 'cerrada_ganada'        // Legacy
  | 'cerrada_perdida'       // Legacy

// ✅ Simplificación: Eliminamos TipoFormula ya que solo usamos Escalonada
// export type TipoFormula = 'Fijo' | 'Proporcional' | 'Escalonada'

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

  // Campos para Feedback de Mejora (cuando se pierde)
  fechaCierre?: string        // Fecha real de cierre (ganada o perdida)
  motivoPerdida?: string      // Razón por la que se perdió
  competidorGanador?: string  // Competidor que ganó el concurso
  aprendizajes?: string       // Lecciones aprendidas

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
  ProyectoEquiposItems: ProyectoEquipoCotizadoItem[]
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

export interface CategoriaGasto {
  id: string
  nombre: string
  descripcion?: string
  createdAt: string
  updatedAt: string
}

export interface CatalogoGasto {
  id: string
  codigo: string
  descripcion: string
  categoriaId: string
  categoria?: CategoriaGasto
  cantidad: number
  precioInterno: number
  margen: number
  precioVenta: number
  estado: string
  createdAt: string
  updatedAt: string
}

export interface NivelServicio {
  id: string
  nombre: string
  createdAt: string
  updatedAt: string
}

export interface Edt {
  id: string
  nombre: string
  descripcion?: string
  createdAt: string
  updatedAt: string
  servicios?: CatalogoServicio[] // 🔁 Relación real completa

  // 🆕 RELACIÓN: Fase por defecto para esta categoría
  faseDefaultId?: string
  faseDefault?: FaseDefault
}


export interface Recurso {
  id: string
  nombre: string
  tipo: 'individual' | 'cuadrilla'
  origen: 'propio' | 'externo'
  costoHora: number
  costoHoraProyecto?: number | null
  descripcion?: string
  orden: number
  activo: boolean
  createdAt: string
  updatedAt: string
  servicios?: CatalogoServicio[]
  plantillaServicioItems?: PlantillaServicioItem[]
  composiciones?: RecursoComposicion[]
  _count?: {
    catalogoServicio: number
    cotizacionServicioItem: number
    registroHoras: number
    plantillaServicioItem: number
    plantillaServicioItemIndependiente: number
  }
}

// ======================
// 🏢 Departamento
// ======================
export interface Departamento {
  id: string
  nombre: string
  descripcion?: string
  responsableId?: string
  activo: boolean
  createdAt: string
  updatedAt: string
  responsable?: {
    id: string
    name: string | null
    email: string
  }
  _count?: {
    empleados: number
  }
}

// ======================
// 💼 Cargo (Puesto de trabajo)
// ======================
export interface Cargo {
  id: string
  nombre: string
  descripcion?: string
  sueldoBase?: number  // Solo referencia, no se usa en cálculos
  activo: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    empleados: number
  }
}

// ======================
// 👤 Empleado (RRHH)
// ======================
export interface Empleado {
  id: string
  userId: string
  cargoId?: string
  departamentoId?: string    // Departamento directo del empleado
  sueldoPlanilla?: number    // Sueldo en planilla (remuneración base)
  sueldoHonorarios?: number  // Sueldo adicional en honorarios
  asignacionFamiliar: number // Asignación familiar (10% RMV si aplica)
  emo: number                // EMO mensual (Examen Médico Ocupacional)
  fechaIngreso?: string
  fechaCese?: string
  activo: boolean
  documentoIdentidad?: string
  telefono?: string
  direccion?: string
  contactoEmergencia?: string
  telefonoEmergencia?: string
  observaciones?: string
  createdAt: string
  updatedAt: string
  cargo?: Cargo
  departamento?: Departamento
  user?: User
  recursoComposiciones?: RecursoComposicion[]
}

// ======================
// 🔗 Composición de Recurso
// ======================
export interface RecursoComposicion {
  id: string
  recursoId: string
  empleadoId: string
  cantidad: number
  horasAsignadas?: number
  rol?: string
  activo: boolean
  createdAt: string
  updatedAt: string
  recurso?: Recurso
  empleado?: Empleado
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
  categoriaEquipo: {
    id: string
    nombre: string
  }
  unidad: {
    id: string
    nombre: string
  }
  marca: string
  precioLista: number
  precioInterno: number
  factorCosto: number
  factorVenta: number
  precioVenta: number
  precioLogistica?: number
  estado: string
  createdAt: string
  updatedAt: string
  createdById?: string
  updatedById?: string
  createdByUser?: { id: string; name: string | null }
  updatedByUser?: { id: string; name: string | null }

  // 🔗 Relaciones
  listaEquipoItems?: ListaEquipoItem[]

  // 📊 Contadores de uso
  _count?: {
    cotizacionEquipoItem: number
    proyectoEquipoCotizadoItem: number
    listaEquipoItem: number
  }
}

// ========================
// ⚙️ Catálogo de Servicios
// ========================
export interface CatalogoServicio {
  id: string
  nombre: string
  descripcion: string
  formula: TipoFormula // 'Fijo' | 'Proporcional' | 'Escalonada'
  cantidad: number
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  orden?: number
  nivelDificultad?: number
  categoriaId: string
  unidadServicioId: string
  recursoId: string
  createdAt: string
  updatedAt: string
  // Relaciones anidadas (incluidas desde API)
  edt?: {
    id: string
    nombre: string
  }
  // Alias para compatibilidad (la API devuelve 'edt', no 'categoria')
  categoria?: {
    id: string
    nombre: string
  }
  unidadServicio?: {
    id: string
    nombre: string
  }
  recurso?: {
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
  precioLista: number
  precioInterno: number
  factorCosto: number
  factorVenta: number
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
   fecha: string
   updatedAt: string

   // ✅ Nuevos campos para cabecera comercial
   referencia?: string | null
   formaPago?: string | null
   validezOferta?: number | null
   fechaValidezHasta?: string | null
   moneda?: string | null
   tipoCambio?: number | null
   revision?: string | null
   incluyeIGV?: boolean | null
   fechaInicio?: string | null
   fechaFin?: string | null

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

   // ✅ Descuento con aprobación
   descuentoPorcentaje?: number | null
   descuentoMotivo?: string | null
   descuentoEstado?: string | null
   descuentoSolicitadoPorId?: string | null
   descuentoAprobadoPorId?: string | null
   descuentoFechaRespuesta?: string | null
   descuentoComentario?: string | null
   descuentoSolicitadoPor?: { id: string; name: string } | null
   descuentoAprobadoPor?: { id: string; name: string } | null

   // ✅ CALENDARIO LABORAL ASOCIADO
   calendarioLaboralId?: string
   calendarioLaboral?: CalendarioLaboral
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
  precioLista: number
  precioInterno: number
  factorCosto: number
  factorVenta: number
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
    updatedAt: string
  }
}


export interface CotizacionServicio {
  id: string
  nombre: string
  edtId: string
  edt?: Edt
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
  edtId: string
  edt?: Edt
  // 📋 Datos copiados desde catálogo / plantilla
  nombre: string
  descripcion: string
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
  nivelDificultad?: number
  modoCalculo?: string
  orden?: number
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
    updatedAt?: string
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
  catalogoGastoId?: string
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
  catalogoGasto?: {
    updatedAt: string
  }
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
  edtId: string // Refactored: categoriaServicioId → edtId
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
  edt: Edt // Refactored: categoriaServicio → edt
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
  supervisorId?: string
  liderId?: string
  cotizacionId?: string

  nombre: string
  descripcion?: string | null
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
  moneda?: string | null
  tipoCambio?: number | null
  codigo: string
  estado: string
  fechaInicio: string
  fechaFin?: string
  createdAt: string
  updatedAt: string

  cliente: Cliente
  comercial: User
  gestor: User
  supervisor?: User
  lider?: User
  cotizacion?: Cotizacion
  personalProyecto?: PersonalProyecto[]

  equipos: ProyectoEquipoCotizado[]
  servicios: ProyectoServicioCotizado[]
  gastos: ProyectoGastoCotizado[]
  listaEquipos: ListaEquipo[]
  pedidos: PedidoEquipo[]
  cotizaciones: CotizacionProveedor[]
  valorizaciones: Valorizacion[]
  registrosHoras: RegistroHoras[]

  // ✅ Nueva relación con cronogramas
  cronogramas: ProyectoCronograma[]
}

// ✅ Roles dinámicos del personal del proyecto
export type RolPersonalProyecto = 'programador' | 'cadista' | 'ingeniero' | 'lider' | 'tecnico' | 'coordinador' | 'asistente'

export interface PersonalProyecto {
  id: string
  proyectoId: string
  userId: string
  rol: RolPersonalProyecto
  fechaAsignacion: string
  fechaFin?: string
  activo: boolean
  notas?: string
  createdAt: string
  updatedAt: string

  proyecto?: Proyecto
  user?: User
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

  // ✅ Relación opcional con EDT (incluida en consultas específicas)
  proyectoEdt?: {
    id: string
    nombre: string
    edtId: string // Refactored: categoriaServicioId → edtId
    edt: { // Refactored: categoriaServicio → edt
      id: string
      nombre: string
    }
  }
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

export interface ProyectoGastoCotizado {
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

  gasto: ProyectoGastoCotizado
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
    listaEquipoItem: number
  }
  
  listaEquipoItem: ListaEquipoItem[]
  proyecto?: Proyecto | null       // ✅ incluye info del proyecto si se hace include en la API
  user?: { id: string; name: string | null; email: string } | null
}



export interface ListaEquipoItem {
  id: string
  listaId: string
  proyectoEquipoItemId?: string
  proyectoEquipoId?: string
  reemplazaProyectoEquipoCotizadoItemId?: string // 🆕 Si este item reemplaza uno cotizado
  catalogoEquipoId?: string

  proveedorId?: string
  cotizacionSeleccionadaId?: string

  codigo: string
  descripcion: string
  categoria: string // ✅ Campo agregado para consistencia con otras entidades
  unidad: string
  marca: string // ✅ Campo agregado para exportación Excel
  cantidad: number
  verificado: boolean
  verificadoPorId?: string
  verificadoAt?: string
  verificadoPor?: { id: string; name?: string; email: string }
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
    cantidad: number
    precioCliente: number
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
  contactoNombre?: string | null
  contactoTelefono?: string | null
  contactoCorreo?: string | null
  banco?: string | null
  numeroCuenta?: string | null
  cci?: string | null
  tipoCuenta?: string | null
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
  listaEquipo?: ListaEquipo   // ✅ relación opcional
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
  cotizacionProveedor: CotizacionProveedor
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

  // ✅ Financiero y prioridad
  esUrgente?: boolean
  prioridad?: string
  costoRealTotal?: number
  presupuestoTotal?: number
  coherencia?: number                  // Porcentaje de coherencia (0-100)

  // 🚛 Campos logísticos para gestión de entregas
  estadoLogistico?: EstadoPedidoLogistico // Estado actual del proceso logístico
  responsableLogisticoId?: string      // Responsable de logística asignado
  fechaEnvioProveedor?: string         // Fecha de envío al proveedor
  fechaRecepcionProveedor?: string     // Fecha de recepción del proveedor
  fechaEnvioAlmacen?: string          // Fecha de envío a almacén
  fechaRecepcionAlmacen?: string      // Fecha de recepción en almacén
  fechaProgramadaEntrega?: string     // Fecha programada para entrega al proyecto
  fechaEntregaProyecto?: string       // Fecha real de entrega al proyecto
  fechaConfirmacionProyecto?: string  // Fecha de confirmación por proyecto
  ubicacionActual?: string            // Ubicación actual del pedido
  transportista?: string              // Empresa de transporte
  numeroGuia?: string                 // Número de guía de transporte
  costoLogistico?: number             // Costos asociados a logística
  observacionesLogisticas?: string    // Observaciones específicas de logística

  responsable?: User
  user?: { id: string; name: string | null; email: string } | null
  proyecto?: Pick<Proyecto, 'id' | 'codigo' | 'nombre'>
  lista?: ListaEquipo
  responsableLogistico?: User         // Relación con responsable de logística
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
  comentarioLogisticaPorId?: string
  comentarioLogisticaAt?: string
  comentarioLogisticaPor?: { id: string; name?: string; email: string }
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

export type EstadoValorizacion = 'borrador' | 'enviada' | 'aprobada_cliente' | 'facturada' | 'pagada' | 'anulada'

export interface Valorizacion {
  id: string
  proyectoId: string
  numero: number
  codigo: string
  periodoInicio: string
  periodoFin: string
  moneda: string
  tipoCambio?: number | null
  // Montos de avance
  presupuestoContractual: number
  acumuladoAnterior: number
  montoValorizacion: number
  acumuladoActual: number
  saldoPorValorizar: number
  porcentajeAvance: number
  // Montos financieros
  descuentoComercialPorcentaje: number
  descuentoComercialMonto: number
  adelantoPorcentaje: number
  adelantoMonto: number
  subtotal: number
  igvPorcentaje: number
  igvMonto: number
  fondoGarantiaPorcentaje: number
  fondoGarantiaMonto: number
  netoARecibir: number
  // Estado y fechas
  estado: EstadoValorizacion
  fechaEnvio?: string | null
  fechaAprobacion?: string | null
  observaciones?: string | null
  createdAt: string
  updatedAt: string

  proyecto?: Proyecto
  adjuntos?: ValorizacionAdjunto[]
  cuentasPorCobrar?: CuentaPorCobrar[]
}

export interface ValorizacionAdjunto {
  id: string
  valorizacionId: string
  nombreArchivo: string
  urlArchivo: string
  driveFileId?: string | null
  tipoArchivo?: string | null
  tamano?: number | null
  createdAt: string
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
export type EstadoEdt = 'planificado' | 'en_progreso' | 'detenido' | 'completado' | 'cancelado' | 'pausado'
export type PrioridadEdt = 'baja' | 'media' | 'alta' | 'critica'
export type OrigenTrabajo = 'planificado' | 'adicional' | 'correctivo' | 'emergencia'
// Flujo: creado → en_planificacion → listas → pedidos → en_ejecucion → en_cierre → cerrado
export type ProyectoEstado = 'creado' | 'en_planificacion' | 'listas_pendientes' | 'listas_aprobadas' | 'pedidos_creados' | 'en_ejecucion' | 'en_cierre' | 'cerrado' | 'pausado' | 'cancelado'

// 📋 Interface principal para ProyectoEdt
export interface ProyectoEdt {
  id: string
  proyectoId: string
  nombre: string // Nombre descriptivo del EDT
  edtId: string // Refactored: categoriaServicioId → edtId
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
  orden: number // ✅ Campo para ordenamiento drag & drop
  createdAt: string
  updatedAt: string

  // 🔗 Relaciones
  proyecto: {
    id: string
    nombre: string
    codigo: string
    estado: ProyectoEstado
  }
  edt: { // Refactored: categoriaServicio → edt
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

// ✅ Nuevo enum para estados de actividad
export type EstadoActividad =
  | 'pendiente'
  | 'en_progreso'
  | 'completada'
  | 'pausada'
  | 'cancelada'

// ✅ Nuevo modelo ProyectoActividad para jerarquía de 5 niveles
export interface ProyectoActividad {
  id: string
  proyectoEdtId: string // ✅ Ahora obligatorio (sin zona intermedia)
  proyectoCronogramaId: string
  nombre: string
  responsableId?: string
  fechaInicioPlan: string
  fechaFinPlan: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: EstadoActividad
  porcentajeAvance: number
  horasPlan?: number
  horasReales: number
  descripcion?: string
  prioridad: PrioridadEdt
  orden: number // ✅ Campo para ordenamiento drag & drop
  createdAt: string
  updatedAt: string

  // Relaciones
  responsable?: User
  proyectoEdt: ProyectoEdt // ✅ Ahora obligatorio
  proyectoCronograma: ProyectoCronograma
  tareas: ProyectoTarea[]
}

// 🎯 Interface para control de tipos de cronograma
export interface ProyectoCronograma {
  id: string
  proyectoId: string
  tipo: 'comercial' | 'planificacion' | 'ejecucion'
  nombre: string
  copiadoDesdeCotizacionId?: string
  esBaseline: boolean
  bloqueado: boolean
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

// 🎯 Interface para análisis de rendimiento por EDT
export interface AnalisisRendimiento {
  edtId: string // Refactored: categoriaServicioId → edtId
  edtNombre: string // Refactored: categoriaServicioNombre → edtNombre
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
  edtId: string // Refactored: categoriaServicioId → edtId
  edtNombre: string // Refactored: categoriaServicioNombre → edtNombre
  horasPlan: number
  horasReales: number
  porcentajeAvance: number
  estado: EstadoEdt
  diasRetraso?: number
}

// 🔍 Interface para filtros de cronograma
export interface FiltrosCronogramaData {
  proyectoId?: string
  edtId?: string // Refactored: categoriaServicioId → edtId
  responsableId?: string
  estado?: EstadoEdt
  prioridad?: PrioridadEdt
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
  edtId: string // Refactored: categoriaServicioId → edtId
  responsableId?: string
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
  edtId: string // Refactored: categoriaServicioId → edtId
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
  orden: number // ✅ Campo para ordenamiento drag & drop
  createdAt: string
  updatedAt: string
  
  // Relaciones expandidas
  proyecto: {
    id: string
    nombre: string
    codigo: string
    estado: ProyectoEstado
  }
  edt: { // Refactored: categoriaServicio → edt
    id: string
    nombre: string
  }
  responsable?: {
    id: string
    name: string | null
    email: string
  }
  registroHoras: {
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
    edtId: string // Refactored: categoriaServicioId → edtId
    origen: string
    ubicacion: string
    createdAt: string
    updatedAt: string
    user: {
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

// ✅ Interfaz para fases por defecto del sistema
export interface FaseDefault {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  duracionDias: number
  color?: string
  activo: boolean
  createdAt: string
  updatedAt: string
  Edt: Edt[]
}

// ===================================================
// 🗓️ SISTEMA DE CALENDARIOS LABORALES
// ===================================================

export interface CalendarioLaboral {
  id: string
  nombre: string
  descripcion?: string
  pais?: string
  empresa?: string
  activo: boolean
  horasPorDia: number
  diasLaborables: string[]
  horaInicioManana: string
  horaFinManana: string
  horaInicioTarde: string
  horaFinTarde: string
  createdAt: string
  updatedAt: string
}

// ======================
// Centro de Costo
// ======================

export type CentroCostoTipo = 'departamento' | 'administrativo'

export type CategoriaCosto = 'equipos' | 'servicios' | 'gastos'

export interface CentroCosto {
  id: string
  nombre: string
  tipo: CentroCostoTipo
  descripcion?: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

// ======================
// Hoja de Gastos
// ======================

export type HojaDeGastosEstado =
  | 'borrador'
  | 'enviado'
  | 'aprobado'
  | 'depositado'
  | 'rendido'
  | 'validado'
  | 'cerrado'
  | 'rechazado'

export type RechazoEtapa = 'aprobacion' | 'validacion' | 'cierre'

export interface HojaDeGastos {
  id: string
  numero: string
  proyectoId?: string | null
  centroCostoId?: string | null
  categoriaCosto: CategoriaCosto
  empleadoId: string
  aprobadorId?: string | null
  motivo: string
  observaciones?: string | null
  requiereAnticipo: boolean
  estado: HojaDeGastosEstado
  rechazadoEn?: RechazoEtapa | null
  comentarioRechazo?: string | null
  montoAnticipo: number
  montoDepositado: number
  montoGastado: number
  saldo: number
  fechaEnvio?: string | null
  fechaAprobacion?: string | null
  fechaDeposito?: string | null
  fechaRendicion?: string | null
  fechaValidacion?: string | null
  fechaCierre?: string | null
  createdAt: string
  updatedAt: string
  // Relations
  proyecto?: Pick<Proyecto, 'id' | 'codigo' | 'nombre'> | null
  centroCosto?: CentroCosto | null
  empleado?: { id: string; name: string | null; email: string }
  aprobador?: { id: string; name: string | null; email: string } | null
  lineas?: GastoLinea[]
  adjuntos?: HojaDeGastosAdjunto[]
}

export interface HojaDeGastosAdjunto {
  id: string
  hojaDeGastosId: string
  nombreArchivo: string
  urlArchivo: string
  driveFileId?: string | null
  tipoArchivo?: string | null
  tamano?: number | null
  tipo: string
  createdAt: string
}

export interface GastoLinea {
  id: string
  hojaDeGastosId: string
  categoriaGastoId?: string | null
  descripcion: string
  fecha: string
  monto: number
  moneda: string
  tipoComprobante?: string | null
  numeroComprobante?: string | null
  proveedorNombre?: string | null
  proveedorRuc?: string | null
  observaciones?: string | null
  sunatVerificado?: boolean | null
  conformidad?: string | null
  comentarioConformidad?: string | null
  conformadoEn?: string | null
  createdAt: string
  updatedAt: string
  // Relations
  categoriaGasto?: CategoriaGasto | null
  adjuntos?: GastoAdjunto[]
}

export interface GastoAdjunto {
  id: string
  gastoLineaId: string
  nombreArchivo: string
  urlArchivo: string
  driveFileId?: string | null
  tipoArchivo?: string | null
  tamano?: number | null
  createdAt: string
}

// ======================
// Orden de Compra
// ======================

export type EstadoOrdenCompra =
  | 'borrador'
  | 'aprobada'
  | 'enviada'
  | 'confirmada'
  | 'parcial'
  | 'completada'
  | 'cancelada'

export interface OrdenCompra {
  id: string
  numero: string
  proveedorId: string
  centroCostoId?: string | null
  pedidoEquipoId?: string | null
  proyectoId?: string | null
  solicitanteId: string
  aprobadorId?: string | null
  categoriaCosto: CategoriaCosto
  estado: EstadoOrdenCompra
  condicionPago: string
  diasCredito?: number | null
  moneda: string
  subtotal: number
  igv: number
  total: number
  lugarEntrega?: string | null
  contactoEntrega?: string | null
  observaciones?: string | null
  fechaEmision: string
  fechaAprobacion?: string | null
  fechaEnvio?: string | null
  fechaConfirmacion?: string | null
  fechaEntregaEstimada?: string | null
  createdAt: string
  updatedAt: string
  // Relations
  proveedor?: Proveedor
  centroCosto?: CentroCosto | null
  pedidoEquipo?: PedidoEquipo | null
  proyecto?: Pick<Proyecto, 'id' | 'codigo' | 'nombre'> | null
  solicitante?: Pick<User, 'id' | 'name' | 'email'>
  aprobador?: Pick<User, 'id' | 'name' | 'email'> | null
  items: OrdenCompraItem[]
}

export interface OrdenCompraItem {
  id: string
  ordenCompraId: string
  pedidoEquipoItemId?: string | null
  listaEquipoItemId?: string | null
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
  costoTotal: number
  cantidadRecibida: number
  createdAt: string
  updatedAt: string
}

// ============================
// 🏦 Cuentas Bancarias, CxC, CxP
// ============================

export interface CuentaBancaria {
  id: string
  nombreBanco: string
  numeroCuenta: string
  cci?: string | null
  tipo: string // 'corriente' | 'ahorro'
  moneda: string // 'PEN' | 'USD'
  activa: boolean
  descripcion?: string | null
  createdAt: string
  updatedAt: string
}

export type EstadoCuentaCobrar = 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'anulada'

export interface CuentaPorCobrar {
  id: string
  proyectoId: string
  clienteId: string
  valorizacionId?: string | null
  numeroDocumento?: string | null
  descripcion?: string | null
  monto: number
  moneda: string
  tipoCambio?: number | null
  montoPagado: number
  saldoPendiente: number
  fechaEmision: string
  fechaVencimiento: string
  condicionPago?: string | null
  diasCredito?: number | null
  metodoPago?: string | null
  bancoFinanciera?: string | null
  estado: EstadoCuentaCobrar
  observaciones?: string | null
  createdAt: string
  updatedAt: string

  proyecto?: Proyecto
  cliente?: Cliente
  valorizacion?: Valorizacion | null
  pagos?: PagoCobro[]
}

export interface PagoCobro {
  id: string
  cuentaPorCobrarId: string
  cuentaBancariaId?: string | null
  monto: number
  fechaPago: string
  medioPago: string // 'transferencia' | 'cheque' | 'efectivo' | 'detraccion'
  numeroOperacion?: string | null
  observaciones?: string | null
  esDetraccion?: boolean
  detraccionPorcentaje?: number | null
  detraccionCodigo?: string | null
  detraccionMonto?: number | null
  detraccionFechaPago?: string | null
  createdAt: string
  updatedAt: string

  cuentaBancaria?: CuentaBancaria | null
}

export type EstadoCuentaPagar = 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'anulada'

export interface CuentaPorPagar {
  id: string
  proveedorId: string
  proyectoId?: string | null
  ordenCompraId?: string | null
  numeroFactura?: string | null
  descripcion?: string | null
  monto: number
  moneda: string
  tipoCambio?: number | null
  montoPagado: number
  saldoPendiente: number
  fechaRecepcion: string
  fechaVencimiento: string
  condicionPago: string // 'contado' | 'credito'
  diasCredito?: number | null
  estado: EstadoCuentaPagar
  observaciones?: string | null
  createdAt: string
  updatedAt: string

  proveedor?: Proveedor
  proyecto?: Proyecto | null
  ordenCompra?: OrdenCompra | null
  pagos?: PagoPagar[]
}

export interface PagoPagar {
  id: string
  cuentaPorPagarId: string
  cuentaBancariaId?: string | null
  monto: number
  fechaPago: string
  medioPago: string // 'transferencia' | 'cheque' | 'efectivo'
  numeroOperacion?: string | null
  observaciones?: string | null
  esDetraccion?: boolean
  detraccionPorcentaje?: number | null
  detraccionCodigo?: string | null
  detraccionMonto?: number | null
  detraccionFechaPago?: string | null
  createdAt: string
  updatedAt: string

  cuentaBancaria?: CuentaBancaria | null
}
