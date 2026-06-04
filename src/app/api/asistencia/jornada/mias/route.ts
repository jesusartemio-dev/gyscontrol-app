import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/asistencia/jornada/mias — historial de asistencias de campo creadas
// por el usuario (las últimas 60), con conteo de marcajes, para gestionarlas.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const jornadas = await prisma.jornadaAsistencia.findMany({
    where: { supervisorId: session.user.id },
    orderBy: { iniciadaEn: 'desc' },
    take: 60,
    select: {
      id: true,
      fecha: true,
      activa: true,
      iniciadaEn: true,
      cerradaEn: true,
      ubicacion: { select: { nombre: true } },
      proyecto: { select: { codigo: true, nombre: true } },
      _count: { select: { asistencias: true } },
    },
  })

  return NextResponse.json(
    jornadas.map((j) => ({
      id: j.id,
      fecha: j.fecha,
      activa: j.activa,
      iniciadaEn: j.iniciadaEn,
      cerradaEn: j.cerradaEn,
      ubicacion: j.ubicacion?.nombre ?? '—',
      proyectoCodigo: j.proyecto?.codigo ?? null,
      proyectoNombre: j.proyecto?.nombre ?? null,
      marcajes: j._count.asistencias,
    })),
  )
}
