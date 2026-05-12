import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const EVALUADORES_DEFAULT = [
  { nombre: 'Ing. Yony Apaza Arpasi',        cargo: 'Supervisor SSOMA' },
  { nombre: 'Ing. Jesús Mamani Velásquez',    cargo: 'Responsable SSOMA' },
  { nombre: 'Ing. Carlos Sihuayro Ancco',     cargo: 'Especialista SSOMA' },
]

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  const todos = await prisma.iperc.findMany({ select: { id: true, evaluadores: true } })

  let actualizados = 0
  for (const iperc of todos) {
    const evs = iperc.evaluadores as unknown[]
    if (!evs || evs.length === 0) {
      await prisma.iperc.update({
        where: { id: iperc.id },
        data: { evaluadores: EVALUADORES_DEFAULT },
      })
      actualizados++
    }
  }

  return NextResponse.json({
    ok: true,
    revisados: todos.length,
    actualizados,
    mensaje: `${actualizados} de ${todos.length} IPERCs actualizados con evaluadores por defecto`,
  })
}
