// src/app/api/clientes/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ✅ GET: Listar todos los clientes
export async function GET() {
  const clientes = await prisma.cliente.findMany()
  return NextResponse.json(clientes)
}

// ✅ POST: Crear nuevo cliente
export async function POST(req: Request) {
  const data = await req.json()
  const nuevo = await prisma.cliente.create({ data })
  return NextResponse.json(nuevo)
}

// ✅ PUT: Actualizar cliente
export async function PUT(req: Request) {
  const data = await req.json()
  const { id, ...rest } = data
  const actualizado = await prisma.cliente.update({
    where: { id },
    data: rest,
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
    
    // 🚫 Verificar si tiene proyectos activos (no se pueden eliminar)
    if (clienteConDependencias.proyectos.length > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar el cliente porque tiene proyectos asociados',
          details: `El cliente tiene ${clienteConDependencias.proyectos.length} proyecto(s) asociado(s)`
        },
        { status: 400 }
      )
    }
    
    // 🗑️ Eliminar cotizaciones en cascada y luego el cliente
    await prisma.$transaction(async (tx) => {
      // Eliminar cotizaciones relacionadas (esto eliminará automáticamente sus items por onDelete: Cascade)
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
