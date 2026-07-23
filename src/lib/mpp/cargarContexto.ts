import { prisma } from '@/lib/prisma'
import { obtenerIpercParaContexto } from '@/lib/iperc/obtenerIpercParaContexto'
import { obtenerPuestosDelOrganigrama } from './obtenerPuestosDelOrganigrama'

interface ResumenPeligrosPorPuesto {
  puesto: string
  cantidadFilas: number
  factoresRiesgo: Record<string, number>
  severidadMax: number
  peligrosFrecuentes: string[]
}

export interface ContextoMpp {
  proyecto: {
    id: string
    nombre: string
    codigo: string
  }
  iperc: {
    totalFilas: number
    resumenPorPuesto: ResumenPeligrosPorPuesto[]
    factoresGlobales: string[]
    peligrosCriticosAltos: string[]
    /** Matriz IPERC V2 revisada (CSV) si hay una versión subida vigente — ver obtenerIpercParaContexto.ts. '' si no hay. */
    revisadoTexto: string
  }
  catalogoCount: number
  catalogoEpp: Array<{ nombre: string; riesgo: string; parteCuerpo: string }>
  /** Columnas (cargos) derivadas del organigrama del proyecto — ver obtenerPuestosDelOrganigrama.ts. */
  puestos: string[]
}

export async function cargarContextoMpp(proyectoId: string): Promise<ContextoMpp> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      iperc: {
        include: {
          filas: {
            select: {
              puestoTrabajo: true,
              factorRiesgo: true,
              severidad: true,
              peligro: true,
            },
          },
        },
      },
    },
  })

  if (!proyecto) throw new Error('Proyecto no encontrado')
  if (!proyecto.iperc) throw new Error('Proyecto sin IPERC')

  const puestos = await obtenerPuestosDelOrganigrama(proyectoId)

  const filas = proyecto.iperc.filas

  const porPuesto = new Map<string, {
    factores: Map<string, number>
    severidadMax: number
    peligros: string[]
  }>()

  for (const fila of filas) {
    const puesto = fila.puestoTrabajo
    if (!puesto) continue

    if (!porPuesto.has(puesto)) {
      porPuesto.set(puesto, { factores: new Map(), severidadMax: 0, peligros: [] })
    }
    const reg = porPuesto.get(puesto)!
    reg.factores.set(fila.factorRiesgo, (reg.factores.get(fila.factorRiesgo) ?? 0) + 1)
    reg.severidadMax = Math.max(reg.severidadMax, fila.severidad)
    reg.peligros.push(fila.peligro)
  }

  const resumenPorPuesto: ResumenPeligrosPorPuesto[] = []
  for (const [puestoOriginal, data] of porPuesto.entries()) {
    // Match fuzzy con los puestos reales del organigrama (columnas de la MPP)
    const puestoNormalizado =
      puestos.find(
        (p) =>
          p.toLowerCase() === puestoOriginal.toLowerCase() ||
          puestoOriginal.toLowerCase().includes(p.toLowerCase().split(' ')[0])
      ) ?? puestoOriginal

    const peligrosCount = new Map<string, number>()
    for (const p of data.peligros) {
      peligrosCount.set(p, (peligrosCount.get(p) ?? 0) + 1)
    }
    const peligrosFrecuentes = [...peligrosCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([p]) => p)

    resumenPorPuesto.push({
      puesto: puestoNormalizado,
      cantidadFilas: data.peligros.length,
      factoresRiesgo: Object.fromEntries(data.factores),
      severidadMax: data.severidadMax,
      peligrosFrecuentes,
    })
  }

  const factoresGlobales = [...new Set(filas.map((f) => f.factorRiesgo))]
  const peligrosCriticosUnicos = [
    ...new Set(filas.filter((f) => f.severidad >= 3).map((f) => f.peligro)),
  ].slice(0, 15)

  const catalogo = await prisma.mppEppCatalogo.findMany({
    where: { activo: true },
    orderBy: { orden: 'asc' },
  })
  const catalogoEpp = catalogo.map((epp) => ({
    nombre: epp.nombre,
    riesgo: epp.riesgo,
    parteCuerpo: epp.parteCuerpo,
  }))

  // Matriz IPERC V2 revisada (si existe) — contexto autoritativo adicional;
  // el esqueleto (peligros por puesto, arriba) sigue viniendo de IpercFila.
  // Nunca bloquea: '' si no hay nada que ofrecer.
  const revisadoTexto = await obtenerIpercParaContexto(proyectoId)

  return {
    proyecto: {
      id: proyecto.id,
      nombre: proyecto.nombre,
      codigo: proyecto.codigo ?? proyectoId,
    },
    iperc: {
      totalFilas: filas.length,
      resumenPorPuesto,
      factoresGlobales,
      peligrosCriticosAltos: peligrosCriticosUnicos,
      revisadoTexto,
    },
    catalogoCount: catalogo.length,
    catalogoEpp,
    puestos,
  }
}
