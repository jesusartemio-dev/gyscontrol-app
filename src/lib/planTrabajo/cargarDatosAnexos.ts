import { prisma } from '@/lib/prisma'
import type { DatosGantt, FilaGantt } from './ganttDocx'
import type { NodoOrganigrama } from './organigramaDocx'
import { esEdtDeConstruccionOComisionamiento } from './raciReglas'

/**
 * Datos de los anexos del docx: el organigrama del proyecto (Anexo A) y el
 * cronograma de PLANIFICACIÓN — la Línea Base, la misma fuente que los
 * histogramas — para el Gantt del Anexo B.
 */
export interface DatosAnexos {
  organigrama: NodoOrganigrama[]
  gantt: DatosGantt | null
}

const fechaTexto = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null)

/** HH real de una tarea: horas de duración × personas del recurso (como calcularHHRealDeTarea). */
function hhTarea(t: { horasEstimadas: unknown; recurso: { tipo: string; perfiles: { cantidad: number }[] } | null }): number {
  const horas = Number(t.horasEstimadas) || 0
  if (!horas || !t.recurso) return 0
  return t.recurso.tipo === 'individual' ? horas : horas * t.recurso.perfiles.reduce((s, p) => s + p.cantidad, 0)
}

function extremos(fechas: (string | null)[]): { inicio: string | null; fin: string | null } {
  const validas = fechas.filter((f): f is string => !!f).sort()
  return { inicio: validas[0] ?? null, fin: validas[validas.length - 1] ?? null }
}

export async function cargarDatosAnexos(proyectoId: string): Promise<DatosAnexos> {
  const [nodos, cronograma] = await Promise.all([
    prisma.proyectoOrgNodo.findMany({
      where: { proyectoId },
      select: { id: true, parentId: true, orden: true, cargoLabel: true, esFijoGys: true, empresaOverride: true, user: { select: { name: true } } },
      orderBy: { orden: 'asc' },
    }),
    prisma.proyectoCronograma.findFirst({
      where: { proyectoId, tipo: 'planificacion' },
      select: {
        proyectoFase: {
          orderBy: { orden: 'asc' },
          select: {
            nombre: true,
            proyectoEdt: {
              orderBy: { orden: 'asc' },
              select: {
                nombre: true, fechaInicioPlan: true, fechaFinPlan: true,
                proyectoActividad: {
                  orderBy: { orden: 'asc' },
                  select: {
                    nombre: true, fechaInicioPlan: true, fechaFinPlan: true,
                    proyectoTarea: {
                      orderBy: { orden: 'asc' },
                      select: {
                        nombre: true, fechaInicio: true, fechaFin: true, horasEstimadas: true, esHito: true,
                        recurso: { select: { nombre: true, tipo: true, perfiles: { where: { activo: true }, select: { cantidad: true } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ])

  const organigrama: NodoOrganigrama[] = nodos.map(n => ({
    id: n.id,
    parentId: n.parentId,
    orden: n.orden,
    cargo: n.cargoLabel,
    nombre: n.user?.name ?? null,
    esFijoGys: n.esFijoGys,
    empresa: n.empresaOverride && n.empresaOverride.trim().toUpperCase() !== 'GYS' ? n.empresaOverride.trim() : null,
  }))

  if (!cronograma) return { organigrama, gantt: null }

  const general: FilaGantt[] = []
  const detalle: FilaGantt[] = []
  cronograma.proyectoFase.forEach((fase, faseIndice) => {
    const filasFase: FilaGantt[] = []
    let hhFase = 0
    for (const edt of fase.proyectoEdt) {
      const actividades = edt.proyectoActividad.map(a => {
        const tareas = a.proyectoTarea.map(t => ({
          nivel: (t.esHito ? 'hito' : 'tarea') as FilaGantt['nivel'],
          nombre: t.nombre,
          inicio: fechaTexto(t.fechaInicio),
          fin: fechaTexto(t.esHito ? t.fechaInicio : t.fechaFin),
          hh: hhTarea(t),
          recurso: t.esHito ? undefined : t.recurso?.nombre,
          faseIndice,
        }))
        const { inicio, fin } = a.fechaInicioPlan && a.fechaFinPlan
          ? { inicio: fechaTexto(a.fechaInicioPlan), fin: fechaTexto(a.fechaFinPlan) }
          : extremos(tareas.flatMap(t => [t.inicio, t.fin]))
        const hh = tareas.reduce((s, t) => s + (t.hh ?? 0), 0)
        return { fila: { nivel: 'actividad' as const, nombre: a.nombre, inicio, fin, hh, faseIndice }, tareas }
      })
      const { inicio, fin } = edt.fechaInicioPlan && edt.fechaFinPlan
        ? { inicio: fechaTexto(edt.fechaInicioPlan), fin: fechaTexto(edt.fechaFinPlan) }
        : extremos(actividades.flatMap(a => [a.fila.inicio, a.fila.fin]))
      const hhEdt = actividades.reduce((s, a) => s + a.fila.hh, 0)
      hhFase += hhEdt
      const filaEdt: FilaGantt = { nivel: 'edt', nombre: edt.nombre, inicio, fin, hh: hhEdt, faseIndice }

      filasFase.push(filaEdt)
      for (const a of actividades) {
        filasFase.push(a.fila)
        filasFase.push(...a.tareas.filter(t => t.nivel === 'hito'))
      }
      if (esEdtDeConstruccionOComisionamiento(edt.nombre)) {
        detalle.push(filaEdt)
        for (const a of actividades) detalle.push(a.fila, ...a.tareas)
      }
    }
    if (filasFase.length === 0) return
    const { inicio, fin } = extremos(filasFase.flatMap(f => [f.inicio, f.fin]))
    general.push({ nivel: 'fase', nombre: fase.nombre, inicio, fin, hh: hhFase, faseIndice }, ...filasFase)
  })

  return { organigrama, gantt: general.length > 0 ? { general, detalle } : null }
}
