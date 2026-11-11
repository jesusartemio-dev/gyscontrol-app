import type { CronogramaContexto, PlanAlcanceDetalladoEdt, PlanTrabajoContexto } from '@/types/planTrabajo'

/**
 * "Copiar para IA" del Alcance Detallado: arma un bloque de texto con todo el
 * contexto de un EDT (proyecto, fase, EDT, actividades y tareas del cronograma
 * con fechas/horas/responsable, y el texto actual del plan) y al final pide
 * SOLO el texto que se está editando, para pegarlo de vuelta tal cual.
 *
 * Los datos del cronograma son los del momento (el contexto del plan), no la
 * copia guardada cuando se generó el plan.
 */

type Fase = NonNullable<CronogramaContexto>['fases'][number]
export type EdtCronograma = Fase['edts'][number]

/** Qué texto se va a trabajar con la IA. */
export type ObjetivoIa =
  | { tipo: 'edt' }
  | { tipo: 'actividad'; si: number }
  | { tipo: 'tarea'; si: number; ti: number }

export function buscarEdtEnCronograma(
  contexto: PlanTrabajoContexto | null | undefined,
  edtRefId: string | undefined,
): { fase: Fase; edt: EdtCronograma } | null {
  const cron = contexto?.cronograma?.cronogramaSeleccionado
  if (!cron || !edtRefId) return null
  for (const fase of cron.fases) {
    const edt = fase.edts.find(e => e.id === edtRefId)
    if (edt) return { fase, edt }
  }
  return null
}

/** id de usuario → nombre, con lo que trae el contexto (organigrama y cabezas del proyecto). */
export function mapaNombres(contexto: PlanTrabajoContexto | null | undefined): Map<string, string> {
  const m = new Map<string, string>()
  if (!contexto) return m
  const p = contexto.proyecto
  for (const u of [p.gestor, p.supervisor, p.lider]) if (u?.id && u.name) m.set(u.id, u.name)
  for (const n of contexto.organigrama ?? []) if (n.user?.id && n.user.name) m.set(n.user.id, n.user.name)
  return m
}

/** "Jesús Artemio Pérez" → "J. Pérez". */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  if (partes.length < 2) return nombre.trim()
  return `${partes[0][0]}. ${partes[partes.length > 3 ? partes.length - 2 : partes.length - 1]}`
}

/** Fecha corta "05-ene-26". Acepta Date o el string ISO del JSON. */
export function fechaCorta(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const f = new Date(d)
  if (Number.isNaN(f.getTime())) return '—'
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  // UTC: el cronograma guarda la "hora de obra" en UTC.
  return `${String(f.getUTCDate()).padStart(2, '0')}-${meses[f.getUTCMonth()]}-${String(f.getUTCFullYear()).slice(2)}`
}

export function horasTxt(h: number | null | undefined): string {
  if (h == null) return ''
  return `${Math.round(h * 10) / 10} h`
}

/** Resumen de un EDT del cronograma: conteos, rango de fechas y horas. */
export function resumenEdt(edt: EdtCronograma) {
  const tareas = edt.actividades.flatMap(a => a.tareas)
  const inicios = [edt.fechaInicioPlan, ...edt.actividades.map(a => a.fechaInicioPlan), ...tareas.map(t => t.fechaInicio)]
    .filter(Boolean).map(d => new Date(d as Date).getTime()).filter(n => !Number.isNaN(n))
  const fines = [edt.fechaFinPlan, ...edt.actividades.map(a => a.fechaFinPlan), ...tareas.map(t => t.fechaFin)]
    .filter(Boolean).map(d => new Date(d as Date).getTime()).filter(n => !Number.isNaN(n))
  const horas = edt.horasPlan ?? tareas.reduce((s, t) => s + (t.horasEstimadas ?? 0), 0)
  return {
    actividades: edt.actividades.length,
    tareas: tareas.length,
    inicio: inicios.length ? new Date(Math.min(...inicios)) : null,
    fin: fines.length ? new Date(Math.max(...fines)) : null,
    horas,
  }
}

const ordenar = <T extends { orden: number }>(xs: T[]) => [...xs].sort((a, b) => a.orden - b.orden)

