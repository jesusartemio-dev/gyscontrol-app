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
  EstadoCotizacionProveedor, 
  EstadoEntregaItem,
  OrigenListaItem
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
}
export interface CategoriaEquipoUpdatePayload extends CategoriaEquipoPayload {}

// ✅ NivelServicio
export interface NivelServicioPayload {
  nombre: string
}
export interface NivelServicioUpdatePayload extends NivelServicioPayload {}

// ✅ CategoriaServicio
export interface CategoriaServicioPayload {
  nombre: string
}
export interface CategoriaServicioUpdatePayload extends CategoriaServicioPayload {}

// ✅ Recurso
export interface RecursoPayload {
  nombre: string
  costoHora: number
}
export interface RecursoUpdatePayload extends RecursoPayload {}



// ------------------------------------
// 📦 CatalogoServicio Payloads
// ------------------------------------
export interface CatalogoServicioPayload {
  nombre: string
  descripcion: string
  formula: TipoFormula
  horaBase?: number
  horaRepetido?: number
  horaUnidad?: number
  horaFijo?: number
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
  precioInterno: number
  margen: number
  precioVenta: number
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
  precioInterno: number
  precioCliente: number
  cantidad: number
  costoInterno: number
  costoCliente: number
}

export interface PlantillaEquipoItemUpdatePayload extends Partial<PlantillaEquipoItemPayload> {}



export interface PlantillaServicioPayload {
  plantillaId: string
  nombre: string
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

export interface CotizacionEquipoPayload {
  cotizacionId: string
  nombre: string
  descripcion?: string
  subtotalInterno?: number
  subtotalCliente?: number
}

export interface CotizacionServicioPayload {
  cotizacionId: string
  categoria: string
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
  precioInterno: number
  precioCliente: number

  cantidad: number
  costoInterno: number
  costoCliente: number
}

export interface CotizacionEquipoItemUpdatePayload extends Partial<CotizacionEquipoItemPayload> {}


export interface CotizacionServicioItemPayload {
  cotizacionServicioId: string
  catalogoServicioId?: string
  unidadServicioId: string
  recursoId: string
  // Datos copiados desde plantilla/catalogo
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
  // Datos personalizados  
  cantidad: number
  horaTotal: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
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
  cotizacionId?: string

  nombre: string
  totalEquiposInterno: number
  totalServiciosInterno: number
  totalGastosInterno: number
  totalInterno: number
  totalCliente: number
  descuento: number
  grandTotal: number

  codigo: string
  estado: string
  fechaInicio: string
  fechaFin?: string
}

export interface ProyectoUpdatePayload extends Partial<ProyectoPayload> {}

export interface ProyectoEquipoPayload {
  proyectoId: string
  responsableId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface ProyectoEquipoUpdatePayload extends Partial<ProyectoEquipoPayload> {}


export interface ProyectoEquipoItemPayload {
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

export interface ProyectoEquipoItemUpdatePayload extends Partial<ProyectoEquipoItemPayload> {}



export interface ProyectoServicioPayload {
  proyectoId: string
  responsableId: string
  categoria: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface ProyectoServicioUpdatePayload extends Partial<ProyectoServicioPayload> {}


export interface ProyectoServicioItemPayload {
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

export interface ProyectoServicioItemUpdatePayload extends Partial<ProyectoServicioItemPayload> {}


export interface ProyectoGastoPayload {
  proyectoId: string
  nombre: string
  descripcion?: string
  subtotalInterno: number
  subtotalCliente: number
}

export interface ProyectoGastoUpdatePayload extends Partial<ProyectoGastoPayload> {}

export interface ProyectoGastoItemPayload {
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

export interface ProyectoGastoItemUpdatePayload extends Partial<ProyectoGastoItemPayload> {}



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
  // Las demás fechas se actualizan automáticamente por el backend según cambios de estado
}


export interface ListaEquipoItemPayload {
  listaId: string
  proyectoEquipoItemId?: string
  proyectoEquipoId?: string
  reemplazaProyectoEquipoItemId?: string // 🆕 Nuevo campo claro
  responsableId?: string // 🆕 Campo para identificar quién registra el item

  proveedorId?: string
  cotizacionSeleccionadaId?: string

