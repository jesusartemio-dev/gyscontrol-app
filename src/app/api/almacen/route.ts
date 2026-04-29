import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const data = await prisma.almacen.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, direccion: true },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al listar almacenes:', error)
    return NextResponse.json({ error: 'Error al listar almacenes' }, { status: 500 })
  }
}
