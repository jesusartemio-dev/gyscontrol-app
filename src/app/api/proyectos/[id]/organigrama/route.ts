import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchCargoConRolProyecto } from '@/lib/organigrama/nodosGys'

interface Ctx { params: Promise<{ id: string }> }

const EMPRESA_DEFAULT = 'GYS CONTROL INDUSTRIAL SAC'

const includeNodo = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      empleado: {
        select: {
          telefono: true,
          cip: true,
          cargo: { select: { nombre: true } },
        },
      },
    },
  },
  recurso: { select: { id: true, nombre: true } },
} as const

function resolveNodo(nodo: any) {
  return {
    ...nodo,
    _telefono: nodo.telefonoOverride ?? nodo.user?.empleado?.telefono ?? null,
    _cip: nodo.cipOverride ?? nodo.user?.empleado?.cip ?? null,
    _empresa: nodo.empresaOverride ?? EMPRESA_DEFAULT,
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    // Verificar dependencias antes de eliminar
    const matriz = await prisma.matrizComunicacion.findUnique({
      where: { proyectoId },
      select: { id: true },
    })
    if (matriz) {
      return NextResponse.json(
        { error: 'El organigrama no se puede eliminar porque existe una Matriz de Comunicaciones que depende de él. Elimina primero la Matriz de Comunicaciones.' },
        { status: 409 }
      )
    }

    await prisma.proyectoOrgNodo.deleteMany({ where: { proyectoId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error eliminando organigrama proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const nodos = await prisma.proyectoOrgNodo.findMany({
      where: { proyectoId },
      orderBy: [{ parentId: 'asc' }, { orden: 'asc' }],
      include: includeNodo,
    })

    return NextResponse.json(nodos.map(resolveNodo))
  } catch (error) {
    console.error('Error obteniendo organigrama proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function ordenarTopologico<T extends { id: string; parentId: string | null }>(nodos: T[]): T[] {
  const result: T[] = []
  const pendientes = [...nodos]
  const creados = new Set<string>()
  let intentos = 0
  while (pendientes.length > 0 && intentos < pendientes.length) {
    const nodo = pendientes.shift()!
    if (!nodo.parentId || creados.has(nodo.parentId)) {
      result.push(nodo)
      creados.add(nodo.id)
      intentos = 0
    } else {
      pendientes.push(nodo)
      intentos++
    }
  }
  return result
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()
    const { plantillaId } = body

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, gestorId: true, supervisorId: true, liderId: true },
    })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // Eliminar organigrama existente
    await prisma.proyectoOrgNodo.deleteMany({ where: { proyectoId } })

    // ── Cargar y generar desde la plantilla base ──────────────────────────────
    const plantillaBase = await prisma.plantillaOrganigrama.findFirst({
      where: { esBase: true, activo: true },
      include: { nodos: { orderBy: [{ parentId: 'asc' }, { orden: 'asc' }] } },
    })

    // Map: cargoLabel → id del nodo creado (para anclar plantilla de proyecto)
    const baseIdMap: Record<string, string> = {}

    if (plantillaBase) {
      const nodosBase = ordenarTopologico(plantillaBase.nodos)
      for (const pNodo of nodosBase) {
        const parentId = pNodo.parentId ? (baseIdMap[
          plantillaBase.nodos.find(n => n.id === pNodo.parentId)?.cargoLabel ?? ''
        ] ?? null) : null

        const creado = await prisma.proyectoOrgNodo.create({
          data: {
            proyectoId,
            cargoLabel: pNodo.cargoLabel,
            parentId,
            orden: pNodo.orden,
            recursoId: pNodo.recursoId ?? null,
            userId: pNodo.userId ?? null,
            esFijoGys: false,
          },
        })
        baseIdMap[pNodo.cargoLabel] = creado.id
      }
    }

    // Nodo de anclaje por defecto para los nodos de plantilla de proyecto
    const anclaId = baseIdMap['GERENCIA DE PROYECTOS'] ?? null

    // ── Crear nodos desde plantilla de proyecto (si se proporcionó) ───────────
    if (plantillaId) {
      const plantilla = await prisma.plantillaOrganigrama.findUnique({
        where: { id: plantillaId },
        include: { nodos: { orderBy: [{ parentId: 'asc' }, { orden: 'asc' }] } },
      })

      if (plantilla) {
        const plantillaIdMap: Record<string, string> = {}
        const nodosOrdenados = ordenarTopologico(plantilla.nodos)

        for (const pNodo of nodosOrdenados) {
          let resolvedParentId: string | null = null
          if (!pNodo.parentId) {
            // Nodo raíz: anclar al nodo base indicado por gysParentLabel, o GERENCIA DE PROYECTOS
            const anchor = pNodo.gysParentLabel
            resolvedParentId = anchor ? (baseIdMap[anchor] ?? anclaId) : anclaId
          } else {
            resolvedParentId = plantillaIdMap[pNodo.parentId] ?? anclaId
          }

          // Auto-asignar userId según rol del proyecto (fallback: userId pre-configurado en plantilla)
          let userId: string | null = pNodo.userId ?? null
          if (matchCargoConRolProyecto(pNodo.cargoLabel, 'gestor') && proyecto.gestorId) {
            userId = proyecto.gestorId
          } else if (matchCargoConRolProyecto(pNodo.cargoLabel, 'supervisor') && proyecto.supervisorId) {
            userId = proyecto.supervisorId
          } else if (matchCargoConRolProyecto(pNodo.cargoLabel, 'lider') && proyecto.liderId) {
            userId = proyecto.liderId
          }

          const creado = await prisma.proyectoOrgNodo.create({
            data: {
              proyectoId,
              cargoLabel: pNodo.cargoLabel,
              parentId: resolvedParentId,
              orden: pNodo.orden,
              recursoId: pNodo.recursoId ?? null,
              userId,
              esFijoGys: false,
            },
          })
          plantillaIdMap[pNodo.id] = creado.id
        }
      }
    }

    // Devolver el organigrama completo
    const nodos = await prisma.proyectoOrgNodo.findMany({
      where: { proyectoId },
      orderBy: [{ parentId: 'asc' }, { orden: 'asc' }],
      include: includeNodo,
    })

    return NextResponse.json(nodos.map(resolveNodo), { status: 201 })
  } catch (error) {
    console.error('Error creando organigrama proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
