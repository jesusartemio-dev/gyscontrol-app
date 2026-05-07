import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST — agregar fila a la matriz
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()

    const matriz = await prisma.matrizComunicacion.findUnique({ where: { proyectoId } })
    if (!matriz) return NextResponse.json({ error: 'Matriz no encontrada' }, { status: 404 })

    // Calcular siguiente orden
    const maxOrden = await prisma.matrizComunicacionFila.aggregate({
      where: { matrizId: matriz.id },
      _max: { orden: true },
    })
    const orden = (maxOrden._max.orden ?? -1) + 1

    const fila = await prisma.matrizComunicacionFila.create({
      data: {
        matrizId: matriz.id,
        orden,
        informacion: body.informacion ?? '',
        emisor: body.emisor ?? '',
        receptores: JSON.stringify(body.receptores ?? []),
        medio: body.medio ?? '',
        frecuencia: body.frecuencia ?? '',
        formato: body.formato ?? '',
        notas: body.notas ?? null,
        edtId: body.edtId ?? null,
      },
    })

    return NextResponse.json(fila, { status: 201 })
  } catch (error) {
    console.error('POST /api/proyectos/[id]/matriz-comunicacion/filas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
