import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generarSecret } from '@/lib/utils/qrTotp'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  if (!body.ubicacionId || body.latitud == null || body.longitud == null) {
    return NextResponse.json({ message: 'Datos incompletos' }, { status: 400 })
  }

  const fecha = new Date()
  fecha.setHours(0, 0, 0, 0)

  // Buscar o crear jornada del día
  const existente = await prisma.jornadaAsistencia.findUnique({
    where: {
      supervisorId_ubicacionId_fecha: {
        supervisorId: session.user.id,
        ubicacionId: body.ubicacionId,
        fecha,
      },
    },
  })

  if (existente) {
    if (!existente.activa) {
      const reactivada = await prisma.jornadaAsistencia.update({
        where: { id: existente.id },
        data: { activa: true, cerradaEn: null },
      })
      return NextResponse.json(reactivada)
    }
    return NextResponse.json(existente)
  }

  const jornada = await prisma.jornadaAsistencia.create({
    data: {
      supervisorId: session.user.id,
      ubicacionId: body.ubicacionId,
      fecha,
      qrSecret: generarSecret(),
      latitudInicio: parseFloat(body.latitud),
      longitudInicio: parseFloat(body.longitud),
      activa: true,
    },
  })
  return NextResponse.json(jornada)
}
