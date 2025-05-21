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
import type { TipoFormula, EstadoEquipo, EstadoListaEquipo, EstadoPedido, EstadoPedidoItem } from './modelos' 


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
  equipoOriginalId?: string
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
  aprobado?: boolean
  motivoCambio?: string
  costoReal?: number
  nuevo?: boolean
  listaId?: string

  // ✅ Aquí lo agregas
  estado?: EstadoEquipo
  precioReal?: number
  cantidadReal?: number
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
  nombre: string
  descripcion?: string
  estado?: EstadoListaEquipo
}
export interface ListaEquipoUpdatePayload extends Partial<ListaEquipoPayload> {}

export interface ListaEquipoItemPayload {
  listaId: string
  proyectoEquipoItemId?: string
  proveedorId?: string
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
}
export interface ListaEquipoItemUpdatePayload extends Partial<ListaEquipoItemPayload> {}


export interface ProveedorPayload {
  nombre: string
  ruc?: string
}
export interface ProveedorUpdatePayload extends Partial<ProveedorPayload> {}

export interface CotizacionProveedorPayload {
  proveedorId: string
  proyectoId: string
  nombre: string
  fecha: string
}
export interface CotizacionProveedorUpdatePayload extends Partial<CotizacionProveedorPayload> {}

export interface CotizacionProveedorItemPayload {
  cotizacionId: string
  listaEquipoItemId: string
  precioUnitario: number
  cantidad: number
  costoTotal: number
  tiempoEntrega?: string
  esSeleccionada?: boolean
}
export interface CotizacionProveedorItemUpdatePayload extends Partial<CotizacionProveedorItemPayload> {}

export interface PedidoEquipoPayload {
  proyectoId: string
  responsableId: string
  listaId: string
  codigo?: string
  estado?: EstadoPedido
  observacion?: string
  fechaPedido?: string  
  fechaEntregaEstimada?: string
  fechaEntregaReal?: string
}
export interface PedidoEquipoUpdatePayload extends Partial<PedidoEquipoPayload> {}

export interface PedidoEquipoItemPayload {
  pedidoId: string
  listaEquipoItemId: string
  cantidadPedida: number
  precioUnitario?: number
  costoTotal?: number
  fechaNecesaria: string
  estado?: EstadoPedidoItem
  cantidadAtendida?: number
  comentarioLogistica?: string
}
export interface PedidoEquipoItemUpdatePayload extends Partial<PedidoEquipoItemPayload> {}

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

