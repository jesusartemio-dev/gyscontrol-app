import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string; nodoId: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { nodoId } = await params
    const body = await req.json()
    const { puestoId, parentId, orden, recursoId, esObligatorio, gysParentLabel, userId } = body

    // Cambiar el puesto arrastra la etiqueta: son el mismo dato, no dos campos
    // que haya que mantener a mano sincronizados.
    let cargoLabel: string | undefined
    if (puestoId !== undefined) {
      const puesto = await prisma.puesto.findUnique({
        where: { id: puestoId },
        select: { nombre: true },
      })
      if (!puesto) return NextResponse.json({ error: 'Puesto no encontrado' }, { status: 404 })
      cargoLabel = puesto.nombre
    }

    const updated = await prisma.plantillaOrgNodo.update({
      where: { id: nodoId },
      data: {
        ...(puestoId !== undefined && { puestoId, cargoLabel: cargoLabel! }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(orden !== undefined && { orden }),
        ...(recursoId !== undefined && { recursoId: recursoId || null }),
        ...(esObligatorio !== undefined && { esObligatorio }),
        ...(gysParentLabel !== undefined && { gysParentLabel: gysParentLabel || null }),
        ...(userId !== undefined && { userId: userId || null }),
      },
      include: {
        puesto: { select: { id: true, nombre: true } },
        recurso: { select: { id: true, nombre: true, tipo: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error actualizando nodo plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { nodoId } = await params

    await prisma.plantillaOrgNodo.delete({ where: { id: nodoId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error eliminando nodo plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
