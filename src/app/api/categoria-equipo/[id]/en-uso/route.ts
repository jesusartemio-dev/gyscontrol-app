import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const equiposEnUso = await prisma.catalogoEquipo.findMany({
      where: { categoriaId: id },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        listaEquipoItem: {
          select: {
            listaEquipo: {
              select: {
                nombre: true,
                codigo: true,
                proyecto: { select: { codigo: true, nombre: true } },
              },
            },
          },
          take: 3,
        },
      },
      take: 20,
    })

    return NextResponse.json({ equiposEnUso })
  } catch (error) {
    console.error('Error al verificar uso de categoría:', error)
    return NextResponse.json({ equiposEnUso: [] })
  }
}
