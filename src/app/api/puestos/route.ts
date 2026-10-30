// Catálogo de puestos: lo consumen el selector de Personal y la edición de
// plantillas de organigrama.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const puestos = await prisma.puesto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, rolFuncional: true, categoria: true, vaACampo: true },
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
  })

  return NextResponse.json(puestos)
}
