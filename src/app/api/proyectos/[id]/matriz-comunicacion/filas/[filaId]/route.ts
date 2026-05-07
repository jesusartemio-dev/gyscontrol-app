import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH — editar fila
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; filaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { filaId } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.informacion !== undefined) updateData.informacion = body.informacion
    if (body.emisor !== undefined) updateData.emisor = body.emisor
    if (body.receptores !== undefined) updateData.receptores = JSON.stringify(body.receptores)
    if (body.medio !== undefined) updateData.medio = body.medio
    if (body.frecuencia !== undefined) updateData.frecuencia = body.frecuencia
    if (body.formato !== undefined) updateData.formato = body.formato
    if (body.notas !== undefined) updateData.notas = body.notas
    if (body.orden !== undefined) updateData.orden = body.orden
    if (body.edtId !== undefined) updateData.edtId = body.edtId || null

    const fila = await prisma.matrizComunicacionFila.update({
      where: { id: filaId },
      data: updateData,
    })

    return NextResponse.json(fila)
  } catch (error) {
    console.error('PATCH /api/proyectos/[id]/matriz-comunicacion/filas/[filaId]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE — eliminar fila
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; filaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { filaId } = await params

    await prisma.matrizComunicacionFila.delete({ where: { id: filaId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/proyectos/[id]/matriz-comunicacion/filas/[filaId]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
