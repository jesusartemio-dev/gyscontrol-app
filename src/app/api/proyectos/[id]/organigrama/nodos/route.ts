import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()
    const { puestoId, parentId, orden, recursoId, userId } = body

    if (!puestoId) {
      return NextResponse.json({ error: 'puestoId es requerido' }, { status: 400 })
    }

    // La etiqueta sale del catálogo, igual que en las plantillas: si fueran dos
    // campos editables por separado volverían a desincronizarse.
    const puesto = await prisma.puesto.findUnique({
      where: { id: puestoId },
      select: { nombre: true },
    })
    if (!puesto) return NextResponse.json({ error: 'Puesto no encontrado' }, { status: 404 })

    const nodo = await prisma.proyectoOrgNodo.create({
      data: {
        proyectoId,
        puestoId,
        cargoLabel: puesto.nombre,
        parentId: parentId || null,
        orden: orden ?? 0,
        recursoId: recursoId || null,
        userId: userId || null,
        esFijoGys: false,
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            empleado: { select: { telefono: true, cip: true, cargo: { select: { nombre: true } } } },
          },
        },
        recurso: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json({
      ...nodo,
      _telefono: nodo.telefonoOverride ?? nodo.user?.empleado?.telefono ?? null,
      _cip: nodo.cipOverride ?? nodo.user?.empleado?.cip ?? null,
      _empresa: nodo.empresaOverride ?? 'GYS CONTROL INDUSTRIAL SAC',
    }, { status: 201 })
  } catch (error) {
    console.error('Error agregando nodo organigrama proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
