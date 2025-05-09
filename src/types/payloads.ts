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
import type { TipoFormula } from './modelos'  // Asegúrate de importar


// ------------------------------------
// 📦 UnidadServicio Payloads
// ------------------------------------
export interface UnidadServicioPayload {
  nombre: string
}

export interface UnidadServicioUpdatePayload {
  nombre: string
}

// ------------------------------------
// 📦 CategoriaServicio Payloads
// ------------------------------------
export interface CategoriaServicioPayload {
  nombre: string
}

export interface CategoriaServicioUpdatePayload {
  nombre: string
}

// ------------------------------------
// 📦 Recurso Payloads
// ------------------------------------

export interface RecursoPayload {
  nombre: string
  costoHora: number
}


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
  responsableId: string

  codigo: string
  nombre: string
  descripcion?: string
  unidad?: string
  cantidad: number
  precioInterno: number
  precioCliente: number
  costoInterno: number
  costoCliente: number

  aprobado?: boolean
  motivoCambio?: string
  costoReal?: number
  nuevo?: boolean
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

