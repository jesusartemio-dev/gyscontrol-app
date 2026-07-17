import type { PlanTrabajo, PlanTrabajoGeneracion, PlanTrabajoImagen } from '@prisma/client'

// ============================================
// SECCIONES ESTRUCTURADAS (campos Json)
// ============================================

/** Viñeta operativa de 1 línea por tarea real del cronograma (Bloque 4.2, Tarea 4) — texto redactado por IA, fallback = nombre de la tarea. */
export interface PlanAlcanceDetalladoTarea {
  tareaRefId?: string
  nombre: string
  texto: string
  /** 1 línea sugiriendo qué foto tomar para documentar ESTA tarea (Bloque 4.2 sesión 2, Tarea 2) — solo UI, nunca se exporta al docx. */
  fotoSugerida?: string
  /**
   * El usuario la eliminó del PLAN (Bloque 4.2 sesión 3) — borrado lógico,
   * NUNCA borra la tarea del cronograma real del proyecto (el plan es un
   * documento, no la fuente de verdad de la planificación). Se filtra del
   * export y de la vista; sobrevive a un regenerar de sección (ver
   * preservarEstadoManualTareas en generarAlcanceDetallado.ts) salvo que el
   * usuario la restaure explícitamente desde el editor.
   */
  excluida?: boolean
  /**
   * CatalogoImagen.id que el usuario RECHAZÓ explícitamente para esta tarea
   * (quitó una sugerencia de IA, Bloque 4.2 sesión 4) — se persiste para que
   * una regeneración posterior no vuelva a proponer la misma imagen. Nunca
   * se exporta al docx; solo lo lee aplicarSugerenciasImagenesIA.ts.
   */
  catalogoImagenesRechazadas?: string[]
  /**
   * El usuario editó a mano el `texto` (viñeta) de esta tarea (Bloque 4.2
   * sesión 5) — una regeneración posterior lo PRESERVA por defecto, salvo
   * que el usuario marque explícitamente "sobrescribir editados". Se libera
   * (vuelve a false) al sobrescribir o al usar la acción "Liberar" del editor.
   */
  textoEditadoManualmente?: boolean
}

// ─── Alcance detallado (formato nuevo — basado en EDTs del cronograma) ───
export interface PlanAlcanceDetalladoSubItem {
  numeracion: string       // "11.5.1"
  actividadNombre: string
  descripcion: string
  actividadRefId?: string
  /** Tareas reales del cronograma de esta actividad, como viñetas (Bloque 4.2, Tarea 4) — [] en subItems de EDTs 'resumido'. */
  tareas?: PlanAlcanceDetalladoTarea[]
  /** 1 línea sugiriendo qué foto tomar en el levantamiento (Bloque 4.2, Tarea 5) — solo UI, nunca se exporta al docx. */
  fotoSugerida?: string
  /** Imágenes adjuntas (solo EDTs/subItems de fase EJECUCIÓN) — nunca generadas por IA. */
  imagenes?: PlanAlcanceImagen[]
  /** El usuario editó a mano la `descripcion` de esta actividad (Bloque 4.2 sesión 5) — ver PlanAlcanceDetalladoTarea.textoEditadoManualmente. */
  descripcionEditadaManualmente?: boolean
}

/** {cantidad, cargo} inferido de personasEstimadas del cronograma + cargos del organigrama — nunca por IA. */
export interface PlanPersonalRequerido {
  cantidad: number
  cargo: string
}

export interface PlanAlcanceImagen {
  id: string
  url: string
  caption: string
  orden: number
}

