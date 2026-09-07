import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { EstadoSolicitudAusencia } from '@prisma/client'

// Mismo allowlist que /api/saldos-ausencia — endpoint dedicado y de solo
// lectura para no tocar la autorización de /api/ausencias (que solo permite
// a admin/administracion consultar solicitudes de un tercero).
const ROLES_VER_TERCEROS = ['admin', 'administracion', 'gerente', 'gestor', 'coordinador', 'proyectos']

const ESTADOS_APROBADA: EstadoSolicitudAusencia[] = ['aprobada', 'en_curso', 'finalizada']

// GET /api/ausencias/periodos-vacaciones?userId=...
// Lista los periodos de vacaciones aprobados de una persona (fechaInicio,
// fechaFin, diasHabiles) — resuelve el "PERIODO 2024-2025 (1)/(2)" del
// registro manual sin necesidad de un modelo nuevo: cada periodo ya es una
// SolicitudAusencia aprobada de tipo VAC.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = request.nextUrl.searchParams.get('userId') ?? session.user.id
    if (userId !== session.user.id && !tieneRol(session, ROLES_VER_TERCEROS)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const tipoVac = await prisma.tipoAusencia.findUnique({ where: { codigo: 'VAC' }, select: { id: true } })
    if (!tipoVac) return NextResponse.json([])

    const periodos = await prisma.solicitudAusencia.findMany({
      where: {
        solicitanteId: userId,
        tipoAusenciaId: tipoVac.id,
        estado: { in: ESTADOS_APROBADA },
      },
      select: { id: true, fechaInicio: true, fechaFin: true, diasHabiles: true },
      orderBy: { fechaInicio: 'desc' },
    })

    return NextResponse.json(periodos)
  } catch (error) {
    console.error('[GET /api/ausencias/periodos-vacaciones]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
