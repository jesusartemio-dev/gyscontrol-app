// ===================================================
// 📁 Archivo: payloads.ts
// 📌 Ubicación: src/types/
// 🔧 Descripción: Contiene las interfaces de payloads utilizados
//    en operaciones POST, PUT o PATCH hacia la API.
//    Estructuras pensadas para formularios y consumo desde frontend.
//
// 🧠 Uso: Se utilizan en formularios, validaciones y servicios
//    para enviar datos a la API con el formato correcto.
//
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-04-19
// ===================================================
import type {
  TipoFormula,
  EstadoEquipoItem,
  EstadoListaItem,
  EstadoListaEquipo,
  EstadoPedido,
  EstadoPedidoItem,
  EstadoPedidoLogistico,
  EstadoCotizacionProveedor,
  EstadoEntregaItem,
  OrigenListaItem,
  EstadoEdt,
  PrioridadEdt,
  OrigenTrabajo,
  ProyectoEstado
  // ❌ Eliminado: Producto - no forma parte del sistema GYS
} from './modelos'

// ===================================================
// 🔄 INTERFACES DE PAGINACIÓN
// ===================================================

// ✅ Metadatos de paginación
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ✅ Respuesta paginada genérica
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// ✅ Parámetros de paginación para requests
export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ===================================================
// 🔄 PAYLOADS DE ENTIDADES
// ===================================================

// ❌ Eliminado: ProductoPayload y ProductoUpdatePayload - no forman parte del sistema GYS

// ✅ Unidad
export interface UnidadPayload {
  nombre: string
}
export interface UnidadUpdatePayload extends UnidadPayload {}

// ✅ UnidadServicio
export interface UnidadServicioPayload {
  nombre: string
}
export interface UnidadServicioUpdatePayload extends UnidadServicioPayload {}

// ✅ CategoriaEquipo
export interface CategoriaEquipoPayload {
  nombre: string
  descripcion?: string | null
}
export interface CategoriaEquipoUpdatePayload extends CategoriaEquipoPayload {}

// ✅ CategoriaGasto
export interface CategoriaGastoPayload {
  nombre: string
  descripcion?: string | null
}
export interface CategoriaGastoUpdatePayload extends CategoriaGastoPayload {}

// ✅ CatalogoGasto
export interface CatalogoGastoPayload {
  codigo: string
  descripcion: string
  categoriaId: string
  cantidad?: number
  precioInterno: number
  margen?: number
  precioVenta: number
  estado?: string
}
export interface CatalogoGastoUpdatePayload extends Partial<CatalogoGastoPayload> {}

// ✅ NivelServicio
export interface NivelServicioPayload {
  nombre: string
}
export interface NivelServicioUpdatePayload extends NivelServicioPayload {}

// ✅ Edt
export interface EdtPayload {
  nombre: string
  descripcion?: string
  faseDefaultId?: string // 🆕 Fase por defecto para este EDT
}
export interface EdtUpdatePayload extends EdtPayload {}

// ✅ Recurso
export interface RecursoComposicionPayload {
  empleadoId: string
  cantidad?: number
  horasAsignadas?: number
  rol?: string
}

export interface RecursoPayload {
  nombre: string
  tipo?: 'individual' | 'cuadrilla'
  origen?: 'propio' | 'externo'
  costoHora: number
  costoHoraProyecto?: number | null
  descripcion?: string
  orden?: number
  composiciones?: RecursoComposicionPayload[]
}
export interface RecursoUpdatePayload extends Partial<RecursoPayload> {}



// ------------------------------------
// 📦 CatalogoServicio Payloads
// ------------------------------------
export interface CatalogoServicioPayload {
  nombre: string
  descripcion: string
  cantidad: number
  horaBase?: number
  horaRepetido?: number
  orden?: number
  nivelDificultad?: number
  categoriaId: string
  unidadServicioId: string
  recursoId: string
}

export interface CatalogoServicioUpdatePayload extends CatalogoServicioPayload {}

// ------------------------------------
// 📦 CatalogoEquipo Payloads
// ------------------------------------
export interface CatalogoEquipoPayload {
  codigo: string
  descripcion: string
  marca: string
  precioLista: number
  precioInterno: number
  factorCosto: number
  factorVenta: number
  precioVenta: number
  precioLogistica?: number
  precioReal?: number
  precioGerencia?: number
  categoriaId: string
  unidadId: string
  estado: string
}

export interface CatalogoEquipoUpdatePayload extends Partial<CatalogoEquipoPayload> {}


// ==================
// 🧹 Plantilla
// ==================