export interface PlanAlcanceDetalladoEdt {
  numeracion: string       // "11.1"
  edtNombre: string
  edtCodigo: string        // "CON", "CMN", "ING", "PLAN", etc. — derivado por regla, no por IA
  faseNombre: string       // "EJECUCIÓN"
  faseAbreviatura: string  // "EJEC"
  ubicacion?: string
  descripcion: string
  /** 'detallado' = fase EJECUCIÓN con EDT CON/CMN (máximo detalle); 'resumido' = resto (mínimo detalle). */
  tipoDetalle: 'detallado' | 'resumido'
  subItems?: PlanAlcanceDetalladoSubItem[]
  /** Solo en EDTs 'detallado' — nunca generado por IA. */
  personalRequerido?: PlanPersonalRequerido[]
  /** Imágenes adjuntas a nivel EDT (solo 'detallado') — nunca generadas por IA. */
  imagenes?: PlanAlcanceImagen[]
  edtRefId?: string
  /** El usuario editó a mano la `descripcion` de este EDT (Bloque 4.2 sesión 5) — se preserva al regenerar. */
  descripcionEditadaManualmente?: boolean
}

// ─── Alcance detallado (formato legacy — basado en servicios de cotización) ───
export interface PlanAlcanceItem {
  numero: string
  nombre: string
  descripcion: string
  ubicacion?: string
  tieneRiesgoAltura: boolean
  tieneRiesgoCaliente: boolean
  tieneRiesgoElectrico: boolean
  tieneRiesgoEspacioConfinado: boolean
  servicioCotizadoRefId?: string
  edtRefId?: string
}

// ─── EPP ───
export interface PlanEPPItem {
  nombre: string
  norma?: string
  observaciones?: string
}

export interface PlanEPP {
  basico: PlanEPPItem[]
  bioseguridad: PlanEPPItem[]
  riesgoEspecifico: PlanEPPItem[]
}

// ─── Herramientas y equipos ───
export interface PlanItemRecurso {
  nombre: string
  cantidad?: number
  unidad?: string
  observaciones?: string
}

export interface PlanHerramientasYEquipos {
  equipos: PlanItemRecurso[]
  herramientas: PlanItemRecurso[]
  materiales: PlanItemRecurso[]
}

// ─── Restricciones ───
export interface PlanRestriccion {
  texto: string
  categoria?: string
}

// ─── Personal ───
export interface PlanPersonal {
  nombre: string
  cargo: string
  empresa?: string
  siglas?: string
  cip?: string
  email?: string
  telefono?: string
  proyectoOrgNodoRefId?: string
}

// ─── Matriz RACI ───
export type PlanRaciRol = 'R' | 'A' | 'C' | 'I'

export interface PlanRaciAsignacion {
  siglas: string
  rol: PlanRaciRol
}

export interface PlanRaciFila {
  edt: string
  asignaciones: PlanRaciAsignacion[]
}

export interface PlanRaci {
  filas: PlanRaciFila[]
}

// ─── Histogramas ───
export interface PlanHistogramaFila {
  etiqueta: string
  valoresPorMes: number[]
  total: number
}

export interface PlanHistogramaFase {
  fase: string
  total: number
}

export interface PlanHistogramaHHActividadSerie {
  cargo: string
  valoresPorActividad: number[]
}

/**
 * Detalle de HH por actividad, SOLO para EDTs de Construcción/Comisionamiento
 * (§13.3) — granularidad distinta a `horasHombre` (§13.2, que es por EDT
 * completo, mes a mes): acá el eje es la actividad, no el mes, y las series
 * son por CARGO real (mismo vocabulario que `equipoTrabajo`, nunca por
 * instancia individual — el modelo de datos no distingue "Técnico 1" de
 * "Técnico 2"). Es un SUBCONJUNTO de horasHombre (solo 2 de los EDTs del
 * proyecto), no un total alternativo — misma unidad HH real que §13.2/§14,
 * nunca duración cruda (ver calcularHHPorActividadConCmn).
 */
export interface PlanHistogramaHHActividad {
  actividades: string[]
  series: PlanHistogramaHHActividadSerie[]
}

export interface PlanHistogramas {
  meses: string[]
  equipoTrabajo: PlanHistogramaFila[]
  horasHombre: PlanHistogramaFila[]
  /** HH por fase, misma fuente que totalHH — usado en el bloque de HECHOS de Etapa 2 (addendum B). */
  porFase?: PlanHistogramaFase[]
  /** Ver PlanHistogramaHHActividad — ausente/vacío si no hay EDTs de Construcción/Comisionamiento con datos. */
  hhPorActividadConCmn?: PlanHistogramaHHActividad
}

