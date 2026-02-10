// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/clientes/[id]/contactos
// 🔧 Descripción: API para gestión de contactos de clientes CRM
// ✅ GET: Obtener contactos de un cliente
// ✅ POST: Crear nuevo contacto para un cliente
// ===================================================

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener contactos de un cliente
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Obtener contactos del cliente
    const contactos = await prisma.crmContactoCliente.findMany({
      where: { clienteId: id },
      orderBy: [
        { esDecisionMaker: 'desc' }, // Decision makers first
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json(contactos)
  } catch (error) {
    console.error('❌ Error al obtener contactos del cliente:', error)
    return NextResponse.json(
      { error: 'Error al obtener contactos' },
      { status: 500 }
    )
  }
}

// ✅ Crear nuevo contacto para un cliente
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
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
      notas
    } = data

    // Validaciones básicas
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nombre es requerido y debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Crear el contacto
    const nuevoContacto = await prisma.crmContactoCliente.create({
      data: {
        id: `crm-cont-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clienteId: id,
        nombre: nombre.trim(),
        cargo: cargo?.trim(),
        email: email?.trim(),
        telefono: telefono?.trim(),
        celular: celular?.trim(),
        esDecisionMaker: esDecisionMaker || false,
        areasInfluencia: areasInfluencia?.trim(),
        relacionComercial: relacionComercial?.trim(),
        notas: notas?.trim(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(nuevoContacto, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear contacto:', error)

    // Manejar errores de unicidad
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Ya existe un contacto con estos datos' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear contacto' },
      { status: 500 }
    )
  }
}