export interface PlantillaServicioItemPayload {
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
  formula: TipoFormula
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
}

// Para actualización parcial
export interface PlantillaServicioItemUpdatePayload extends Partial<PlantillaServicioItemPayload> {}



export interface PlantillaEquipoItemPayload {
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
}

export interface PlantillaEquipoItemUpdatePayload extends Partial<PlantillaEquipoItemPayload> {}



export interface PlantillaServicioPayload {
  plantillaId: string
  nombre: string
  categoria: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface PlantillaServicioUpdatePayload extends Partial<PlantillaServicioPayload> {}


export interface PlantillaEquipoPayload {
  plantillaId: string
  nombre: string
  descripcion?: string
  subtotalInterno?: number
  subtotalCliente?: number
}

export interface PlantillaGastoPayload {
  plantillaId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface PlantillaGastoUpdatePayload extends Partial<PlantillaGastoPayload> {}

export interface PlantillaGastoItemPayload {
  gastoId: string
  nombre: string
  descripcion?: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
}

export interface PlantillaGastoItemUpdatePayload extends Partial<PlantillaGastoItemPayload> {}


// ============================
// 💲 Cotización
// ============================

// ✅ Payload para crear cotización
export interface CotizacionPayload {
  clienteId: string
  comercialId?: string
  plantillaId?: string
  codigo?: string // ✅ Código automático - se genera si no se proporciona
  numeroSecuencia?: number // ✅ Número secuencial - se genera automáticamente
  nombre: string
  totalEquiposInterno?: number
  totalEquiposCliente?: number
  totalServiciosInterno?: number
  totalServiciosCliente?: number
  totalGastosInterno?: number
  totalGastosCliente?: number
  totalInterno?: number
  totalCliente?: number
  descuento?: number
  grandTotal?: number
  etapa?: string
  prioridad?: string
  probabilidad?: number
  fechaEnvio?: string
  fechaCierreEstimada?: string
  notas?: string
  estado?: string
}

// ✅ Payload para actualizar cotización
export interface CotizacionUpdatePayload extends Partial<CotizacionPayload> {}

// ✅ Payload para crear cotización desde plantilla
export interface CreateCotizacionFromPlantillaPayload {
  plantillaId: string
  clienteId: string
}

export interface CotizacionEquipoPayload {
  cotizacionId: string
  nombre: string
  descripcion?: string
  subtotalInterno?: number
  subtotalCliente?: number
}

export interface CotizacionServicioPayload {
  cotizacionId: string
  nombre: string
  edtId: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface CotizacionServicioUpdatePayload extends Partial<CotizacionServicioPayload> {}

export interface CotizacionEquipoItemPayload {
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
  precioGerencia?: number
  precioGerenciaEditado?: boolean
}

export interface CotizacionEquipoItemUpdatePayload extends Partial<CotizacionEquipoItemPayload> {}


export interface CotizacionServicioItemPayload {
  cotizacionServicioId: string
  catalogoServicioId?: string
  unidadServicioId: string
  recursoId: string
  edtId: string
  // Datos copiados desde plantilla/catalogo
  nombre: string
  descripcion: string
  unidadServicioNombre: string
  recursoNombre: string
  formula: TipoFormula
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
  costoHora: number
  // Datos personalizados
  cantidad: number
  horaTotal: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  nivelDificultad?: number
  modoCalculo?: string
  orden?: number
}

export interface CotizacionServicioItemUpdatePayload
  extends Partial<CotizacionServicioItemPayload> {}

export interface CotizacionGastoPayload {
  cotizacionId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface CotizacionGastoUpdatePayload extends Partial<CotizacionGastoPayload> {}

export interface CotizacionGastoItemPayload {
  gastoId: string
  nombre: string
  descripcion?: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
}

export interface CotizacionGastoItemUpdatePayload extends Partial<CotizacionGastoItemPayload> {}

export interface ProyectoPayload {
  clienteId: string
  comercialId: string
  gestorId: string
  supervisorId?: string
  liderId?: string
  cotizacionId?: string

  nombre: string
  descripcion?: string
  totalEquiposInterno: number
  totalServiciosInterno: number
  totalGastosInterno: number
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number

