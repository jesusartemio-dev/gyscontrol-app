// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/clientes/[id]/contactos/[contactoId]
// 🔧 Descripción: API para operaciones individuales de contactos
// ✅ GET: Obtener contacto específico
// ✅ PUT: Actualizar contacto
// ✅ DELETE: Eliminar contacto
// ===================================================

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener contacto específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, contactoId } = await params

    const contacto = await prisma.crmContactoCliente.findFirst({
      where: {
        id: contactoId,
        clienteId: id // Asegurar que pertenece al cliente correcto
      }
    })

    if (!contacto) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(contacto)
  } catch (error) {
    console.error('❌ Error al obtener contacto:', error)
    return NextResponse.json(
      { error: 'Error al obtener contacto' },
      { status: 500 }
    )
  }
}

// ✅ Actualizar contacto
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, contactoId } = await params
    const data = await req.json()

    const {
      nombre,
      cargo,
      email,
      telefono,
      celular,
      esDecisionMaker,
      areasInfluencia,
      relacionComercial,
      notas,
      fechaUltimoContacto
    } = data

    // Validaciones básicas
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nombre es requerido y debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    // Verificar que el contacto existe y pertenece al cliente
    const contactoExistente = await prisma.crmContactoCliente.findFirst({
      where: {
        id: contactoId,
        clienteId: id
      }
    })

    if (!contactoExistente) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar el contacto
    const contactoActualizado = await prisma.crmContactoCliente.update({
      where: { id: contactoId },
      data: {
        nombre: nombre.trim(),
        cargo: cargo?.trim(),
        email: email?.trim(),
        telefono: telefono?.trim(),
        celular: celular?.trim(),
        esDecisionMaker: esDecisionMaker || false,
        areasInfluencia: areasInfluencia?.trim(),
        relacionComercial: relacionComercial?.trim(),
        notas: notas?.trim(),
        fechaUltimoContacto: fechaUltimoContacto ? new Date(fechaUltimoContacto) : undefined,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(contactoActualizado)
  } catch (error) {
    console.error('❌ Error al actualizar contacto:', error)
    return NextResponse.json(
      { error: 'Error al actualizar contacto' },
      { status: 500 }
    )
  }
}

// ✅ Eliminar contacto
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, contactoId } = await params

    // Verificar que el contacto existe y pertenece al cliente
    const contacto = await prisma.crmContactoCliente.findFirst({
      where: {
        id: contactoId,
        clienteId: id
      }
    })

    if (!contacto) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el contacto
    await prisma.crmContactoCliente.delete({
      where: { id: contactoId }
    })

    return NextResponse.json({ message: 'Contacto eliminado exitosamente' })
  } catch (error) {
    console.error('❌ Error al eliminar contacto:', error)
    return NextResponse.json(
      { error: 'Error al eliminar contacto' },
      { status: 500 }
    )
  }
}