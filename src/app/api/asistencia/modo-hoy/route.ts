import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { determinarModoRemoto } from '@/lib/services/asistencia'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const resultado = await determinarModoRemoto(session.user.id)
  return NextResponse.json(resultado)
}
