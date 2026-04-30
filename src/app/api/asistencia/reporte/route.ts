import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_VIEW = ['admin', 'gerente', 'coordinador', 'gestor', 'proyectos', 'administracion']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_VIEW.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const url = new URL(req.url)
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')
  const ubicacionId = url.searchParams.get('ubicacionId')
  const userId = url.searchParams.get('userId')
  const departamentoId = url.searchParams.get('departamentoId')
  const estado = url.searchParams.get('estado')
  const metodoMarcaje = url.searchParams.get('metodoMarcaje')

  const where: any = {}
  if (desde || hasta) {
    where.fechaHora = {}
    // Interpretar las fechas YYYY-MM-DD como dia completo en zona Lima (Peru no usa DST,
    // por eso podemos hardcodear -05:00). Antes usabamos new Date(string) + setHours()
    // que dependia de la zona del servidor — fallaba en local Lima (excluia el dia entero)
    // y en Vercel UTC (cortaba horas). Esta version es estable en cualquier servidor.
    if (desde) {
      where.fechaHora.gte = /^\d{4}-\d{2}-\d{2}$/.test(desde)
        ? new Date(`${desde}T00:00:00.000-05:00`)
        : new Date(desde)
    }
    if (hasta) {
      where.fechaHora.lte = /^\d{4}-\d{2}-\d{2}$/.test(hasta)
        ? new Date(`${hasta}T23:59:59.999-05:00`)
        : new Date(hasta)
    }
  }
  if (ubicacionId) where.ubicacionId = ubicacionId
  if (userId) where.userId = userId
  if (estado) where.estado = estado
  if (metodoMarcaje) where.metodoMarcaje = metodoMarcaje
  if (departamentoId) where.empleado = { departamentoId }

  const data = await prisma.asistencia.findMany({
    where,
    orderBy: { fechaHora: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      empleado: {
        include: {
          departamento: { select: { id: true, nombre: true } },
          cargo: { select: { id: true, nombre: true } },
        },
      },
      ubicacion: { select: { id: true, nombre: true, tipo: true } },
      dispositivo: { select: { nombre: true, modelo: true, plataforma: true, aprobado: true } },
    },
    take: 500,
  })
  return NextResponse.json(data)
}