export function construirTextoParaIa({
  contexto, item, objetivo,
}: {
  contexto: PlanTrabajoContexto | null | undefined
  /** El EDT del plan tal como está en el editor (con lo que se esté escribiendo). */
  item: PlanAlcanceDetalladoEdt
  objetivo: ObjetivoIa
}): string {
  const L: string[] = []
  const p = contexto?.proyecto
  const nombres = mapaNombres(contexto)
  const enCron = buscarEdtEnCronograma(contexto, item.edtRefId)
  const sub = objetivo.tipo !== 'edt' ? item.subItems?.[objetivo.si] : undefined
  const tareaPlan = objetivo.tipo === 'tarea' ? sub?.tareas?.[objetivo.ti] : undefined

  // El chat donde se pega ya conoce el proyecto (TDR, contrato, cliente):
  // solo se nombra el código para ubicarse, sin repetir sus datos.
  L.push(`PLAN DE TRABAJO${p ? ` ${p.codigo}` : ''} — texto a redactar`)
  L.push(`FASE: ${enCron?.fase.nombre ?? item.faseNombre}`)
  const r = enCron ? resumenEdt(enCron.edt) : null
  const codigo = enCron?.edt.codigoEdt || item.edtCodigo
  L.push(
    `EDT: ${item.numeracion} ${item.edtNombre}${codigo ? ` (${codigo})` : ''}` +
    (r ? ` · ${fechaCorta(r.inicio)} → ${fechaCorta(r.fin)}${r.horas ? ` · ${horasTxt(r.horas)}` : ''}` : ''),
  )
  if (item.ubicacion) L.push(`UBICACIÓN: ${item.ubicacion}`)
  L.push(`NIVEL DE DETALLE EN EL PLAN: ${item.tipoDetalle === 'detallado' ? 'detallado (ejecución en campo)' : 'resumido'}`)

  // Cronograma real
  L.push('')
  if (enCron && enCron.edt.actividades.length > 0) {
    L.push('ACTIVIDADES Y TAREAS DEL CRONOGRAMA:')
    for (const a of ordenar(enCron.edt.actividades)) {
      const marcaAct = sub?.actividadRefId === a.id ? '  ◀ ESTA ACTIVIDAD' : ''
      L.push(`- ${a.nombre.trim()} (${fechaCorta(a.fechaInicioPlan)} → ${fechaCorta(a.fechaFinPlan)}${a.horasPlan ? `, ${horasTxt(a.horasPlan)}` : ''})${marcaAct}`)
      for (const t of ordenar(a.tareas)) {
        const det = [
          `${fechaCorta(t.fechaInicio)} → ${fechaCorta(t.fechaFin)}`,
          horasTxt(t.horasEstimadas),
          t.personasEstimadas > 0 ? `${t.personasEstimadas} pers.` : '',
          t.recurso?.nombre ? `recurso: ${t.recurso.nombre}` : '',
          t.responsableId && nombres.get(t.responsableId) ? `resp. ${nombreCorto(nombres.get(t.responsableId)!)}` : '',
        ].filter(Boolean).join(', ')
        const marcaT = tareaPlan?.tareaRefId === t.id ? '  ◀ ESTA TAREA' : ''
        L.push(`    · ${t.nombre.trim()} — ${det}${marcaT}`)
      }
    }
  } else {
    L.push('ACTIVIDADES Y TAREAS DEL CRONOGRAMA: (no se encontró este EDT en el cronograma)')
  }

  // Texto actual del plan
  L.push('')
  L.push('TEXTO ACTUAL DEL PLAN:')
  L.push(`Descripción del EDT: ${item.descripcion?.trim() || '(vacío)'}`)
  for (const s of item.subItems ?? []) {
    L.push(`- Actividad ${s.numeracion} ${s.actividadNombre}: ${s.descripcion?.trim() || '(vacío)'}`)
    for (const t of (s.tareas ?? []).filter(t => !t.excluida)) {
      L.push(`    · ${t.texto?.trim() || t.nombre}`)
    }
  }

  // Lo que se pide
  L.push('')
  if (objetivo.tipo === 'edt') {
    L.push(`PIDO: redacta la descripción narrativa del EDT "${item.edtNombre}". ` +
      (item.tipoDetalle === 'detallado'
        ? 'Nivel detallado: 80-150 palabras describiendo el flujo de trabajo.'
        : 'Mantén el nivel resumido: un párrafo breve (2 a 4 oraciones).'))
  } else if (objetivo.tipo === 'actividad') {
    L.push(`PIDO: redacta la descripción narrativa de la actividad "${sub?.actividadNombre ?? ''}" ` +
      '(40-100 palabras), sin repetir la descripción del EDT.')
  } else {
    L.push(`PIDO: redacta la viñeta de la tarea "${tareaPlan?.nombre ?? ''}": una sola línea (máx. 25 palabras), ` +
      'empezando con un verbo en infinitivo o sustantivo de acción, sin guion ni numeración.')
  }
  L.push('CRITERIOS:')
  L.push('- Puedes incorporar aspectos técnicos pertinentes del TDR y del alcance contractual que ya conoces de este proyecto.')
  L.push('- Distingue siempre las actividades programadas (las del cronograma de arriba) de las obligaciones generales del proyecto (normas, requisitos del cliente, condiciones del contrato).')
  L.push('- No agregues actividades, entregables, plazos, recursos ni compromisos que no estén en el cronograma o en el contrato: el texto no debe generar obligaciones adicionales para GYS.')
  L.push(`- Español técnico y formal, sin títulos${objetivo.tipo === 'tarea' ? '' : ' ni viñetas'}. Responde únicamente con ${objetivo.tipo === 'tarea' ? 'esa línea' : 'el párrafo'}, para pegarlo tal cual.`)
  return L.join('\n')
}
