import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function isCronogramaBloqueado(cronogramaId: string): Promise<boolean> {
  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { id: cronogramaId },
    select: { bloqueado: true, tipo: true }
  })
  return cronograma?.bloqueado === true || cronograma?.tipo === 'comercial'
}

export function cronogramaBloqueadoResponse() {
  return NextResponse.json(
    { error: 'Este cronograma está bloqueado y no permite modificaciones' },
    { status: 403 }
  )
}
