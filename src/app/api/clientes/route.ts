// src/app/api/clientes/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNextClienteCode } from '@/lib/utils/clienteCodeGenerator'

// ✅ GET: Listar todos los clientes
export async function GET() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' } // ✅ Ordenar por fecha de creación
  })
  return NextResponse.json(clientes)
}

// ✅ POST: Crear nuevo cliente
export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // ✅ Validate required fields
    if (!data.codigo) {
      return NextResponse.json(
        { error: 'El código del cliente es obligatorio' },
        { status: 400 }
      )
    }
    
    // ✅ Check if code already exists
    const existingClient = await prisma.cliente.findUnique({
      where: { codigo: data.codigo }
    })
    
    if (existingClient) {
      return NextResponse.json(
        { error: 'Ya existe un cliente con este código' },
        { status: 400 }
      )
    }
    
    console.log('🚀 Creating client with code:', data.codigo)
    
    const nuevo = await prisma.cliente.create({ 
      data: {
        ...data,
        numeroSecuencia: 1 // ✅ Start with sequence 1
      }
    })
    
    console.log('✅ Client created successfully:', nuevo.codigo)
    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error creating client:', error)
    return NextResponse.json(
      { error: 'Error al crear cliente' },
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
