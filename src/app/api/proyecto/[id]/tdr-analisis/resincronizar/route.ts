import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularCompletitudGeneral } from '@/lib/tdr/completitud'
import type { TdrAnalisisCore } from '@/types/tdr'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, cotizacionId: true },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }
    if (!proyecto.cotizacionId) {
      return NextResponse.json(
        { error: 'Este proyecto no tiene cotización vinculada. No se puede re-importar.' },
        { status: 400 },
      )
    }

    const tdrCotizacion = await prisma.cotizacionTdrAnalisis.findFirst({
      where: { cotizacionId: proyecto.cotizacionId },
      orderBy: { createdAt: 'desc' },
    })
    if (!tdrCotizacion) {
      return NextResponse.json(
        { error: 'La cotización origen ya no tiene análisis de TDR. No hay nada que importar.' },
        { status: 404 },
      )
    }

    // Borrar snapshot actual si existe (ignorar si no existía)
    await prisma.proyectoTdrAnalisis.delete({ where: { proyectoId } }).catch(() => {})

    const {
      id: cotTdrId,
      cotizacionId: _omit1,
      createdAt: _omit2,
      updatedAt: _omit3,
      ...resto
    } = tdrCotizacion

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creado = await prisma.proyectoTdrAnalisis.create({
      data: {
        ...(resto as any),
        proyectoId,
        cotizacionTdrOrigenId: cotTdrId,
        desconectadoDeOrigen: false,
        fechaSnapshot: new Date(),
      },
    })

    const completitud = calcularCompletitudGeneral(creado as unknown as TdrAnalisisCore)
    const final = await prisma.proyectoTdrAnalisis.update({
      where: { id: creado.id },
      data: { bloquesCompletitud: completitud.bloques },
    })

    return NextResponse.json({ ...final, cotizacionId: proyecto.cotizacionId })
  } catch (error) {
    console.error('[POST tdr-analisis/resincronizar]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
