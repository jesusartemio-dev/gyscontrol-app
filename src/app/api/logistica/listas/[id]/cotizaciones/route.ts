import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get all quotations for items in this list
    const quotations = await prisma.cotizacionProveedorItem.findMany({
      where: {
        listaEquipoItem: {
          listaId: id
        }
      },
      include: {
        cotizacion: {
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