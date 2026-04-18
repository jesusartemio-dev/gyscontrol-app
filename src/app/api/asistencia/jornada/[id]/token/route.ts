import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirPayloadQrSupervisor, generarQrDinamico } from '@/lib/utils/qrTotp'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const jornada = await prisma.jornadaAsistencia.findUnique({ where: { id } })
  if (!jornada) return NextResponse.json({ message: 'No encontrada' }, { status: 404 })
  if (jornada.supervisorId !== session.user.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }
  if (!jornada.activa) {
    return NextResponse.json({ message: 'Jornada cerrada' }, { status: 400 })
  }

  const { token, expiraEn } = generarQrDinamico(jornada.qrSecret, jornada.id)
  return NextResponse.json({
    payload: construirPayloadQrSupervisor(jornada.id, token),
    expiraEn,
  })
}
