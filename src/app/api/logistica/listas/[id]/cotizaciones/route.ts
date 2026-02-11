import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { id } = await params

    const quotations = await prisma.cotizacionProveedorItem.findMany({
      where: {
        listaEquipoItem: {
          listaId: id
        }
      },
      include: {
        cotizacionProveedor: {
          include: {
            proveedor: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        listaEquipoItem: {
          select: {
            id: true,
            descripcion: true,
            codigo: true,
            cantidad: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      quotations,
      total: quotations.length
    })

  } catch (error) {
    console.error('Error fetching quotations for list:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
