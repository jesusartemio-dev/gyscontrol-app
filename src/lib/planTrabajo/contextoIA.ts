import type { PlanTrabajoContexto, OrgNodoContexto, SeccionRegenerable } from '@/types/planTrabajo'
import type { PlanTrabajo } from '@prisma/client'

/**
 * Construye la directiva JSON del cronograma (Fase → EDT → Actividad → Tarea)
 * para inyectarla en el prompt de alcanceDetallado.
 * Usada tanto en generar-ia como en regenerar-seccion.
 */
export function buildDirectivaCronograma(
  cron: NonNullable<PlanTrabajoContexto['cronograma']['cronogramaSeleccionado']>
): string {
  const estructura = cron.fases.map(f => ({
    faseNombre: f.nombre,
    edts: f.edts.map(e => ({
      edtId: e.id,
      edtNombre: e.nombre,
      actividades: e.actividades.map(a => ({
        actividadNombre: a.nombre,
        tareas: a.tareas.map(t => t.nombre),
      })),
    })),
  }))
  return (
    '\n\nESTRUCTURA COMPLETA DEL CRONOGRAMA (Fase → EDT → Actividad → Tarea):\n' +
    'Usá esta información como base técnica para construir el alcanceDetallado.\n' +
    'NO tenés que crear una entrada por cada EDT ni listar cada actividad por separado.\n' +
    'Podés agrupar actividades similares o repetitivas en un solo subItem con sus códigos.\n\n' +
    JSON.stringify(estructura, null, 2)
  )
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '(sin fecha)'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '(fecha inválida)'
  return date.toISOString().slice(0, 10)
}

/**
 * Serializa el PlanTrabajoContexto a un string legible para pasarle a la IA.
 * Usa solo campos que existen en el tipo — no accede a campos ausentes del select.
 */
