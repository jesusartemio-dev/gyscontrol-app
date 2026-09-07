import { tieneRol } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularBancoHoras } from '@/lib/services/bancoHoras'

const ROLES_VER_EQUIPO = ['admin', 'administracion', 'gerente', 'gestor', 'coordinador', 'proyectos']

// GET /api/banco-horas/equipo
// Banco de horas de todo el personal por horas (excluye modalidadTrabajo
// 'confianza', igual que el cron de asistencia) — para /rrhh/saldos-ausencia.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !tieneRol(session, ROLES_VER_EQUIPO)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const empleados = await prisma.empleado.findMany({
      where: { activo: true, modalidadTrabajo: { not: 'confianza' } },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: 'asc' } },
    })

    const resultados = await Promise.all(
      empleados.map(async (e) => {
        const banco = await calcularBancoHoras(e.user.id)
        return {
          user: e.user,
          saldoInicial: banco.saldoInicial,
          fechaCorte: banco.fechaCorte,
          acumulado: banco.acumulado,
        }
      }),
    )

    return NextResponse.json(resultados)
  } catch (error) {
    console.error('[GET /api/banco-horas/equipo]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
