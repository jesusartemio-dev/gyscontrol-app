import type { PlanTrabajo, Cliente, Proyecto } from '@prisma/client'
import type {
  PlanAlcanceDetalladoEdt,
  PlanEPP,
  PlanHerramientasYEquipos,
  PlanRestriccion,
  PlanPersonal,
  PlanRaci,
  PlanHistogramas,
  PlanCronograma,
  PlanResponsabilidades,
  PlanReferencia,
} from '@/types/planTrabajo'
import { RESPONSABILIDADES_DEFAULT, aplicarDefaults } from './defaults'

type ProyectoConCliente = Proyecto & { cliente: Cliente | null }

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  return date.toISOString().slice(0, 10)
}

function calcularSiglas(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .map(n => n[0]?.toUpperCase() ?? '')
    .slice(0, 3)
    .join('')
}

export function construirDataBag(
  plan: PlanTrabajo,
  proyecto: ProyectoConCliente,
  organigramaPngBase64: string
): Record<string, unknown> {
  const responsabilidades = aplicarDefaults(
    plan.responsabilidades as PlanResponsabilidades | null,
    RESPONSABILIDADES_DEFAULT
  )

  const personal = (plan.personalAsignado as PlanPersonal[] | null) ?? []
  const raci = (plan.matrizRaci as PlanRaci | null) ?? { filas: [] }
  const epp = (plan.eppRequeridos as PlanEPP | null) ?? { basico: [], bioseguridad: [], riesgoEspecifico: [] }
  const herramientas = (plan.herramientasYEquipos as PlanHerramientasYEquipos | null) ?? { equipos: [], herramientas: [], materiales: [] }
  const restricciones = (plan.restricciones as PlanRestriccion[] | null) ?? []
  const alcanceDetallado = (plan.alcanceDetallado as PlanAlcanceDetalladoEdt[] | null) ?? []
  const histogramas = (plan.histogramas as PlanHistogramas | null) ?? { meses: [], equipoTrabajo: [], horasHombre: [] }
  const cronograma = (plan.cronogramaResumen as PlanCronograma | null) ?? { filas: [] }
  const referencias = (plan.referencias as PlanReferencia[] | null) ?? []

  const raciFlat = raci.filas.flatMap(fila =>
    fila.asignaciones.map(a => ({ edt: fila.edt, siglas: a.siglas, rol: a.rol }))
  )

  const personalMapeado = personal.map(p => ({
    nombre: p.nombre,
    siglas: p.siglas?.trim() || calcularSiglas(p.nombre),
    empresa: p.empresa ?? '',
    cargo: p.cargo,
  }))

  return {
    // Cabecera
    clienteNombre: proyecto.cliente?.nombre ?? '',
    ordenCompraCliente: proyecto.ordenCompraCliente ?? '',
    proyectoNombre: proyecto.nombre,
    codigoDocumento: plan.codigoDocumento ?? '',
    numeroRevision: plan.numeroRevision ?? 'A',
    tipoEmision: plan.tipoEmision ?? '',
    fechaEmision: fmtDate(plan.fechaEmision ?? new Date()),
    numeroConsultor: plan.numeroConsultor ?? '',
    etapa: proyecto.estado ?? '',

    // Firmantes
    preparadoPor: plan.preparadoPor ?? '',
    preparadoCargo: plan.preparadoCargo ?? '',
    revisadoPor: plan.revisadoPor ?? '',
    revisadoCargo: plan.revisadoCargo ?? '',
    aprobadoPor: plan.aprobadoPor ?? '',
    aprobadoCargo: plan.aprobadoCargo ?? '',

    // Revisiones (V1: solo la actual)
    revisiones: [
      {
        rev: plan.numeroRevision ?? 'A',
        te: plan.tipoEmision ?? '',
        descripcion: 'Emisión inicial',
        des: plan.preparadoPor ?? '',
        ver: plan.revisadoPor ?? '',
        apr: plan.aprobadoPor ?? '',
        aut: '',
        fecha: fmtDate(plan.fechaEmision ?? new Date()),
      },
    ],

    // Secciones de texto
    objetivo: plan.objetivo ?? '',
    alcanceGeneral: plan.alcanceGeneral ?? '',

    // Responsabilidades (listas de strings → {item})
    responsabilidadesGerenteGeneral: responsabilidades.gerenteGeneral.map(t => ({ item: t })),
    responsabilidadesSupervisor: responsabilidades.supervisor.map(t => ({ item: t })),
    responsabilidadesOperario: responsabilidades.operario.map(t => ({ item: t })),
    responsabilidadesSupervisorSeguridad: responsabilidades.supervisorSeguridad.map(t => ({ item: t })),

    // Referencias
    referencias: referencias.map(r => ({
      codigoDocumento: r.codigoDocumento ?? '',
      titulo: r.titulo,
      origen: r.origen,
    })),

    // Personal
    personalAsignado: personalMapeado,

    // RACI (flatten)
    raciFlat,

    // EPP
    eppBasico: epp.basico.map(e => ({ nombre: e.nombre, norma: e.norma ?? '', observaciones: e.observaciones ?? '' })),
    eppBioseguridad: epp.bioseguridad.map(e => ({ nombre: e.nombre, norma: e.norma ?? '', observaciones: e.observaciones ?? '' })),
    eppRiesgoEspecifico: epp.riesgoEspecifico.map(e => ({ nombre: e.nombre, norma: e.norma ?? '', observaciones: e.observaciones ?? '' })),

    // Herramientas y Equipos
    equipos: herramientas.equipos.map(h => ({ nombre: h.nombre, cantidad: h.cantidad ?? '', unidad: h.unidad ?? '', observaciones: h.observaciones ?? '' })),
    herramientas: herramientas.herramientas.map(h => ({ nombre: h.nombre, cantidad: h.cantidad ?? '', unidad: h.unidad ?? '', observaciones: h.observaciones ?? '' })),
    materiales: herramientas.materiales.map(h => ({ nombre: h.nombre, cantidad: h.cantidad ?? '', unidad: h.unidad ?? '', observaciones: h.observaciones ?? '' })),

    // Restricciones
    restricciones: restricciones.map(r => ({ texto: r.texto, categoria: r.categoria ?? '' })),

    // Alcance detallado — se pasa como array aplanado para el template loop
    // y como string formateado para el placeholder {alcanceDetalladoFormateado}
    alcanceDetallado: alcanceDetallado.map(a => ({
      numero: a.numeracion,
      nombre: `${a.numeracion}. ${a.edtNombre}`,
      descripcion: a.descripcion + (
        a.subItems?.map(s => `\n      ${s.numeracion} ${s.actividadNombre}: ${s.descripcion}`).join('') ?? ''
      ),
      ubicacion: a.ubicacion ?? '',
    })),
    alcanceDetalladoFormateado: alcanceDetallado.map(a => {
      const fase = a.faseNombre || a.faseAbreviatura || ''
      const titulo = `${a.numeracion}.  ${fase ? `${fase.toUpperCase()} — ` : ''}${a.edtNombre}${a.ubicacion ? `  |  ${a.ubicacion}` : ''}`
      const cuerpo = a.descripcion
      const subs = (a.subItems ?? []).map(s =>
        `      ${s.numeracion}  ${s.actividadNombre}\n      ${s.descripcion}`
      ).join('\n\n')
      return [titulo, cuerpo, subs].filter(Boolean).join('\n')
    }).join('\n\n'),

    // Histogramas (solo etiqueta + total, V1)
    histogramaEquipoTrabajo: histogramas.equipoTrabajo.map(f => ({ etiqueta: f.etiqueta, total: f.total })),
    histogramaHorasHombre: histogramas.horasHombre.map(f => ({ etiqueta: f.etiqueta, total: f.total })),

    // Cronograma
    cronograma: cronograma.filas.map(f => ({
      fase: f.fase,
      edt: f.edt,
      actividad: f.actividad ?? '',
      fechaInicio: f.fechaInicio,
      fechaFin: f.fechaFin,
      horasPlan: f.horasPlan,
    })),

    // Imagen del organigrama (string base64 — image module lo convierte)
    imagenOrganigrama: organigramaPngBase64,
  }
}
