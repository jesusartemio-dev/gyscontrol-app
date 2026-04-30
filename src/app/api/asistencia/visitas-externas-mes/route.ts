import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_VIEW = ['admin', 'gerente', 'coordinador', 'gestor', 'proyectos', 'administracion']

const UMBRAL_ALERTA = 0.5

interface ResumenUsuario {
  userId: string
  nombre: string
  email: string
  totalDiasMarcados: number
  diasVisitaExterna: number
  ratio: number
  excedeUmbral: boolean
  ultimosLugares: string[]
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_VIEW.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const url = new URL(req.url)
  const mesParam = url.searchParams.get('mes')
  const ahora = new Date()
  const ref = mesParam ? new Date(mesParam + '-01T00:00:00') : ahora
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const finExclusivo = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)

  const marcajes = await prisma.asistencia.findMany({
    where: {
      tipo: 'ingreso',
      fechaHora: { gte: inicio, lt: finExclusivo },
    },
    select: {
      userId: true,
      fechaHora: true,
      metodoMarcaje: true,
      observacion: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { fechaHora: 'desc' },
  })

  const porUsuario = new Map<
    string,
    {
      nombre: string
      email: string
      diasMarcados: Set<string>
      diasVisita: Set<string>
      ultimosLugares: Map<string, string>
    }
  >()

  const claveDia = (d: Date) => {
    const lima = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
    return lima
  }

  for (const m of marcajes) {
    const dia = claveDia(m.fechaHora)
    let entry = porUsuario.get(m.userId)
    if (!entry) {
      entry = {
        nombre: m.user.name || m.user.email,
        email: m.user.email,
        diasMarcados: new Set(),
        diasVisita: new Set(),
        ultimosLugares: new Map(),
      }
      porUsuario.set(m.userId, entry)
    }
    entry.diasMarcados.add(dia)
    if (m.metodoMarcaje === 'visita_externa') {
      entry.diasVisita.add(dia)
      if (m.observacion && !entry.ultimosLugares.has(dia)) {
        entry.ultimosLugares.set(dia, m.observacion)
      }
    }
  }

  const resumen: ResumenUsuario[] = []
  for (const [userId, e] of porUsuario.entries()) {
    if (e.diasVisita.size === 0) continue
    const total = e.diasMarcados.size
    const visitas = e.diasVisita.size
    const ratio = total > 0 ? visitas / total : 0
    resumen.push({
      userId,
      nombre: e.nombre,
      email: e.email,
      totalDiasMarcados: total,
      diasVisitaExterna: visitas,
      ratio,
      excedeUmbral: ratio > UMBRAL_ALERTA,
      ultimosLugares: Array.from(e.ultimosLugares.values()).slice(0, 3),
    })
  }

  resumen.sort((a, b) => b.ratio - a.ratio)

  return NextResponse.json({
    mes: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
    umbral: UMBRAL_ALERTA,
    resumen,
  })
}
