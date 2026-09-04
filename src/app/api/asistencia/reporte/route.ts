import { tieneRol, rolesDe } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserIdsDeMiEquipo } from '@/lib/services/equipoSupervision'

// Vistas nominales de RRHH (Detalle/Resumen/Horas por día/Ranking en
// /rrhh/asistencia): sin scope, ven GPS/tardanza/dispositivo de toda la
// empresa.
const ROLES_VIEW = ['admin', 'gerente', 'administracion']
// Vista "Detalle"/"Resumen" en /supervision/asistencia: coordinador/gestor
// solo ven a su propio equipo (ver getUserIdsDeMiEquipo) — el scope se
// aplica más abajo forzando `where.userId`.
const ROLES_VIEW_EQUIPO = ['coordinador', 'gestor']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const accesoTotal = tieneRol(session, ROLES_VIEW)
  const accesoEquipo = tieneRol(session, ROLES_VIEW_EQUIPO)
  if (!session || (!accesoTotal && !accesoEquipo)) {
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
  const q = url.searchParams.get('q')?.trim()

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
  if (q) {
    where.OR = [
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { empleado: { departamento: { nombre: { contains: q, mode: 'insensitive' } } } },
      { ubicacion: { nombre: { contains: q, mode: 'insensitive' } } },
    ]
  }

  // Sin acceso total: acotar a la gente del propio equipo, sin importar lo
  // que haya pedido `userId` — si pidió a alguien fuera de su equipo, no ve
  // nada (mejor vacío que filtrar silenciosamente distinto a lo pedido).
  if (!accesoTotal) {
    const equipoIds = await getUserIdsDeMiEquipo(session.user.id, rolesDe(session))
    if (userId && !equipoIds.includes(userId)) {
      return NextResponse.json({ data: [], total: 0, truncated: false })
    }
    where.userId = userId ?? { in: equipoIds }
  }

  const TAKE = 1000
  const [data, total] = await Promise.all([
    prisma.asistencia.findMany({
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
        jornadaAsistencia: {
          select: { proyecto: { select: { codigo: true, nombre: true } } },
        },
        dispositivo: { select: { nombre: true, modelo: true, plataforma: true, aprobado: true } },
      },
      take: TAKE,
    }),
    prisma.asistencia.count({ where }),
  ])
  return NextResponse.json({ data, total, truncated: total > data.length })
}
