import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Devuelve todas las jornadas de campo activas en las últimas 36h.
// Cualquier trabajador autenticado puede consultarlo para saber si hay
// una jornada abierta en su zona antes de ir a marcar.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const hace36h = new Date(Date.now() - 36 * 60 * 60 * 1000)

  const jornadas = await prisma.jornadaAsistencia.findMany({
    where: { iniciadaEn: { gte: hace36h }, activa: true },
    orderBy: { iniciadaEn: 'desc' },
    select: {
      id: true,
      fecha: true,
      iniciadaEn: true,
      horaIngresoOverride: true,
      horaSalidaOverride: true,
      ubicacion: { select: { id: true, nombre: true, horaIngreso: true, horaSalida: true } },
      proyecto: { select: { codigo: true, nombre: true } },
      supervisor: { select: { name: true } },
    },
  })

  return NextResponse.json(jornadas)
}
