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

  const proyectoId: string | null = body.proyectoId || null

  // Buscar jornada existente del día para esta ubicación
  const existente = await prisma.jornadaAsistencia.findUnique({
    where: {
      supervisorId_ubicacionId_fecha: {
        supervisorId: session.user.id,
        ubicacionId: body.ubicacionId,
        fecha,
      },
    },
    include: { proyecto: { select: { id: true, codigo: true, nombre: true } } },
  })

  if (existente) {
    let jornada = existente
    if (!existente.activa) {
      jornada = await prisma.jornadaAsistencia.update({
        where: { id: existente.id },
        data: { activa: true, cerradaEn: null },
        include: { proyecto: { select: { id: true, codigo: true, nombre: true } } },
      })
    }
    // Si se pasa proyectoId y aún no tiene RegistroHorasCampo, crear uno
    if (proyectoId && !jornada.registroHorasCampoId) {
      const rhc = await prisma.registroHorasCampo.create({
        data: {
          proyectoId,
          supervisorId: session.user.id,
          fechaTrabajo: fecha,
          estado: 'iniciado',
          personalPlanificado: [],
          updatedAt: new Date(),
        },
      })
      jornada = await prisma.jornadaAsistencia.update({
        where: { id: jornada.id },
        data: { proyectoId, registroHorasCampoId: rhc.id },
        include: { proyecto: { select: { id: true, codigo: true, nombre: true } } },
      })
    }
    return NextResponse.json(jornada)
  }

  // Crear nueva jornada, opcionalmente con RegistroHorasCampo
  const jornada = await prisma.$transaction(async (tx) => {
    let registroHorasCampoId: string | undefined

    if (proyectoId) {
      const rhc = await tx.registroHorasCampo.create({
        data: {
          proyectoId,
          supervisorId: session.user.id,
          fechaTrabajo: fecha,
          estado: 'iniciado',
          personalPlanificado: [],
          updatedAt: new Date(),
        },
      })
      registroHorasCampoId = rhc.id
    }

    return tx.jornadaAsistencia.create({
      data: {
        supervisorId: session.user.id,
        ubicacionId: body.ubicacionId,
        proyectoId: proyectoId || null,
        registroHorasCampoId: registroHorasCampoId || null,
        fecha,
        qrSecret: generarSecret(),
        latitudInicio: parseFloat(body.latitud),
        longitudInicio: parseFloat(body.longitud),
        activa: true,
      },
      include: { proyecto: { select: { id: true, codigo: true, nombre: true } } },
    })
  })

  return NextResponse.json(jornada)
}
