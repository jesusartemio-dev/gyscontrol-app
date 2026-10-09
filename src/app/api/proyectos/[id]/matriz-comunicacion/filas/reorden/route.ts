import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT — reordenar filas: body { ids: string[] } en el nuevo orden
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const { ids } = await req.json() as { ids?: unknown }
    if (!Array.isArray(ids) || ids.some(x => typeof x !== 'string')) {
      return NextResponse.json({ error: 'ids inválidos' }, { status: 400 })
    }

    const matriz = await prisma.matrizComunicacion.findUnique({
      where: { proyectoId },
      select: { id: true, filas: { select: { id: true } } },
    })
    if (!matriz) return NextResponse.json({ error: 'Matriz no encontrada' }, { status: 404 })

    const actuales = new Set(matriz.filas.map(f => f.id))
    if (ids.length !== actuales.size || !ids.every(id => actuales.has(id as string))) {
      return NextResponse.json({ error: 'La lista no coincide con las filas de la matriz' }, { status: 400 })
    }

    await prisma.$transaction(
      (ids as string[]).map((id, orden) =>
        prisma.matrizComunicacionFila.update({ where: { id }, data: { orden } })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/proyectos/[id]/matriz-comunicacion/filas/reorden:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
