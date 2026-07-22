import { normalizeStr } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { obtenerAlcanceParaContexto } from '@/lib/planTrabajo/obtenerAlcanceParaContexto'
import { obtenerIpercParaContexto } from '@/lib/iperc/obtenerIpercParaContexto'
import { obtenerMppParaContexto } from '@/lib/mpp/obtenerMppParaContexto'
import type { IpercFila, Pets } from '@prisma/client'

// ─── Tipos exportados ────────────────────────────────────────────────────────

export type ActividadIpercAgrupada = {
  actividadKey: string
  tareas: string[]
  peligros: Array<{
    factorRiesgo: string
    peligro: string
    riesgo: string
    consecuencia: string
  }>
  controlesIngenieria: string[]
  controlesAdministrativos: string[]
  controlesReceptor: string[]
  puestos: string[]
}

export type ReferenciaCliente = {
  codigo: string
  descripcion: string
}

export type ContextoPets = {
  proyecto: {
    id: string
    nombre: string
    codigo: string
    unidad: string | null
    cliente: { nombre: string } | null
  }
  pets: Pets
  plan: {
    objetivo: string | null
    alcanceGeneral: string | null
    /** Alcance rico del Plan de Trabajo — V2 revisado si existe, si no el `alcanceDetallado` estructurado. Ver obtenerAlcanceParaContexto.ts. '' si no hay nada. */
    alcanceDetalladoTexto: string
  } | null
  iperc: {
    codigoDocumento: string
    actividadesAgrupadas: ActividadIpercAgrupada[]
    referenciasCliente: ReferenciaCliente[]
    /** Matriz IPERC V2 revisada (CSV) si hay una versión subida vigente — ver obtenerIpercParaContexto.ts. '' si no hay. */
    revisadoTexto: string
  } | null
  mpp: {
    codigoDocumento: string
    eppPorCategoria: {
      basico: string[]
      bioseguridad: string[]
      especifico: string[]
    }
    puestos: string[]
    /** MPP V2 revisada (CSV) si hay una versión subida vigente — ver obtenerMppParaContexto.ts. '' si no hay. */
    revisadoTexto: string
  } | null
}

