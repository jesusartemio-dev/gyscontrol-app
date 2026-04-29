import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await ctx.params
    const data = await prisma.entregaEPP.findUnique({
      where: { id },
      include: {
        empleado: {
          select: {
            id: true,
            documentoIdentidad: true,
            telefono: true,
            tallaCamisa: true,
            tallaPantalon: true,
            tallaCalzado: true,
            tallaCasco: true,
            cargo: { select: { nombre: true } },
            departamento: { select: { nombre: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
        almacen: { select: { id: true, nombre: true } },
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        centroCosto: { select: { id: true, nombre: true } },
        entregadoPor: { select: { id: true, name: true } },
        items: {
          include: {
            catalogoEpp: {
              include: { unidad: { select: { nombre: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener entrega EPP:', error)
    return NextResponse.json({ error: 'Error al obtener entrega EPP' }, { status: 500 })
  }
}
