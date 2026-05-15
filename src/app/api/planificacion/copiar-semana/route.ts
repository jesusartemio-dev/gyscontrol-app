import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { copiarSemana } from '@/services/planificacion/copiarSemana'

const ROLES_PLANIFICADOR = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const Schema = z.object({
  semanaOrigen: z.string().regex(/^\d{4}-W\d{1,2}$/, 'Formato YYYY-Www requerido'),
  semanaDestino: z.string().regex(/^\d{4}-W\d{1,2}$/, 'Formato YYYY-Www requerido'),
  departamentoId: z.string().optional(),
})

// POST /api/planificacion/copiar-semana
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!ROLES_PLANIFICADOR.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = Schema.parse(body)

    if (data.semanaOrigen === data.semanaDestino) {
      return NextResponse.json(
        { error: 'Semana origen y destino deben ser distintas' },
        { status: 400 },
      )
    }

    const resultado = await copiarSemana(data, session.user.id)
    return NextResponse.json(resultado)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('[POST /api/planificacion/copiar-semana]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
