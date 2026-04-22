import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { determinarModoRemoto } from '@/lib/services/asistencia'

// Devuelve la modalidad contractual del usuario + cómo aplica hoy.
// Pensado para mostrar al propio trabajador su contrato de asistencia.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const userId = session.user.id

  const [empleado, sedeRemotaAprobada, modoHoy] = await Promise.all([
    prisma.empleado.findUnique({
      where: { userId },
      select: { modalidadTrabajo: true, diasRemoto: true },
    }),
    prisma.ubicacionRemotaPersonal.findFirst({
      where: { userId, estado: 'aprobada' },
      select: { id: true, nombre: true },
    }),
    determinarModoRemoto(userId),
  ])

  return NextResponse.json({
    tieneFicha: !!empleado,
    modalidadTrabajo: empleado?.modalidadTrabajo ?? null,
    diasRemoto: empleado?.diasRemoto ?? [],
    sedeRemotaAprobada,
    modoHoy,
  })
}
