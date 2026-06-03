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

  // Fecha de trabajo = "hoy" en zona Lima (UTC-5), fijada al mediodía UTC para
  // evitar el desfase de un día al mostrarla (un DateTime a medianoche UTC se ve
  // como el día anterior en Lima). El servidor corre en UTC.
  const hoyLima = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [anioLima, mesLima, diaLima] = hoyLima.split('-').map(Number)
  const fecha = new Date(Date.UTC(anioLima, mesLima - 1, diaLima, 12, 0, 0))

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
      const [rhc] = await prisma.$transaction(async (tx) => {
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
        // Evidencia automática
        await tx.evidenciaSeguridad.create({
          data: {
            registroHorasCampoId: rhc.id,
            creadoPorId: session.user.id,
            estado: 'abierta',
            updatedAt: new Date(),
          },
        })
        return [rhc]
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

      // Crear evidencia de seguridad automáticamente
      await tx.evidenciaSeguridad.create({
        data: {
          registroHorasCampoId: rhc.id,
          creadoPorId: session.user.id,
          estado: 'abierta',
          updatedAt: new Date(),
        },
      })
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