// ─── Cronograma resumen ───
export interface PlanCronogramaFila {
  fase: string
  edt: string
  actividad?: string
  fechaInicio: string
  fechaFin: string
  horasPlan: number
}

export interface PlanCronograma {
  filas: PlanCronogramaFila[]
}

// ─── Responsabilidades ───
export interface PlanResponsabilidades {
  gerenteGeneral: string[]
  supervisor: string[]
  operario: string[]
  supervisorSeguridad: string[]
}

// ─── Referencias ───
export interface PlanReferencia {
  codigoDocumento?: string
  titulo: string
  origen: 'TDR' | 'COTIZACION' | 'NORMATIVA' | 'MANUAL'
}

// ─── Sección regenerable ───
export type SeccionRegenerable =
  | 'objetivo'
  | 'alcanceGeneral'
  | 'alcanceDetallado'
  | 'eppRequeridos'
  | 'herramientasYEquipos'
  | 'restricciones'
  | 'personalAsignado'
  | 'matrizRaci'
  | 'histogramas'
  | 'cronogramaResumen'
  | 'responsabilidades'
  | 'referencias'

// ─── Bloques de completitud ───
export interface PlanBloquesCompletitud {
  objetivo: boolean
  alcanceGeneral: boolean
  alcanceDetallado: boolean
  eppRequeridos: boolean
  herramientasYEquipos: boolean
  restricciones: boolean
  personalAsignado: boolean
  matrizRaci: boolean
  histogramas: boolean
  cronogramaResumen: boolean
  responsabilidades: boolean
  referencias: boolean
}

// ============================================
// PRE-REQUISITOS
// ============================================

export interface PlanPrerrequisitos {
  // Bloqueantes (impiden generar)
  cotizacionAprobada: boolean
  organigramaCreado: boolean
  cronogramaPlanificacionExiste: boolean
  clienteCargado: boolean
  // Advertencias (no bloquean)
  matrizComunicacionCreada: boolean
  serviciosCotizados: boolean
  equiposCotizados: boolean
  // Opcionales
  tdrAnalizado: boolean
  // Computados
  puedeGenerar: boolean
  bloqueantesFaltantes: string[]
  advertencias: string[]
}

// ============================================
// RESPONSE DEL ENDPOINT /contexto
// ============================================

export interface PlanTrabajoContexto {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    descripcion: string | null
    numeroContrato: string | null
    ordenCompraCliente: string | null
    fechaFirmaContrato: Date | null
    fechaInicio: Date
    fechaFin: Date | null
    estado: string
    cliente: {
      id: string
      codigo: string
      nombre: string
      ruc: string | null
      direccion: string | null
    } | null
    gestor: { id: string; name: string | null; email: string }
    supervisor: { id: string; name: string | null; email: string } | null
    lider: { id: string; name: string | null; email: string } | null
  }

  planTrabajo: (PlanTrabajo & {
    generaciones: PlanTrabajoGeneracion[]
    imagenes: PlanTrabajoImagen[]
  }) | null

  cotizacion: {
    aprobada: boolean
    equipos: EquipoCotizadoContexto[]
    servicios: ServicioCotizadoContexto[]
    gastos: GastoCotizadoContexto[]
  }

  cronograma: {
    cronogramaSeleccionado: CronogramaContexto | null
    tipoUsado: 'planificacion' | 'comercial' | null
    advertenciaPlanificacionFaltante: boolean
  }

  organigrama: OrgNodoContexto[]
  matriz: MatrizContexto | null
  tdr: TdrContexto | null

  prerrequisitos: PlanPrerrequisitos

  iaPlanTrabajoHabilitada: boolean
}

// ─── Sub-tipos del contexto ───

export interface EquipoCotizadoContexto {
  id: string
  nombre: string
  descripcion: string | null
  subtotalInterno: number
  subtotalCliente: number
  items: {
    id: string
    codigo: string
    descripcion: string
    categoria: string
    cantidad: number
    precioInterno: number
    precioCliente: number
    costoInterno: number
    costoCliente: number
  }[]
}