  codigo?: string // ✅ Código automático - se genera basado en cliente.codigo + cliente.numeroSecuencia
  estado: string
  fechaInicio: string
  fechaFin?: string
  diasGarantia?: number
  adelantoPorcentaje?: number
  adelantoMonto?: number
  // Contrato
  numeroContrato?: string
  fechaFirmaContrato?: string
  fechaInicioContrato?: string
  fechaFinContrato?: string
  fondoGarantiaPct?: number
  descuentoComercialPct?: number
  igvPct?: number
  condicionPago?: string
  diasCredito?: number
}

export interface ProyectoUpdatePayload extends Partial<ProyectoPayload> {}

// ✅ Payloads para Personal del Proyecto
import type { RolPersonalProyecto } from './modelos'

export interface PersonalProyectoPayload {
  proyectoId: string
  userId: string
  rol: RolPersonalProyecto
  fechaAsignacion?: string
  fechaFin?: string
  activo?: boolean
  notas?: string
}

export interface PersonalProyectoUpdatePayload extends Partial<PersonalProyectoPayload> {}

export interface ProyectoEquipoCotizadoPayload {
  proyectoId: string
  responsableId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface ProyectoEquipoCotizadoUpdatePayload extends Partial<ProyectoEquipoCotizadoPayload> {}


export interface ProyectoEquipoCotizadoItemPayload {
  proyectoEquipoId: string
  catalogoEquipoId?: string
  listaId?: string

  // 🆕 Nuevo campo que reemplaza a equipoOriginalId
  listaEquipoSeleccionadoId?: string

  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string

  cantidad: number
  precioInterno: number
  precioCliente: number
  costoInterno: number
  costoCliente: number

  costoReal?: number
  precioReal?: number
  cantidadReal?: number

  motivoCambio?: string
  estado?: EstadoEquipoItem
}

export interface ProyectoEquipoCotizadoItemUpdatePayload extends Partial<ProyectoEquipoCotizadoItemPayload> {}



export interface ProyectoServicioCotizadoPayload {
  proyectoId: string
  responsableId: string
  nombre: string
  categoria: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface ProyectoServicioCotizadoUpdatePayload extends Partial<ProyectoServicioCotizadoPayload> {}


export interface ProyectoServicioCotizadoItemPayload {
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

  costoReal?: number
  horasEjecutadas?: number
  motivoCambio?: string
  nuevo?: boolean
}

export interface ProyectoServicioCotizadoItemUpdatePayload extends Partial<ProyectoServicioCotizadoItemPayload> {}


export interface ProyectoCotizadoGastoPayload {
  proyectoId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface ProyectoCotizadoGastoUpdatePayload extends Partial<ProyectoCotizadoGastoPayload> {}

export interface ProyectoGastoCotizadoItemPayload {
  gastoId: string
  nombre: string
  descripcion?: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
  costoReal?: number
}

export interface ProyectoGastoCotizadoItemUpdatePayload extends Partial<ProyectoGastoCotizadoItemPayload> {}



// ============================
// 🏗️ GESTION EQUIPOS
// ============================

export interface ListaEquipoPayload {
  proyectoId: string
  responsableId?: string                 // ✅ campo requerido en el modelo
  codigo?: string                        // ✅ antes 'nombre', ahora usamos 'codigo'
  nombre: string
  numeroSecuencia?: number               // ✅ número puro para control interno
  estado?: EstadoListaEquipo
  fechaNecesaria?: string                // ✅ fecha límite para completar la lista (ISO string)
}

export interface ListaEquipoUpdatePayload extends Partial<ListaEquipoPayload> {
  fechaNecesaria?: string                // ✅ permite actualizar fecha necesaria
  motivoAnulacion?: string               // ✅ requerido al anular la lista
  // Las demás fechas se actualizan automáticamente por el backend según cambios de estado
}


export interface ListaEquipoItemPayload {
  listaId: string
  proyectoEquipoItemId?: string
  proyectoEquipoId?: string
  catalogoEquipoId?: string
  reemplazaProyectoEquipoCotizadoItemId?: string // 🆕 Nuevo campo claro
  responsableId?: string // 🆕 Campo para identificar quién registra el item

  proveedorId?: string
  cotizacionSeleccionadaId?: string

  codigo: string
  descripcion: string
  categoria?: string // ✅ Opcional - si hay catalogoEquipoId, se obtiene del catálogo
  unidad: string
  marca?: string // ✅ Campo marca directo en el item
  cantidad: number

