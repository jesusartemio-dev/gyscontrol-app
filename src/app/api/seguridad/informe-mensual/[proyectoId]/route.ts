import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { mesParamSchema } from '@/lib/validators/informeMensual'
import { obtenerInformeMensual } from '@/lib/services/informeMensualSeguridad'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ proyectoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado — debe iniciar sesión' }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role ?? ''
    if (!ROLES_PERMITIDOS.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos para ver informes de seguridad' }, { status: 403 })
    }

    const { proyectoId } = await params

    const mes = req.nextUrl.searchParams.get('mes') ?? ''
    const parsed = mesParamSchema.safeParse(mes)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Parámetro mes inválido. Formato esperado: YYYY-MM (ej. 2026-05)',
          detalles: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const data = await obtenerInformeMensual(proyectoId, parsed.data)
    if (!data) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[GET /api/seguridad/informe-mensual/[proyectoId]]', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 },
    )
  }
}
