import { tieneRol } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Solo lo consume la vista "Sesiones" de /rrhh/asistencia, que es de
// RRHH (borra jornadas de cualquier persona de la empresa). No la usan
// coordinador/gestor/proyectos, cuya única vista visible ahí es "Por Proyecto".
const ROLES_VIEW = ['admin', 'gerente', 'administracion']

// GET /api/asistencia/jornada/todas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Lista TODAS las asistencias de campo (sesiones de QR) para supervisión.
// La eliminación la valida aparte el DELETE (solo admin/gerente para cualquiera).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !tieneRol(session, ROLES_VIEW)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const url = new URL(req.url)
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')

  const where: { fecha?: { gte?: Date; lte?: Date } } = {}
  if (desde || hasta) {
    where.fecha = {}
    if (desde) where.fecha.gte = new Date(`${desde}T00:00:00.000Z`)
    if (hasta) where.fecha.lte = new Date(`${hasta}T23:59:59.999Z`)
  }

  const jornadas = await prisma.jornadaAsistencia.findMany({
    where,
    orderBy: { iniciadaEn: 'desc' },
    take: 300,
    select: {
      id: true,
      fecha: true,
      activa: true,
      iniciadaEn: true,
      cerradaEn: true,
      supervisor: { select: { name: true, email: true } },
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
      creador: j.supervisor?.name || j.supervisor?.email || '—',
      ubicacion: j.ubicacion?.nombre ?? '—',
      proyectoCodigo: j.proyecto?.codigo ?? null,
      proyectoNombre: j.proyecto?.nombre ?? null,
      marcajes: j._count.asistencias,
    })),
  )
}