  codigo: string
  descripcion: string
  unidad: string
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
}
export interface ProveedorUpdatePayload extends Partial<ProveedorPayload> {}

export interface CotizacionProveedorPayload {
  proveedorId: string
  proyectoId: string
  codigo?: string                         // ✅ antes 'nombre', ahora es el código generado (ej. CJM27-COT-001)
  numeroSecuencia?: number                // ✅ número puro para control interno
  estado?: EstadoCotizacionProveedor
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
  listaId: string
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


export interface PedidoEquipoUpdatePayload extends Partial<PedidoEquipoPayload> {}


export interface PedidoEquipoItemPayload {
  pedidoId: string
  responsableId: string
  listaId?: string
  listaEquipoItemId: string
  // 📦 Datos solicitados
  cantidadPedida: number
  // 💰 Datos económicos (opcionalmente copiados desde cotización seleccionada)
  precioUnitario?: number
  costoTotal?: number
  // 🚦 Estado de atención
  estado?: EstadoPedidoItem
  cantidadAtendida?: number
  comentarioLogistica?: string
  // 🔁 Copiados desde ListaEquipoItem
  codigo: string
  descripcion: string
  unidad: string
  tiempoEntrega?: string
  tiempoEntregaDias?: number
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

// 💰 Tipos para métricas financieras
export interface FinancialMetrics {
  ingresos: {
    total: number;
    proyectado: number;
    realizado: number;
    pendiente: number;
  };
  costos: {
    total: number;
    operativos: number;
    materiales: number;
    logistica: number;
  };
  rentabilidad: {
    margenBruto: number;
    margenNeto: number;
    roi: number;
    ebitda: number;
  };
  flujo: {
    entradas: number;
    salidas: number;
    neto: number;
    proyeccion: number;
  };
  metricas: Array<{
    id: string;
    nombre: string;
    valor: number;
    unidad: string;
    tendencia: 'up' | 'down' | 'stable';
    cambio: number;
    categoria: 'ingresos' | 'costos' | 'rentabilidad' | 'flujo';
  }>;
  // Propiedades adicionales para compatibilidad con la UI
  tendenciaCosto?: number;
  porcentajePresupuesto?: number;
  presupuestoUsado?: number;
  presupuestoTotal?: number;
  roiPromedio?: number;
  tendenciaROI?: number;
  tendenciaAhorro?: number;
}

export interface CostAnalysis {
  categorias: Array<{
    nombre: string;
    presupuesto: number;
    real: number;
    variacion: number;
    porcentaje: number;
  }>;
  centrosCosto: Array<{
    id: string;
    nombre: string;
    presupuesto: number;
    ejecutado: number;
    disponible: number;
    porcentajeUso: number;
  }>;
  tendencias: Array<{
    mes: string;
    presupuesto: number;
    real: number;
    diferencia: number;
  }>;
  alertas: Array<{
    tipo: 'sobrecosto' | 'desviacion' | 'limite';
    mensaje: string;
    severidad: 'low' | 'medium' | 'high';
    categoria?: string;
  }>;
}

export interface BudgetTracking {
  resumen: {
    presupuestoTotal: number;
    ejecutado: number;
    disponible: number;
    porcentajeEjecucion: number;
  };
  categorias: Array<{
    nombre: string;
    presupuesto: number;
    ejecutado: number;
    disponible: number;
    porcentaje: number;
    estado: 'normal' | 'alerta' | 'critico' | 'excedido';
  }>;
  proyecciones: {
    finAno: number;
    variacionEsperada: number;
    riesgoSobrecosto: 'bajo' | 'medio' | 'alto';
  };
}

export interface ROIData {
  resumen: {
    roiPromedio: number;
    mejorProveedor: string;
    peorProveedor: string;
    tendenciaGeneral: 'up' | 'down' | 'stable';
  };
  proveedores: Array<{
    id: string;
    nombre: string;
    roi: number;
    inversion: number;
    retorno: number;
    proyectos: number;
    calificacion: number;
    tendencia: 'up' | 'down' | 'stable';
  }>;
  metricas: Array<{
    nombre: string;
    valor: number;
    benchmark: number;
    estado: 'excelente' | 'bueno' | 'regular' | 'malo';
  }>;
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