export function serializarContextoParaIA(contexto: PlanTrabajoContexto): string {
  const partes: string[] = []

  // ─── Proyecto ───
  partes.push('# DATOS DEL CLIENTE Y PROYECTO')
  partes.push(`- Cliente: ${contexto.proyecto.cliente?.nombre ?? 'N/A'}`)
  partes.push(`- RUC: ${contexto.proyecto.cliente?.ruc ?? 'N/A'}`)
  const ubicacion = contexto.proyecto.cliente?.direccion?.trim() || contexto.tdr?.ubicacionDetectada?.trim() || null
  partes.push(`- UBICACIÓN DEL PROYECTO: ${ubicacion ?? 'N/A — no inventes una ubicación, dejá el campo vacío si se pide'}`)
  partes.push(`- Código del proyecto: ${contexto.proyecto.codigo}`)
  partes.push(`- Nombre: ${contexto.proyecto.nombre}`)
  partes.push(`- Descripción: ${contexto.proyecto.descripcion ?? 'N/A'}`)
  partes.push(`- Orden de compra: ${contexto.proyecto.ordenCompraCliente ?? 'N/A'}`)
  partes.push(`- N° Contrato: ${contexto.proyecto.numeroContrato ?? 'N/A'}`)
  partes.push(`- Fecha inicio: ${fmtDate(contexto.proyecto.fechaInicio)}`)
  partes.push(`- Fecha fin: ${fmtDate(contexto.proyecto.fechaFin)}`)
  partes.push(`- Gestor: ${contexto.proyecto.gestor.name ?? contexto.proyecto.gestor.email}`)
  partes.push(`- Supervisor: ${contexto.proyecto.supervisor?.name ?? 'N/A'}`)
  partes.push(`- Líder: ${contexto.proyecto.lider?.name ?? 'N/A'}`)
  partes.push('')

  // ─── Servicios cotizados ───
  // IMPORTANTE para la IA: los IDs en formato [id=...] deben copiarse a los campos refId del schema.
  partes.push('# COTIZACIÓN — SERVICIOS')
  if (contexto.cotizacion.servicios.length > 0) {
    for (const servicio of contexto.cotizacion.servicios) {
      partes.push(`- GRUPO DE SERVICIO [id=${servicio.id}]: ${servicio.nombre}`)
      for (const item of servicio.items) {
        partes.push(`  ITEM DE SERVICIO [id=${item.id}]: ${item.nombre} — ${Number(item.cantidadHoras) || 0}h`)
      }
    }
  } else {
    partes.push('(Sin servicios cotizados)')
  }
  partes.push('')

  // ─── Equipos cotizados ───
  partes.push('# COTIZACIÓN — EQUIPOS')
  if (contexto.cotizacion.equipos.length > 0) {
    for (const grupo of contexto.cotizacion.equipos) {
      partes.push(`Grupo: ${grupo.nombre}`)
      for (const item of grupo.items) {
        partes.push(`  · ${item.codigo} — ${item.descripcion} — Categoría: ${item.categoria} — Cantidad: ${item.cantidad}`)
      }
    }
  } else {
    partes.push('(Sin equipos cotizados)')
  }
  partes.push('')

  // ─── Gastos cotizados ───
  partes.push('# COTIZACIÓN — GASTOS')
  if (contexto.cotizacion.gastos.length > 0) {
    for (const grupo of contexto.cotizacion.gastos) {
      partes.push(`Grupo: ${grupo.nombre}`)
      for (const item of grupo.items) {
        partes.push(`  · ${item.nombre} — Cantidad: ${item.cantidad}`)
      }
    }
  } else {
    partes.push('(Sin gastos cotizados)')
  }
  partes.push('')

  // ─── Cronograma ───
  // IMPORTANTE para la IA: usá las fechas EXACTAS indicadas aquí para cronogramaResumen e histogramas.
  partes.push('# CRONOGRAMA DE PLANIFICACIÓN')
  const cron = contexto.cronograma.cronogramaSeleccionado
  if (cron) {
    for (const fase of cron.fases) {
      partes.push(`Fase: ${fase.nombre} (estado: ${fase.estado})`)
      for (const edt of fase.edts) {
        partes.push(`  EDT [id=${edt.id}]: ${edt.nombre}`)
        partes.push(`    Fechas planificadas: ${fmtDate(edt.fechaInicioPlan)} → ${fmtDate(edt.fechaFinPlan)}`)
        partes.push(`    Horas planificadas: ${edt.horasPlan ?? 0}`)
        for (const act of edt.actividades) {
          partes.push(`    Actividad [id=${act.id}]: ${act.nombre}`)
          partes.push(`      Fechas: ${fmtDate(act.fechaInicioPlan)} → ${fmtDate(act.fechaFinPlan)}  Horas: ${act.horasPlan ?? 0}`)
          for (const tarea of act.tareas) {
            partes.push(`      Tarea: ${tarea.nombre}  ${fmtDate(tarea.fechaInicio)} → ${fmtDate(tarea.fechaFin)}  ${tarea.horasEstimadas ?? 0}h × ${tarea.personasEstimadas} persona(s)`)
          }
        }
      }
    }
  } else {
    partes.push('(Sin cronograma de planificación)')
  }
  partes.push('')

  // ─── Organigrama ───
  // IMPORTANTE para la IA: los IDs en formato [id=...] deben copiarse a proyectoOrgNodoRefId.
  partes.push('# ORGANIGRAMA DEL PROYECTO')
  if (contexto.organigrama.length > 0) {
    const imprimirNodo = (nodo: OrgNodoContexto, nivel: number): void => {
      const indent = '  '.repeat(nivel)
      const persona = nodo.user ? ` — ${nodo.user.name ?? nodo.user.email}` : ' — (sin asignar)'
      const cip = nodo.cipOverride ?? nodo.user?.empleado?.cip
      const tel = nodo.telefonoOverride ?? nodo.user?.empleado?.telefono
      const extras = [
        cip ? `CIP: ${cip}` : null,
        tel ? `Tel: ${tel}` : null,
        nodo.user?.email ? `Email: ${nodo.user.email}` : null,
      ].filter(Boolean).join(', ')
      partes.push(`${indent}NODO [id=${nodo.id}]: ${nodo.cargoLabel}${persona}${extras ? ` (${extras})` : ''}`)
      const hijos = contexto.organigrama.filter(n => n.parentId === nodo.id)
      for (const hijo of hijos) imprimirNodo(hijo, nivel + 1)
    }
    const raices = contexto.organigrama.filter(n => !n.parentId)
    for (const raiz of raices) imprimirNodo(raiz, 0)
  } else {
    partes.push('(Sin organigrama creado)')
  }
  partes.push('')

  // ─── Matriz de comunicaciones ───
  partes.push('# MATRIZ DE COMUNICACIONES')
  if (contexto.matriz?.filas?.length) {
    for (const fila of contexto.matriz.filas) {
      partes.push(
        `- Info: ${fila.informacion} | Emisor: ${fila.emisor} | Receptores: ${fila.receptores} | Medio: ${fila.medio} | Frecuencia: ${fila.frecuencia}`
      )
    }
  } else {
    partes.push('(Sin matriz de comunicaciones)')
  }
  partes.push('')

  // ─── TDR ───
  partes.push('# TDR (si existe)')
  if (contexto.tdr) {
    partes.push(`Resumen: ${contexto.tdr.resumenTdr}`)
    if (contexto.tdr.alcanceDetectado) {
      partes.push(`Alcance detectado: ${contexto.tdr.alcanceDetectado}`)
    }
    if (contexto.tdr.equiposIdentificados) {
      partes.push('Equipos identificados:')
      partes.push(JSON.stringify(contexto.tdr.equiposIdentificados, null, 2))
    }
    if (contexto.tdr.normasAplicables) {
      partes.push('Normas aplicables:')
      partes.push(JSON.stringify(contexto.tdr.normasAplicables, null, 2))
    }
    if (contexto.tdr.riesgosCriticos) {
      partes.push('Riesgos críticos:')
      partes.push(JSON.stringify(contexto.tdr.riesgosCriticos, null, 2))
    }
    if (contexto.tdr.hitosContractuales) {
      partes.push('Hitos contractuales:')
      partes.push(JSON.stringify(contexto.tdr.hitosContractuales, null, 2))
    }
  } else {
    partes.push('(Sin TDR analizado)')
  }
  partes.push('')

  // ─── Resumen numérico (para que la IA NO tenga que calcular) ───
  const todasLasEdts = cron ? cron.fases.flatMap(f => f.edts) : []
  const todasLasTareas = todasLasEdts.flatMap(e => e.actividades).flatMap(a => a.tareas)

  const totalHorasCotizadas = contexto.cotizacion.servicios
    .flatMap(s => s.items)
    .reduce((sum, item) => sum + (Number(item.cantidadHoras) || 0), 0)

  const totalHorasEdts = todasLasEdts.reduce((sum, e) => sum + (e.horasPlan ?? 0), 0)

  const totalHorasTareas = todasLasTareas.reduce(
    (sum, t) => sum + (Number(t.horasEstimadas) || 0), 0
  )
  const totalHH = todasLasTareas.reduce(
    (sum, t) => sum + ((Number(t.horasEstimadas) || 0) * (t.personasEstimadas || 1)), 0
  )

  const fechasEdts = todasLasEdts
    .flatMap(e => [e.fechaInicioPlan, e.fechaFinPlan])
    .filter((d): d is Date => d != null)
  const tsEdts = fechasEdts.map(d => new Date(d).getTime()).filter(t => !isNaN(t))
  const minFechaEdts = tsEdts.length ? fmtDate(new Date(Math.min(...tsEdts))) : '(sin datos)'
  const maxFechaEdts = tsEdts.length ? fmtDate(new Date(Math.max(...tsEdts))) : '(sin datos)'
  const diasCronograma = tsEdts.length >= 2
    ? Math.ceil((Math.max(...tsEdts) - Math.min(...tsEdts)) / 86400000)
    : 0

  const tsInicio = contexto.proyecto.fechaInicio
    ? new Date(contexto.proyecto.fechaInicio).getTime()
    : null
  const tsFin = contexto.proyecto.fechaFin
    ? new Date(contexto.proyecto.fechaFin).getTime()
    : null
  const diasProyecto = tsInicio && tsFin ? Math.ceil((tsFin - tsInicio) / 86400000) : 0

  partes.push('# RESUMEN NUMÉRICO PARA HISTOGRAMAS Y CRONOGRAMA')
  partes.push(`- Total horas cotizadas (servicios): ${totalHorasCotizadas} horas`)
  partes.push(`- Total horas planificadas (suma horasPlan en EDTs): ${totalHorasEdts} horas`)
  partes.push(`- Total horas en tareas (suma horasEstimadas): ${totalHorasTareas} horas`)
  partes.push(`- Total HH (horas × personas en tareas): ${totalHH} HH`)
  partes.push(`- Rango de fechas del cronograma (EDTs): ${minFechaEdts} a ${maxFechaEdts} (${diasCronograma} días)`)
  partes.push(`- Rango de fechas del proyecto: ${fmtDate(contexto.proyecto.fechaInicio)} a ${fmtDate(contexto.proyecto.fechaFin)} (${diasProyecto} días)`)

  return partes.join('\n')
}

