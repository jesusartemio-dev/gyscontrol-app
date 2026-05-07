import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string; nodoId: string }> }

const includeNodo = {
  user: {
    select: {
      id: true, name: true, email: true,
      empleado: { select: { telefono: true, cip: true, cargo: { select: { nombre: true } } } },
    },
  },
  recurso: { select: { id: true, nombre: true } },
} as const

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { nodoId } = await params
    const body = await req.json()
    const {
      cargoLabel, parentId, orden, recursoId,
      userId, cipOverride, telefonoOverride, empresaOverride,
    } = body

    const updated = await prisma.proyectoOrgNodo.update({
      where: { id: nodoId },
      data: {
        ...(cargoLabel !== undefined && { cargoLabel: cargoLabel.trim() }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(orden !== undefined && { orden }),
        ...(recursoId !== undefined && { recursoId: recursoId || null }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(cipOverride !== undefined && { cipOverride: cipOverride || null }),
        ...(telefonoOverride !== undefined && { telefonoOverride: telefonoOverride || null }),
        ...(empresaOverride !== undefined && { empresaOverride: empresaOverride || null }),
      },
      include: includeNodo,
    })

    return NextResponse.json({
      ...updated,
      _telefono: updated.telefonoOverride ?? updated.user?.empleado?.telefono ?? null,
      _cip: updated.cipOverride ?? updated.user?.empleado?.cip ?? null,
      _empresa: updated.empresaOverride ?? 'GYS CONTROL INDUSTRIAL SAC',
    })
  } catch (error) {
    console.error('Error actualizando nodo organigrama proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { nodoId } = await params

    // No se puede eliminar nodos fijos GYS
    const nodo = await prisma.proyectoOrgNodo.findUnique({ where: { id: nodoId } })
    if (!nodo) return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 404 })
    if (nodo.esFijoGys) {
      return NextResponse.json({ error: 'Los nodos corporativos GYS no se pueden eliminar' }, { status: 400 })
    }

    await prisma.proyectoOrgNodo.delete({ where: { id: nodoId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error eliminando nodo organigrama proyecto:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
