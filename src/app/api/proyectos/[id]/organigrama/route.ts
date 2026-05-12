import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NODOS_FIJOS_GYS, matchCargoConRolProyecto } from '@/lib/organigrama/nodosGys'

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

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()
    const { plantillaId } = body

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, gestorId: true, supervisorId: true, liderId: true },
    })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // Eliminar organigrama existente si lo hay
    await prisma.proyectoOrgNodo.deleteMany({ where: { proyectoId } })

    // Resolver usuarios de nodos fijos GYS
    const emailsGys = NODOS_FIJOS_GYS.map(n => n.email)
    const usersGys = await prisma.user.findMany({
      where: { email: { in: emailsGys } },
      select: { id: true, email: true },
    })
    const emailToUserId = Object.fromEntries(usersGys.map(u => [u.email, u.id]))

    // ── Crear nodos fijos GYS ─────────────────────────────────────────────
    // Primero creamos la raíz, luego los hijos referenciando el id del padre
    const gysIdMap: Record<string, string> = {} // cargoLabel → id creado

    for (const def of NODOS_FIJOS_GYS) {
      const parentId = def.parentLabel ? gysIdMap[def.parentLabel] ?? null : null
      const nodo = await prisma.proyectoOrgNodo.create({
        data: {
          proyectoId,
          cargoLabel: def.cargoLabel,
          parentId,
          orden: def.orden,
          userId: emailToUserId[def.email] ?? null,
          esFijoGys: true,
        },
      })
      gysIdMap[def.cargoLabel] = nodo.id
    }

    // ── Crear nodos desde plantilla (si se proporcionó) ───────────────────
    if (plantillaId) {
      const plantilla = await prisma.plantillaOrganigrama.findUnique({
        where: { id: plantillaId },
        include: {
          nodos: { orderBy: [{ parentId: 'asc' }, { orden: 'asc' }] },
        },
      })

      if (plantilla) {
        // Anclar los nodos de plantilla bajo GERENCIA DE PROYECTOS
        const anclaId = gysIdMap['GERENCIA DE PROYECTOS'] ?? null

        // Crear nodos raíz de plantilla → sus hijos en orden topológico
        // Map: plantillaOrgNodo.id → proyectoOrgNodo.id
        const plantillaIdMap: Record<string, string> = {}

        const ordenar = (nodos: typeof plantilla.nodos): typeof plantilla.nodos => {
          const result: typeof plantilla.nodos = []
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

        const nodosOrdenados = ordenar(plantilla.nodos)

        // Determinar userId para nodos que coincidan con roles del proyecto
        for (const pNodo of nodosOrdenados) {
          let resolvedParentId: string | null = null
          if (!pNodo.parentId) {
            // Root plantilla node: anchor to its designated GYS node, or GERENCIA DE PROYECTOS by default
            const anchor = (pNodo as any).gysParentLabel
            resolvedParentId = anchor ? (gysIdMap[anchor] ?? anclaId) : anclaId
          } else {
            resolvedParentId = plantillaIdMap[pNodo.parentId] ?? anclaId
          }

          // Auto-asignar userId según rol del proyecto
          let userId: string | null = null
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
              recursoId: pNodo.recursoId || null,
              userId,
              esFijoGys: false,
            },
          })
          plantillaIdMap[pNodo.id] = creado.id
        }
      }
    }

    // Devolver el organigrama completo creado
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