// ─── Helpers privados ────────────────────────────────────────────────────────

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>()
  return arr.filter(s => {
    const k = normalizeStr(s)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function splitControles(texto: string): string[] {
  return texto
    .split(/\.\s+|\n+|;\s*/)
    .map(s => s.trim())
    .filter(s => s.length >= 4)
}

function dedupePeligros(
  arr: ActividadIpercAgrupada['peligros']
): ActividadIpercAgrupada['peligros'] {
  const seen = new Set<string>()
  return arr.filter(p => {
    const k = `${p.peligro.toLowerCase()}|${p.riesgo.toLowerCase()}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function numeroActividad(key: string): number[] {
  const m = key.match(/(\d+(?:\.\d+)*)/)
  if (!m) return [Infinity]
  return m[1].split('.').map(Number)
}

function compareDecimal(a: string, b: string): number {
  const na = numeroActividad(a)
  const nb = numeroActividad(b)
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const ai = na[i] ?? 0
    const bi = nb[i] ?? 0
    if (ai !== bi) return ai - bi
  }
  return 0
}

function agruparPorActividad(filas: IpercFila[]): ActividadIpercAgrupada[] {
  const map = new Map<string, ActividadIpercAgrupada>()

  for (const fila of filas) {
    const key = fila.actividad
    if (!map.has(key)) {
      map.set(key, {
        actividadKey: key,
        tareas: [],
        peligros: [],
        controlesIngenieria: [],
        controlesAdministrativos: [],
        controlesReceptor: [],
        puestos: [],
      })
    }
    const grupo = map.get(key)!

    if (fila.tarea && !grupo.tareas.includes(fila.tarea)) {
      grupo.tareas.push(fila.tarea)
    }

    grupo.peligros.push({
      factorRiesgo: fila.factorRiesgo,
      peligro: fila.peligro,
      riesgo: fila.riesgo,
      consecuencia: fila.consecuencia,
    })

    splitControles(fila.controlIngenieria).forEach(c => grupo.controlesIngenieria.push(c))
    splitControles(fila.controlAdministrativo).forEach(c => grupo.controlesAdministrativos.push(c))
    splitControles(fila.controlReceptor).forEach(c => grupo.controlesReceptor.push(c))

    if (fila.puestoTrabajo && !grupo.puestos.includes(fila.puestoTrabajo)) {
      grupo.puestos.push(fila.puestoTrabajo)
    }
  }

  return Array.from(map.values())
    .map(g => ({
      ...g,
      peligros: dedupePeligros(g.peligros),
      controlesIngenieria: dedupe(g.controlesIngenieria),
      controlesAdministrativos: dedupe(g.controlesAdministrativos),
      controlesReceptor: dedupe(g.controlesReceptor),
    }))
    .sort((a, b) => compareDecimal(a.actividadKey, b.actividadKey))
}

const REGEX_REFERENCIA = /\b([A-Z]{2,5}(?:-[A-Za-z0-9]{2,8}){2,6})\b/g

function extraerReferenciasCliente(filas: IpercFila[]): ReferenciaCliente[] {
  const seen = new Map<string, string>()

  for (const fila of filas) {
    const texto = fila.controlAdministrativo + ' ' + fila.controlIngenieria
    REGEX_REFERENCIA.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = REGEX_REFERENCIA.exec(texto)) !== null) {
      const codigo = match[1]
      if (!seen.has(codigo)) {
        const start = Math.max(0, match.index - 60)
        const desc = texto.slice(start, match.index).trim().replace(/[,;:\s]+$/, '')
        seen.set(codigo, desc)
      }
    }
  }

  return Array.from(seen.entries()).map(([codigo, descripcion]) => ({ codigo, descripcion }))
}

interface MppItemForCategoria {
  mppEppCatalogo: { nombre: string } | null
  asignaciones: unknown
}

function categorizarEpp(item: MppItemForCategoria): 'basico' | 'bioseguridad' | 'especifico' {
  const nombre = item.mppEppCatalogo?.nombre ?? ''
  if (/mascarilla|alcohol gel|n95|kn95/i.test(nombre)) return 'bioseguridad'
  if (/arnés|arnes|tyvek|respirador|ignífuga|careta/i.test(nombre)) return 'especifico'
  return 'basico'
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function cargarContextoPets(proyectoId: string): Promise<ContextoPets | null> {
  const [proyecto, pets, plan, iperc, mpp, alcanceDetalladoTexto, ipercRevisadoTexto, mppRevisadoTexto] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        cliente: { select: { nombre: true } },
      },
    }),
    prisma.pets.findUnique({ where: { proyectoId } }),
    prisma.planTrabajo.findUnique({
      where: { proyectoId },
      select: { objetivo: true, alcanceGeneral: true },
    }),
    prisma.iperc.findUnique({
      where: { proyectoId },
      select: {
        codigoDocumento: true,
        filas: { orderBy: { numero: 'asc' } },
      },
    }),
    prisma.mpp.findUnique({
      where: { proyectoId },
      select: {
        codigoDocumento: true,
        items: {
          include: { mppEppCatalogo: { select: { nombre: true } } },
          orderBy: { orden: 'asc' },
        },
      },
    }),
    // Alcance rico del Plan de Trabajo (V2 revisado si existe), matriz IPERC
    // V2 revisada y MPP V2 revisada (si existen) — contexto autoritativo
    // adicional; el esqueleto (qué cubrir) sigue viniendo de iperc.filas/
    // mpp.items arriba. Nunca bloquean: devuelven '' si no hay nada.
    obtenerAlcanceParaContexto(proyectoId),
    obtenerIpercParaContexto(proyectoId),
    obtenerMppParaContexto(proyectoId),
  ])

  if (!proyecto || !pets) return null

  const ipercCtx: ContextoPets['iperc'] = iperc
    ? {
        codigoDocumento: iperc.codigoDocumento,
        actividadesAgrupadas: agruparPorActividad(iperc.filas),
        referenciasCliente: extraerReferenciasCliente(iperc.filas),
        revisadoTexto: ipercRevisadoTexto,
      }
    : null

  const mppCtx: ContextoPets['mpp'] = mpp
    ? (() => {
        const categorias = {
          basico: [] as string[],
          bioseguridad: [] as string[],
          especifico: [] as string[],
        }
        const puestosSet = new Set<string>()

        for (const item of mpp.items) {
          const cat = categorizarEpp(item)
          const nombre = item.mppEppCatalogo?.nombre ?? ''
          if (nombre && !categorias[cat].includes(nombre)) {
            categorias[cat].push(nombre)
          }
          const asig = item.asignaciones as Record<string, boolean> | null
          if (asig) {
            for (const [puesto, activo] of Object.entries(asig)) {
              if (activo) puestosSet.add(puesto)
            }
          }
        }

        return {
          codigoDocumento: mpp.codigoDocumento,
          eppPorCategoria: categorias,
          puestos: Array.from(puestosSet),
          revisadoTexto: mppRevisadoTexto,
        }
      })()
    : null

  return {
    proyecto: {
      id: proyecto.id,
      nombre: proyecto.nombre,
      codigo: proyecto.codigo,
      unidad: null,
      cliente: proyecto.cliente,
    },
    pets,
    plan: plan ? { objetivo: plan.objetivo, alcanceGeneral: plan.alcanceGeneral, alcanceDetalladoTexto } : null,
    iperc: ipercCtx,
    mpp: mppCtx,
  }
}
