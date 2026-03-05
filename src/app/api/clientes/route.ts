// src/app/api/clientes/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextClienteCode } from '@/lib/utils/clienteCodeGenerator'

// ✅ GET: Listar todos los clientes
export async function GET() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { cotizacion: true, proyecto: true } }
    }
  })
  return NextResponse.json(clientes)
}

// ✅ POST: Crear nuevo cliente
export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Auto-generate codigo if not provided
    if (!data.codigo || data.codigo.trim() === '') {
      const { codigo, numeroSecuencia } = await generateNextClienteCode()
      data.codigo = codigo
      data.numeroSecuencia = numeroSecuencia
    } else {
      // Check if provided code already exists
      const existingClient = await prisma.cliente.findUnique({
        where: { codigo: data.codigo }
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este código' },
          { status: 400 }
        )
      }
    }

    const nuevo = await prisma.cliente.create({
      data: {
        id: crypto.randomUUID(),
        ...data,
        numeroSecuencia: data.numeroSecuencia ?? 1,
        updatedAt: new Date(),
      }
    })

    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error creating client:', error)
    const message = error instanceof Error ? error.message : 'Error al crear cliente'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// ✅ PUT: Actualizar cliente
export async function PUT(req: Request) {
  const data = await req.json()
  const { id, ...rest } = data
  const actualizado = await prisma.cliente.update({
    where: { id },
    data: { ...rest, updatedAt: new Date() },
  })
  return NextResponse.json(actualizado)
}

// ✅ DELETE: Eliminar cliente
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    
    // 🔍 Verificar si el cliente tiene dependencias
    const clienteConDependencias = await prisma.cliente.findUnique({
      where: { id },
      include: {
        cotizacion: { select: { id: true } },
        proyecto: { select: { id: true } }
      }
    })

    if (!clienteConDependencias) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // 🚫 Verificar si tiene proyectos activos (no se pueden eliminar)
    if (clienteConDependencias.proyecto.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar el cliente porque tiene proyectos asociados',
          details: `El cliente tiene ${clienteConDependencias.proyecto.length} proyecto(s) asociado(s)`
        },
        { status: 400 }
      )
    }

    // 🗑️ Eliminar cotizaciones en cascada y luego el cliente
    await prisma.$transaction(async (tx) => {
      // Eliminar cotizaciones relacionadas (esto eliminará automáticamente sus items por onDelete: Cascade)
      if (clienteConDependencias.cotizacion.length > 0) {
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