export interface ServicioCotizadoContexto {
  id: string
  nombre: string
  edtId: string
  subtotalInterno: number
  subtotalCliente: number
  items: {
    id: string
    nombre: string
    edtId: string
    cantidadHoras: number
    costoHoraInterno: number
    costoHoraCliente: number
    costoInterno: number
    costoCliente: number
  }[]
}

export interface GastoCotizadoContexto {
  id: string
  nombre: string
  descripcion: string | null
  subtotalInterno: number
  subtotalCliente: number
  items: {
    id: string
    nombre: string
    cantidad: number
    precioUnitario: number
    costoInterno: number
    costoCliente: number
  }[]
}

export interface CronogramaContexto {
  id: string
  tipo: string
  nombre: string
  esBaseline: boolean
  fases: {
    id: string
    nombre: string
    orden: number
    estado: string
    edts: {
      id: string
      nombre: string
      edtId: string
      orden: number
      fechaInicioPlan: Date | null
      fechaFinPlan: Date | null
      horasPlan: number | null
      estado: string
      prioridad: string
      descripcion: string | null
      proyectoFaseId: string | null
      responsableId: string | null
      actividades: {
        id: string
        nombre: string
        orden: number
        fechaInicioPlan: Date
        fechaFinPlan: Date
        horasPlan: number | null
        estado: string
        prioridad: string
        descripcion: string | null
        tareas: {
          id: string
          nombre: string
          orden: number
          fechaInicio: Date
          fechaFin: Date
          horasEstimadas: number | null
          personasEstimadas: number
          estado: string
          prioridad: string
          /** Recurso real asignado — fuente de la dotación por cargo del histograma §13.1 (informe §13, Bug 3: `personasEstimadas` nunca se usa, es un override manual que nadie llena). `null` si la tarea no tiene recurso. */
          recurso: {
            /** Identidad real del recurso — la MISMA cuadrilla/individual citada por N tareas concurrentes del mismo mes es la MISMA gente/rol, se deduplica por esto (confirmado: en CJM49, "Cuadrilla 4P" es un único recursoId citado por 5 tareas). */
            id: string
            nombre: string
            tipo: string // enum TipoRecurso: 'individual' | 'cuadrilla'
            /** Solo relevante para tipo='cuadrilla' — perfiles activos (recursos individuales × cantidad, ver RecursoPerfil). Para 'individual' se ignora: el cargo ES `recurso.nombre` directo, nunca se resuelve un empleado (docs/analisis-composicion-recursos.md — antes esto leía RecursoComposicion/empleados, que resultó ser solo referencia de costo repetida N veces, no dotación real). */
            perfiles: {
              cantidad: number
              recursoMiembroNombre: string
            }[]
          } | null
        }[]
      }[]
    }[]
  }[]
}

export interface OrgNodoContexto {
  id: string
  parentId: string | null
  orden: number
  cargoLabel: string
  esFijoGys: boolean
  empresaOverride: string | null
  telefonoOverride: string | null
  cipOverride: string | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    empleado: { cip: string | null; telefono: string | null } | null
  } | null
}

export interface MatrizContexto {
  id: string
  version: string
  generadoConIA: boolean
  filas: {
    id: string
    orden: number
    informacion: string
    emisor: string
    receptores: string
    medio: string
    frecuencia: string
  }[]
}

export interface TdrContexto {
  id: string
  resumenTdr: string
  alcanceDetectado: string | null
  equiposIdentificados: unknown
  serviciosIdentificados: unknown
  personalRequerido: unknown
  normasAplicables: unknown
  hitosContractuales: unknown
  cronogramaEstimado: unknown
  riesgosCriticos: unknown
  bloquesCompletitud: unknown
  ubicacionDetectada: string | null
}

// Re-exports
export type { PlanTrabajo, PlanTrabajoGeneracion, PlanTrabajoImagen }
