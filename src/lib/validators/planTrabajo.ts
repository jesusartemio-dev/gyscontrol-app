import { z } from 'zod'

// ─── Schemas para secciones JSON (usados en Fase 2 para validar output de IA) ───

// ─── Legacy (formato basado en servicios de cotización) ───
export const planAlcanceItemSchema = z.object({
  numero: z.string(),
  nombre: z.string().min(1),
  descripcion: z.string(),
  ubicacion: z.string().optional(),
  tieneRiesgoAltura: z.boolean(),
  tieneRiesgoCaliente: z.boolean(),
  tieneRiesgoElectrico: z.boolean(),
  tieneRiesgoEspacioConfinado: z.boolean(),
  servicioCotizadoRefId: z.string().optional(),
  edtRefId: z.string().optional(),
})

// ─── Nuevo formato (basado en EDTs del cronograma de planificación) ───
export const planAlcanceDetalladoSubItemSchema = z.object({
  numeracion: z.string().min(1),
  actividadNombre: z.string().min(1),
  descripcion: z.string().min(60),
  actividadRefId: z.string().optional(),
})

export const planAlcanceDetalladoEdtSchema = z.object({
  numeracion: z.string().min(1),
  edtNombre: z.string().min(1),
  edtCodigo: z.string(),
  faseNombre: z.string().min(1),
  faseAbreviatura: z.string().min(1),
  ubicacion: z.string().optional(),
  descripcion: z.string().min(60),
  subItems: z.array(planAlcanceDetalladoSubItemSchema).optional(),
  edtRefId: z.string().optional(),
})

export const planEPPItemSchema = z.object({
  nombre: z.string().min(1),
  norma: z.string().optional(),
  observaciones: z.string().optional(),
})

export const planEPPSchema = z.object({
  basico: z.array(planEPPItemSchema),
  bioseguridad: z.array(planEPPItemSchema),
  riesgoEspecifico: z.array(planEPPItemSchema),
})

export const planItemRecursoSchema = z.object({
  nombre: z.string().min(1),
  cantidad: z.number().optional(),
  unidad: z.string().optional(),
  observaciones: z.string().optional(),
})

export const planHerramientasYEquiposSchema = z.object({
  equipos: z.array(planItemRecursoSchema),
  herramientas: z.array(planItemRecursoSchema),
  materiales: z.array(planItemRecursoSchema),
})

export const planRestriccionSchema = z.object({
  texto: z.string().min(1),
  categoria: z.string().optional(),
})

export const planPersonalSchema = z.object({
  nombre: z.string().min(1),
  cargo: z.string().min(1),
  empresa: z.string().optional(),
  siglas: z.string().optional(),
  cip: z.string().optional(),
  email: z.string().optional(),
  telefono: z.string().optional(),
  proyectoOrgNodoRefId: z.string().optional(),
})

export const planRaciRolSchema = z.enum(['R', 'A', 'C', 'I'])

export const planRaciAsignacionSchema = z.object({
  siglas: z.string().min(1),
  rol: planRaciRolSchema,
})

export const planRaciFilaSchema = z.object({
  edt: z.string().min(1),
  asignaciones: z.array(planRaciAsignacionSchema),
})

export const planRaciSchema = z.object({
  filas: z.array(planRaciFilaSchema),
})

export const planHistogramaFilaSchema = z.object({
  etiqueta: z.string().min(1),
  valoresPorMes: z.array(z.number()),
  total: z.number(),
})

export const planHistogramaFaseSchema = z.object({
  fase: z.string().min(1),
  total: z.number(),
})

export const planHistogramasSchema = z.object({
  meses: z.array(z.string()),
  equipoTrabajo: z.array(planHistogramaFilaSchema),
  horasHombre: z.array(planHistogramaFilaSchema),
  porFase: z.array(planHistogramaFaseSchema).optional(),
})

export const planCronogramaFilaSchema = z.object({
  fase: z.string().min(1),
  edt: z.string().min(1),
  actividad: z.string().optional(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  horasPlan: z.number(),
})

export const planCronogramaSchema = z.object({
  filas: z.array(planCronogramaFilaSchema),
})

export const planResponsabilidadesSchema = z.object({
  gerenteGeneral: z.array(z.string()),
  supervisor: z.array(z.string()),
  operario: z.array(z.string()),
  supervisorSeguridad: z.array(z.string()),
})

export const planReferenciaSchema = z.object({
  codigoDocumento: z.string().optional(),
  titulo: z.string().min(1),
  origen: z.enum(['TDR', 'COTIZACION', 'NORMATIVA', 'MANUAL']).catch('NORMATIVA'),
})

// ─── Schema de actualización de cabecera y toggles (PATCH) ───

export const planTrabajoUpdateSchema = z.object({
  codigoDocumento: z.string().max(100).nullish(),
  numeroRevision: z.string().max(20).optional(),
  tipoEmision: z.string().max(100).nullish(),
  fechaEmision: z.coerce.date().nullish(),
  numeroConsultor: z.string().max(100).nullish(),

  preparadoPor: z.string().max(200).nullish(),
  preparadoCargo: z.string().max(200).nullish(),
  revisadoPor: z.string().max(200).nullish(),
  revisadoCargo: z.string().max(200).nullish(),
  aprobadoPor: z.string().max(200).nullish(),
  aprobadoCargo: z.string().max(200).nullish(),

  objetivo: z.string().max(20000).nullish(),
  alcanceGeneral: z.string().max(20000).nullish(),

  incluirOrganigrama: z.boolean().optional(),
  incluirMatriz: z.boolean().optional(),
  incluirCronograma: z.boolean().optional(),
  incluirHistogramas: z.boolean().optional(),
  incluirTDR: z.boolean().optional(),
})

// ─── Schema de actualización de secciones JSON estructuradas ───

export const planTrabajoPatchSeccionSchema = z.object({
  alcanceDetallado: z.array(planAlcanceDetalladoEdtSchema).nullish(),
  eppRequeridos: planEPPSchema.nullish(),
  herramientasYEquipos: planHerramientasYEquiposSchema.nullish(),
  restricciones: z.array(planRestriccionSchema).nullish(),
  personalAsignado: z.array(planPersonalSchema).nullish(),
  matrizRaci: planRaciSchema.nullish(),
  histogramas: planHistogramasSchema.nullish(),
  cronogramaResumen: planCronogramaSchema.nullish(),
  responsabilidades: planResponsabilidadesSchema.nullish(),
  referencias: z.array(planReferenciaSchema).nullish(),
})

// Schema combinado para PATCH (cabecera + secciones estructuradas)
export const planTrabajoPatchSchema = planTrabajoUpdateSchema.merge(planTrabajoPatchSeccionSchema)

export type PlanTrabajoUpdateInput = z.infer<typeof planTrabajoUpdateSchema>
export type PlanTrabajoPatchInput = z.infer<typeof planTrabajoPatchSchema>
