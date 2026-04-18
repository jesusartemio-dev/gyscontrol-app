import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')

  const where: any = { userId: session.user.id }
  if (desde || hasta) {
    where.fechaHora = {}
    if (desde) where.fechaHora.gte = new Date(desde)
    if (hasta) where.fechaHora.lte = new Date(hasta)
  }

  const data = await prisma.asistencia.findMany({
    where,
    orderBy: { fechaHora: 'desc' },
    include: { ubicacion: true },
    take: 100,
  })

  // Resumen del mes actual
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const mes = await prisma.asistencia.aggregate({
    where: { userId: session.user.id, fechaHora: { gte: inicioMes }, tipo: 'ingreso' },
    _sum: { minutosTarde: true },
    _count: true,
  })

  const tardanzas = await prisma.asistencia.count({
    where: {
      userId: session.user.id,
      fechaHora: { gte: inicioMes },
      tipo: 'ingreso',
      estado: { in: ['tarde', 'muy_tarde'] },
    },
  })

  return NextResponse.json({
    marcajes: data,
    resumenMes: {
      totalIngresos: mes._count,
      minutosTardeTotal: mes._sum.minutosTarde || 0,
      vecesConTardanza: tardanzas,
    },
  })
}
