// src/app/api/clientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        cotizaciones: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            totalCliente: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        proyectos: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            totalCliente: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(cliente)
  } catch (error) {
    console.error('❌ Error al obtener cliente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const cliente = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    const actualizado = await prisma.cliente.update({
      where: { id },
      data
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar cliente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar si el cliente existe y tiene dependencias
    const clienteConDependencias = await prisma.cliente.findUnique({
      where: { id },
      include: {
        cotizaciones: { select: { id: true } },
        proyectos: { select: { id: true } }
      }
    })

    if (!clienteConDependencias) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si tiene proyectos activos (no se pueden eliminar)
    if (clienteConDependencias.proyectos.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar el cliente porque tiene proyectos asociados',
          details: `El cliente tiene ${clienteConDependencias.proyectos.length} proyecto(s) asociado(s)`
        },
        { status: 400 }
      )
    }

    // Eliminar cotizaciones en cascada y luego el cliente
    await prisma.$transaction(async (tx) => {
      // Eliminar cotizaciones relacionadas
      if (clienteConDependencias.cotizaciones.length > 0) {
        await tx.cotizacion.deleteMany({
          where: { clienteId: id }
        })
      }

      // Eliminar el cliente
      await tx.cliente.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Error al eliminar cliente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar cliente' },
      { status: 500 }
    )
  }
}