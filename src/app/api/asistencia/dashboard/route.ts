import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'gerente', 'administracion']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const url = new URL(req.url)
  const dias = parseInt(url.searchParams.get('dias') || '30', 10)
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)
  desde.setHours(0, 0, 0, 0)

  const ingresos = await prisma.asistencia.findMany({
    where: { fechaHora: { gte: desde }, tipo: 'ingreso' },
    select: {
      userId: true,
      fechaHora: true,
      estado: true,
      minutosTarde: true,
      metodoMarcaje: true,
      banderas: true,
      dentroGeofence: true,
      // Resolver departamento vía user → empleado (ficha actual),
      // no vía asistencia.empleado (que puede ser null si la ficha se
      // creó después del marcaje).
      user: {
        select: {
          empleado: {
            select: {
              departamento: { select: { id: true, nombre: true } },
            },
          },
        },
      },
    },
  })

  // Helpers para evaluar alertas tanto en registros nuevos (vía banderas[])
  // como en registros legacy (vía estado directo antes del backfill).
  const esFueraZona = (i: { estado: string; banderas: string[]; dentroGeofence: boolean; metodoMarcaje: string }) =>
    i.banderas.includes('fuera_zona') ||
    i.estado === 'fuera_zona' ||
    (!i.dentroGeofence && i.metodoMarcaje !== 'remoto')
  const esDispositivoNuevo = (i: { estado: string; banderas: string[] }) =>
    i.banderas.includes('dispositivo_nuevo') || i.estado === 'dispositivo_nuevo'

  const total = ingresos.length
  // Puntualidad: los estados legacy 'fuera_zona'/'dispositivo_nuevo' cuentan como a_tiempo
  const aTiempo = ingresos.filter(i =>
    i.estado === 'a_tiempo' || i.estado === 'fuera_zona' || i.estado === 'dispositivo_nuevo'
  ).length
  const tarde = ingresos.filter(i => i.estado === 'tarde').length
  const muyTarde = ingresos.filter(i => i.estado === 'muy_tarde').length
  // Alertas (pueden convivir con cualquier puntualidad)
  const fueraZona = ingresos.filter(esFueraZona).length
  const dispositivoNuevo = ingresos.filter(esDispositivoNuevo).length
  const remotos = ingresos.filter(i => i.metodoMarcaje === 'remoto').length
  const presenciales = total - remotos
  const minutosTardeTotales = ingresos.reduce((acc, i) => acc + i.minutosTarde, 0)

  // Ranking usuarios más tarde
  const porUsuario = new Map<string, { userId: string; minutos: number; veces: number }>()
  for (const i of ingresos) {
    const actual = porUsuario.get(i.userId) || { userId: i.userId, minutos: 0, veces: 0 }
    actual.minutos += i.minutosTarde
    if (i.estado === 'tarde' || i.estado === 'muy_tarde') actual.veces += 1
    porUsuario.set(i.userId, actual)
  }
  const rankingIds = Array.from(porUsuario.values())
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, 10)
  const users = await prisma.user.findMany({
    where: { id: { in: rankingIds.map(r => r.userId) } },
    select: { id: true, name: true, email: true },
  })
  const ranking = rankingIds.map(r => ({
    ...r,
    user: users.find(u => u.id === r.userId),
  }))

  // Tendencia por día.
  // Nota: 'fuera_zona' y 'dispositivo_nuevo' son estados que reemplazan a 'a_tiempo'
  // cuando hay una bandera adicional (sin tardanza real). Los contamos como a tiempo.
  const tendenciaMap = new Map<string, { fecha: string; aTiempo: number; tarde: number; muyTarde: number }>()
  for (const i of ingresos) {
    const f = i.fechaHora.toISOString().slice(0, 10)
    const t = tendenciaMap.get(f) || { fecha: f, aTiempo: 0, tarde: 0, muyTarde: 0 }
    if (i.estado === 'tarde') t.tarde += 1
    else if (i.estado === 'muy_tarde') t.muyTarde += 1
    else t.aTiempo += 1
    tendenciaMap.set(f, t)
  }
  const tendencia = Array.from(tendenciaMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Por departamento: inicializar TODOS los departamentos activos (aunque no tengan marcajes)
  const deptosActivos = await prisma.departamento.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  })
  const porDepto = new Map<string, { nombre: string; aTiempo: number; tarde: number; muyTarde: number }>()
  for (const d of deptosActivos) {
    porDepto.set(d.id, { nombre: d.nombre, aTiempo: 0, tarde: 0, muyTarde: 0 })
  }
  const SIN_DEPTO_KEY = '__sin_depto__'
  for (const i of ingresos) {
    const d = i.user?.empleado?.departamento
    const key = d?.id || SIN_DEPTO_KEY
    const existente = porDepto.get(key) || {
      nombre: d?.nombre || 'Sin departamento',
      aTiempo: 0, tarde: 0, muyTarde: 0,
    }
    // 'fuera_zona' y 'dispositivo_nuevo' se cuentan como a tiempo (no tienen tardanza real).
    if (i.estado === 'tarde') existente.tarde += 1
    else if (i.estado === 'muy_tarde') existente.muyTarde += 1
    else existente.aTiempo += 1
    porDepto.set(key, existente)
  }
  const departamentos = Array.from(porDepto.values())

  return NextResponse.json({
    periodo: { desde: desde.toISOString(), dias },
    kpis: {
      total,
      aTiempo,
      tarde,
      muyTarde,
      fueraZona,
      dispositivoNuevo,
      remotos,
      presenciales,
      porcentajePuntualidad: total > 0 ? Math.round((aTiempo / total) * 100) : 0,
      minutosTardeTotales,
    },
    ranking,
    tendencia,
    departamentos,
  })
}
