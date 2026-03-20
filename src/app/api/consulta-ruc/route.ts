import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { consultarRuc } from '@/lib/utils/consultaSunat'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ruc = req.nextUrl.searchParams.get('ruc')
    if (!ruc) {
      return NextResponse.json({ error: 'Parámetro "ruc" requerido' }, { status: 400 })
    }

    const result = await consultarRuc(ruc)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error en consulta RUC:', error)
    return NextResponse.json({ error: 'Error al consultar RUC' }, { status: 500 })
  }
}