  verificado?: boolean
  comentarioRevision?: string
  presupuesto?: number
  precioElegido?: number
  costoElegido?: number
  costoPedido?: number
  costoReal?: number
  cantidadPedida?: number
  cantidadEntregada?: number
  estado?: EstadoListaItem
  origen?: OrigenListaItem
  tipoItem?: string // "equipo" | "consumible" | "servicio"
}

export interface ListaEquipoItemCreatePayload extends ListaEquipoItemPayload {}
export interface ListaEquipoItemUpdatePayload extends Partial<ListaEquipoItemPayload> {}





// ✅ Cliente
export interface ClientePayload {
  nombre: string
  ruc?: string
  direccion?: string
  telefono?: string
  correo?: string
}
export interface ClienteUpdatePayload extends Partial<ClientePayload> {}

export interface ProveedorPayload {
  nombre: string
  ruc?: string
  direccion?: string
  telefono?: string
  correo?: string
  contactoNombre?: string
  contactoTelefono?: string
  contactoCorreo?: string
  banco?: string
  numeroCuenta?: string
  cci?: string
  tipoCuenta?: string
}
export interface ProveedorUpdatePayload extends Partial<ProveedorPayload> {}

export interface CotizacionProveedorPayload {
  proveedorId: string
  proyectoId: string
  codigo?: string                         // ✅ antes 'nombre', ahora es el código generado (ej. CJM27-COT-001)
  numeroSecuencia?: number                // ✅ número puro para control interno
  estado?: EstadoCotizacionProveedor
  moneda?: string                         // "USD" | "PEN"
  tipoCambio?: number | null
  // Condiciones comerciales (alineadas a OrdenCompra)
  condicionPago?: string | null
  diasCredito?: number | null
  lugarEntrega?: string | null
  tiempoEntrega?: string | null
  contactoEntrega?: string | null
  observaciones?: string | null
}

export interface CotizacionProveedorUpdatePayload extends Partial<CotizacionProveedorPayload> {}


export interface CotizacionProveedorItemPayload {
  cotizacionId: string
  listaEquipoItemId: string
  listaId?: string
  // 💵 Datos cotizados (opcionales)
  precioUnitario?: number
  cantidad?: number
  costoTotal?: number
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  // ✅ Estado y selección
  estado?: EstadoCotizacionProveedor  // 'pendiente' | 'cotizado' | etc.
  esSeleccionada?: boolean
}

export interface CotizacionProveedorItemUpdatePayload
  extends Partial<CotizacionProveedorItemPayload> {}

export interface PedidoEquipoPayload {
  proyectoId: string
  responsableId: string
  listaId?: string | null
  nombre?: string | null        // ✅ nombre descriptivo del pedido
  estado?: EstadoPedido
  observacion?: string
  fechaPedido?: string         // ✅ se mantiene por compatibilidad
  fechaNecesaria: string       // ✅ obligatoria: la fecha que PROYECTOS necesita el pedido
  fechaEntregaEstimada?: string // logística propone esta fecha
  fechaEntregaReal?: string     // fecha cuando se entregó
  prioridad?: 'baja' | 'media' | 'alta' | 'critica' // ✅ prioridad del pedido
  esUrgente?: boolean          // ✅ marca si es urgente
  itemsSeleccionados?: Array<{ // ✅ items seleccionados desde el modal contextual
    listaEquipoItemId: string
    cantidadPedida: number
  }>
}


export interface PedidoEquipoUpdatePayload extends Partial<PedidoEquipoPayload> {
  // 🚛 Campos logísticos adicionales para gestión de entregas
  estadoLogistico?: EstadoPedidoLogistico
  responsableLogisticoId?: string
  fechaEnvioProveedor?: string
  fechaRecepcionProveedor?: string
  fechaEnvioAlmacen?: string
  fechaRecepcionAlmacen?: string
  fechaProgramadaEntrega?: string
  fechaEntregaProyecto?: string
  fechaConfirmacionProyecto?: string
  ubicacionActual?: string
  transportista?: string
  numeroGuia?: string
  costoLogistico?: number
  observacionesLogisticas?: string
}


export interface PedidoEquipoItemPayload {
  pedidoId: string
  responsableId: string
  listaId?: string
  listaEquipoItemId?: string
  // 📦 Datos solicitados
  cantidadPedida: number
  // 💰 Datos económicos (opcionalmente copiados desde cotización seleccionada)
  precioUnitario?: number
  costoTotal?: number
  // 🚦 Estado de atención
  estado?: EstadoPedidoItem
  cantidadAtendida?: number
  comentarioLogistica?: string
  // 🔁 Copiados desde ListaEquipoItem o ingresados manualmente
  codigo: string
  descripcion: string
  unidad: string
  categoria?: string
  marca?: string
  catalogoEquipoId?: string
  tipoItem?: string // "equipo" | "consumible" | "servicio"
  tiempoEntrega?: string
  tiempoEntregaDias?: number
  // 🏪 Proveedor
  proveedorId?: string
  proveedorNombre?: string
  // 🚚 Campos de trazabilidad de entregas
  fechaEntregaEstimada?: string
  fechaEntregaReal?: string
  estadoEntrega?: EstadoEntregaItem
  observacionesEntrega?: string
}



export interface PedidoEquipoItemUpdatePayload
  extends Partial<PedidoEquipoItemPayload> {}

// ============================
// 💲 Valorización Payloads
// ============================

export interface ValorizacionPayload {
  proyectoId: string
  nombre: string
  descripcion?: string
  periodoInicio: string
  periodoFin: string
  estado?: string
  montoTotal: number
}

export interface ValorizacionUpdatePayload extends Partial<ValorizacionPayload> {}


// ============================
// ⏱️ Registro de Horas Payloads
// ============================

export interface RegistroHorasPayload {
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
  aprobado?: boolean
}

export interface RegistroHorasUpdatePayload extends Partial<RegistroHorasPayload> {}




// 🔍 Filtros Completos



// ❌ Eliminado: ProductoFilters - no forma parte del sistema GYS

// 📄 Tipos de Respuesta API Estándar
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

// ✅ Respuesta paginada estándar (eliminada - usar la definición con meta)

// ✅ Parámetros de paginación mejorados
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ✅ Parámetros de búsqueda con paginación
export interface SearchParams {
  query?: string;
  search?: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

// ✅ Configuración de paginación por entidad
export interface EntityPaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  searchFields?: string[];
}

// ✅ Parámetros específicos para APIs principales
export interface ListasEquipoPaginationParams extends PaginationParams {
  proyectoId?: string;
  estado?: string;
  responsableId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface CotizacionesPaginationParams extends PaginationParams {
  clienteId?: string;
  comercialId?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PedidosPaginationParams extends PaginationParams {
  proyectoId?: string;
  listaId?: string;
  estado?: string;
  prioridad?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

// ✅ Parámetros específicos para pedidos de equipo (aprovisionamiento)
export interface PedidosEquipoPaginationParams extends PaginationParams {
  proyectoId?: string;
  proveedorId?: string;
  estado?: string[];
  fechaDesde?: string;
  fechaHasta?: string;
  montoMinimo?: number;
  montoMaximo?: number;
  busqueda?: string;
}

export interface TimelinePaginationParams extends PaginationParams {
  tipo?: string;
  entidadId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}


// ❌ Eliminado: ProductoResponse types - no forman parte del sistema GYS

// 📊 Tipos para reportes y analytics
export interface ReportePayload {
  tipo: 'pedidos' | 'metricas' | 'trazabilidad';
  filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    proyectoId?: string;
    proveedorId?: string;
    estadoEntrega?: EstadoListaItem;
  };
  formato: 'pdf' | 'excel' | 'csv';
  incluirDetalles?: boolean;
}

// ============================
// 📋 Payloads Sistema de Tareas y Subtareas
// ============================

// 📋 Payload para crear/actualizar Tarea
export interface TareaPayload {
  proyectoServicioId: string
  nombre: string
  descripcion?: string
  estado?: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'pausada'
  prioridad?: 'baja' | 'media' | 'alta' | 'critica'
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  progreso?: number // 0-100
  horasEstimadas: number
  horasReales?: number
  responsableId: string
}

export interface TareaUpdatePayload extends Partial<TareaPayload> {}

// 📝 Payload para crear/actualizar Subtarea
export interface SubtareaPayload {
  tareaId: string
  nombre: string
  descripcion?: string
  estado?: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'pausada'
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  progreso?: number // 0-100
  horasEstimadas: number
  horasReales?: number
  asignadoId?: string
}

export interface SubtareaUpdatePayload extends Partial<SubtareaPayload> {}

// 🔗 Payload para crear/actualizar Dependencia entre Tareas
export interface DependenciaTareaPayload {
  tareaOrigenId: string
  tareaDestinoId: string
  tipo: 'fin_a_inicio' | 'inicio_a_inicio' | 'fin_a_fin' | 'inicio_a_fin'
  retrasoMinimo?: number // días de retraso mínimo
}

export interface DependenciaTareaUpdatePayload extends Partial<DependenciaTareaPayload> {}

// 👥 Payload para crear/actualizar Asignación de Recursos
export interface AsignacionRecursoPayload {
  tareaId: string
  usuarioId: string
  tipoRecurso: 'humano' | 'material' | 'equipo'
  porcentajeAsignacion: number // 0-100
  fechaAsignacion: string
  fechaDesasignacion?: string
  activo?: boolean
}

export interface AsignacionRecursoUpdatePayload extends Partial<AsignacionRecursoPayload> {}

// 📊 Payload para crear/actualizar Registro de Progreso
export interface RegistroProgresoPayload {
  tareaId?: string
  subtareaId?: string
  usuarioId: string
  fecha: string
  horasTrabajadas: number
  progresoAnterior: number
  progresoNuevo: number
  descripcion?: string
  observaciones?: string
}

export interface RegistroProgresoUpdatePayload extends Partial<RegistroProgresoPayload> {}

// 📊 Parámetros de paginación específicos para Tareas
export interface TareasPaginationParams extends PaginationParams {
  proyectoServicioId?: string
  responsableId?: string
  estado?: string
  prioridad?: string
  fechaDesde?: string
  fechaHasta?: string
}

// 📝 Parámetros de paginación específicos para Subtareas
export interface SubtareasPaginationParams extends PaginationParams {
  tareaId?: string
  asignadoId?: string
  estado?: string
  fechaDesde?: string
  fechaHasta?: string
}

// 📊 Parámetros de paginación específicos para Registros de Progreso
export interface RegistrosProgresoPaginationParams extends PaginationParams {
  tareaId?: string
  subtareaId?: string
  usuarioId?: string
  fechaDesde?: string
  fechaHasta?: string
}

// 📈 Payload para datos de Gantt Chart
export interface GanttDataPayload {
  proyectoServicioId: string
  incluirSubtareas?: boolean
  incluirDependencias?: boolean
  fechaInicio?: string
  fechaFin?: string
}

// 📊 Payload para métricas de tareas
export interface MetricasTareasPayload {
  proyectoServicioId?: string
  responsableId?: string
  fechaInicio?: string
  fechaFin?: string
  incluirSubtareas?: boolean
}

// 📊 Interfaces para Gantt Chart
export interface GanttTaskPayload {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  progreso: number
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'pausada'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  responsable: {
    id: string
    nombre: string
    email: string
  }
  horasEstimadas: number
  horasReales?: number
  dependencias?: string[]
  subtareas?: GanttTaskPayload[]
  tipo: 'tarea' | 'subtarea'
  nivel: number
  rutaCritica?: boolean
}

export interface GanttMetricsPayload {
  progresoGeneral: number
  horasTotales: number
  horasCompletadas: number
  eficiencia: number
  fechaInicioProyecto: string
  fechaFinProyecto: string
  fechaInicioReal?: string
  fechaFinReal?: string
  diasRetraso?: number
  tareasTotal: number
  tareasCompletadas: number
  tareasPendientes: number
  tareasEnProgreso: number
}

// 📊 Interfaz para dependencias en Gantt
export interface GanttDependency {
  id: string
  tareaOrigenId: string
  tareaDestinoId: string
  tipo: 'fin_a_inicio' | 'inicio_a_inicio' | 'fin_a_fin' | 'inicio_a_fin'
  retrasoMinimo?: number
}

export interface GanttChartPayload {
  tareas: GanttTaskPayload[]
  dependencias?: GanttDependency[]
  metricas: GanttMetricsPayload
  rutaCritica?: string[]
  timeline?: Array<{
    fecha: string
    eventos: Array<{
      tipo: 'inicio' | 'fin' | 'hito'
      tareaId: string
      descripcion: string
    }>
  }>
  cargaTrabajo?: Array<{
    usuarioId: string
    nombre: string
    cargaPorcentaje: number
    horasAsignadas: number
    conflictos: boolean
  }>
}

// ===================================================
// 📋 PAYLOADS PARA SISTEMA EDT
// ===================================================

// 🔧 Payload para crear ProyectoEdt
export interface ProyectoEdtPayload {
  proyectoId: string
  nombre: string
  edtId: string // Refactored: categoriaServicioId → edtId
  fechaInicio?: string
  fechaFin?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  horasEstimadas: number
  horasReales?: number
  estado?: EstadoEdt
  responsableId?: string
  porcentajeAvance?: number // 0-100
  descripcion?: string
  prioridad?: PrioridadEdt
}

// 🔧 Payload para actualizar ProyectoEdt
export interface ProyectoEdtUpdatePayload extends Partial<ProyectoEdtPayload> {
  id?: string // Para identificar el EDT a actualizar
}

// 📊 Payload para filtros de búsqueda EDT
export interface EdtPaginationParams extends PaginationParams {
  proyectoId?: string
  edtId?: string // Refactored: categoriaServicioId → edtId
  estado?: EstadoEdt
  prioridad?: PrioridadEdt
  responsableId?: string
  fechaDesde?: string
  fechaHasta?: string
  porcentajeAvanceMin?: number
  porcentajeAvanceMax?: number
  horasEstimadasMin?: number
  horasEstimadasMax?: number
}

// 📈 Payload para métricas EDT
export interface MetricasEdtPayload {
  proyectoId?: string
  edtId?: string // Refactored: categoriaServicioId → edtId
  responsableId?: string
  fechaInicio?: string
  fechaFin?: string
  incluirDetalles?: boolean
}

// 🎯 Payload para resumen EDT por proyecto
export interface ResumenEdtProyectoPayload {
  proyectoIds?: string[]
  incluirResponsables?: boolean
  incluirMetricas?: boolean
  fechaCorte?: string
}

// 📋 Payload para actualización masiva de EDT
export interface EdtBulkUpdatePayload {
  edtIds: string[]
  updates: {
    estado?: EstadoEdt
    prioridad?: PrioridadEdt
    responsableId?: string
    porcentajeAvance?: number
    fechaInicio?: string
    fechaFin?: string
  }
}

// 🔄 Payload para transferir EDT entre responsables
export interface EdtTransferPayload {
  edtIds: string[]
  nuevoResponsableId: string
  motivo?: string
  notificarResponsables?: boolean
}

// 📊 Payload para reportes EDT
export interface ReporteEdtPayload {
  tipo: 'resumen' | 'detallado' | 'metricas' | 'progreso'
  filtros: {
    proyectoId?: string
    edtId?: string // Refactored: categoriaServicioId → edtId
    estado?: EstadoEdt[]
    prioridad?: PrioridadEdt[]
    responsableId?: string
    fechaInicio?: string
    fechaFin?: string
  }
  formato: 'pdf' | 'excel' | 'csv'
  incluirGraficos?: boolean
  incluirDetalleHoras?: boolean
}

// 🎨 Payload para configuración de vista EDT
export interface EdtViewConfigPayload {
  usuarioId: string
  configuracion: {
    columnas: string[]
    filtrosPredeterminados?: EdtPaginationParams
    ordenamiento?: {
      campo: string
      direccion: 'asc' | 'desc'
    }
    agrupamiento?: 'proyecto' | 'categoria' | 'responsable' | 'estado' | 'prioridad'
    mostrarMetricas?: boolean
  }
}

// 📊 PAYLOADS PARA CRONOGRAMA ANALYTICS - FASE 4
// ===================================================

// 🎯 Payload para obtener KPIs de cronograma
export interface KpisCronogramaPayload {
  proyectoId?: string
  fechaInicio?: string
  fechaFin?: string
  incluirComparativo?: boolean
  incluirTendencias?: boolean
}

// 📈 Payload para tendencias mensuales
export interface TendenciasMensualesPayload {
  proyectoId?: string
  año: number
  meses?: number[] // Array de meses (1-12)
  metricas?: ('eficiencia' | 'cumplimiento' | 'horas' | 'costos')[]
}

// 🔍 Payload para análisis de rendimiento
export interface AnalisisRendimientoPayload {
  proyectoId?: string
  responsableId?: string
  edtId?: string // Refactored: categoriaServicioId → edtId
  fechaInicio?: string
  fechaFin?: string
  incluirRecomendaciones?: boolean
}

// 🚨 Payload para generar alertas
export interface GenerarAlertasPayload {
  proyectoId?: string
  tiposAlerta?: ('retraso' | 'sobrecosto' | 'baja_eficiencia' | 'riesgo_calidad')[]
  umbralRetraso?: number // días
  umbralSobrecosto?: number // porcentaje
  umbralEficiencia?: number // porcentaje
  notificarPorEmail?: boolean
}

// 📊 Payload para métricas comparativas
export interface MetricasComparativasPayload {
  proyectoIds: string[]
  metricas: ('duracion' | 'costo' | 'eficiencia' | 'calidad')[]
  fechaInicio?: string
  fechaFin?: string
  agruparPor?: 'mes' | 'trimestre' | 'año'
}

// 🎛️ Payload para dashboard ejecutivo
export interface DashboardEjecutivoPayload {
  usuarioId: string
  proyectoIds?: string[]
  fechaInicio?: string
  fechaFin?: string
  incluirProyecciones?: boolean
  incluirAlertas?: boolean
  incluirKpis?: boolean
}

// ✅ Registro de Horas
export interface CreateRegistroHorasPayload {
  proyectoEdtId?: string
  proyectoTareaId?: string
  usuarioId: string
  fecha: string
  horasTrabajadas: number
  descripcion?: string
  observaciones?: string
}

// ✅ Filtros para Cronograma
export interface FiltrosCronogramaPayload {
  proyectoId?: string
  edtId?: string // Refactored: categoriaServicioId → edtId
  estado?: EstadoEdt
  prioridad?: PrioridadEdt
  responsableId?: string
  fechaDesde?: string
  fechaHasta?: string
  porcentajeAvanceMin?: number
  porcentajeAvanceMax?: number
  horasEstimadasMin?: number
  horasEstimadasMax?: number
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ✅ Payload para crear EDT desde cronograma
export interface CreateProyectoEdtPayload {
  proyectoId: string
  proyectoCronogramaId: string
  nombre: string
  edtId: string // Refactored: categoriaServicioId → edtId
  fechaInicio?: string
  fechaFin?: string
  horasEstimadas: number
  estado?: EstadoEdt
  responsableId?: string
  porcentajeAvance?: number
  descripcion?: string
  prioridad?: PrioridadEdt
}

// ======================
// Centro de Costo
// ======================

export interface CentroCostoPayload {
  nombre: string
  tipo: 'departamento' | 'administrativo'
  descripcion?: string
  activo?: boolean
}

export interface CentroCostoUpdatePayload {
  nombre?: string
  tipo?: string
  descripcion?: string | null
  activo?: boolean
}

// ======================
// Hoja de Gastos
// ======================

export interface RequerimientoMaterialItemPayload {
  pedidoEquipoItemId: string
  pedidoId: string
  proyectoId: string
  codigo: string
  descripcion: string
  unidad: string
  cantidadSolicitada: number
  precioEstimado?: number | null
}

export interface HojaDeGastosPayload {
  proyectoId?: string
  centroCostoId?: string
  categoriaCosto?: 'equipos' | 'servicios' | 'gastos'
  empleadoId?: string
  motivo: string
  observaciones?: string
  requiereAnticipo?: boolean
  montoAnticipo?: number
  // Requerimiento de materiales
  tipoProposito?: 'gastos_viaticos' | 'compra_materiales'
  justificacionMateriales?: string
  items?: RequerimientoMaterialItemPayload[]
}

export interface HojaDeGastosUpdatePayload {
  motivo?: string
  observaciones?: string | null
  requiereAnticipo?: boolean
  montoAnticipo?: number
}

export interface GastoLineaPayload {
  hojaDeGastosId: string
  categoriaGastoId?: string
  descripcion: string
  fecha: string
  monto: number
  moneda?: string
  tipoComprobante?: string
  numeroComprobante?: string
  proveedorNombre?: string
  proveedorRuc?: string
  sunatVerificado?: boolean
  observaciones?: string
  // Override de imputación por línea
  proyectoId?: string | null
  centroCostoId?: string | null
  categoriaCosto?: 'equipos' | 'servicios' | 'gastos' | null
}

export interface GastoLineaUpdatePayload {
  categoriaGastoId?: string | null
  descripcion?: string
  fecha?: string
  monto?: number
  moneda?: string
  tipoComprobante?: string | null
  numeroComprobante?: string | null
  proveedorNombre?: string | null
  proveedorRuc?: string | null
  sunatVerificado?: boolean | null
  observaciones?: string | null
  // Override de imputación por línea
  proyectoId?: string | null
  centroCostoId?: string | null
  categoriaCosto?: 'equipos' | 'servicios' | 'gastos' | null
}

// ======================
// Orden de Compra
// ======================

export interface OrdenCompraItemPayload {
  pedidoEquipoItemId?: string
  listaEquipoItemId?: string
  codigo?: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
}

export interface OrdenCompraPayload {
  proveedorId: string
  centroCostoId?: string
  pedidoEquipoId?: string
  proyectoId?: string
  categoriaCosto?: 'equipos' | 'servicios' | 'gastos'
  requiereRecepcion?: boolean
  condicionPago?: string
  moneda?: string
  lugarEntrega?: string
  tiempoEntrega?: string
  contactoEntrega?: string
  observaciones?: string
  fechaEntregaEstimada?: string
  items: OrdenCompraItemPayload[]
}

export interface OrdenCompraUpdatePayload {
  requiereRecepcion?: boolean
  condicionPago?: string
  moneda?: string
  lugarEntrega?: string | null
  tiempoEntrega?: string | null
  contactoEntrega?: string | null
  observaciones?: string | null
  fechaEntregaEstimada?: string | null
  items?: OrdenCompraItemPayload[]
}