/**
 * Define qué secciones del plan actual deben pasarse como contexto
 * al regenerar una sección específica.
 * Si el array está vacío, la sección se regenera solo con el contexto del proyecto.
 */
export const SECCIONES_RELEVANTES_POR_SECCION: Record<SeccionRegenerable, SeccionRegenerable[]> = {
  objetivo: [],
  alcanceGeneral: [],
  alcanceDetallado: [],
  eppRequeridos: ['alcanceDetallado'],
  restricciones: ['alcanceDetallado'],
  herramientasYEquipos: ['alcanceDetallado'],
  personalAsignado: [],
  matrizRaci: ['personalAsignado', 'cronogramaResumen'],
  histogramas: [],
  cronogramaResumen: [],
  responsabilidades: [],
  referencias: ['alcanceDetallado'],
}

/**
 * Serializa solo las secciones del plan actual relevantes para regenerar
 * la sección indicada. Usa representaciones compactas para reducir tokens.
 */
export function serializarEstadoActualPlan(
  plan: PlanTrabajo,
  seccionRegenerar: SeccionRegenerable
): string {
  const seccionesRelevantes = SECCIONES_RELEVANTES_POR_SECCION[seccionRegenerar]

  if (seccionesRelevantes.length === 0) {
    return '(No requiere contexto adicional del plan actual)'
  }

  const partes: string[] = [
    'Las siguientes secciones del Plan ya están definidas. Mantené coherencia con ellas al regenerar.',
    '',
  ]

  const raw = plan as unknown as Record<string, unknown>

  for (const seccion of seccionesRelevantes) {
    const valor = raw[seccion]
    if (valor === null || valor === undefined) continue

    partes.push(`### ${seccion.toUpperCase()}`)

    if (typeof valor === 'string') {
      partes.push(valor)
      partes.push('')
      continue
    }

    if (seccion === 'personalAsignado' && Array.isArray(valor)) {
      for (const p of valor as Array<Record<string, unknown>>) {
        partes.push(`- ${String(p.nombre)} (${String(p.cargo)}) → siglas: ${String(p.siglas ?? '?')}`)
      }
      partes.push('')
      continue
    }

    if (seccion === 'alcanceDetallado' && Array.isArray(valor)) {
      for (const a of valor as Array<Record<string, unknown>>) {
        // Nuevo formato (basado en EDTs)
        if (a.edtNombre !== undefined) {
          partes.push(`- ${String(a.numeracion)} [${String(a.faseAbreviatura)}] ${String(a.edtNombre)}`)
          if (Array.isArray(a.subItems)) {
            for (const s of a.subItems as Array<Record<string, unknown>>) {
              partes.push(`  · ${String(s.numeracion)} ${String(s.actividadNombre)}`)
            }
          }
        } else {
          // Formato legacy (basado en servicios de cotización)
          partes.push(`- ${String(a.numero)} ${String(a.nombre)}`)
        }
      }
      partes.push('')
      continue
    }

    if (seccion === 'cronogramaResumen') {
      const cron = valor as Record<string, unknown>
      const filas = cron.filas as Array<Record<string, unknown>> | undefined
      if (filas) {
        for (const f of filas) {
          partes.push(
            `- ${String(f.fase)} | ${String(f.edt)}${f.actividad ? ` / ${String(f.actividad)}` : ''} | ${String(f.fechaInicio)} a ${String(f.fechaFin)} | ${String(f.horasPlan)}h`
          )
        }
        partes.push('')
      }
      continue
    }

    partes.push(JSON.stringify(valor, null, 2))
    partes.push('')
  }

  return partes.join('\n')
}
