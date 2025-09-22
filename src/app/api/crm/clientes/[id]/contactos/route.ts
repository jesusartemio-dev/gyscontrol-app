// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/clientes/[id]/contactos
// 🔧 Descripción: API para gestionar contactos de clientes CRM
// ✅ GET: Obtener contactos, POST: Crear contacto
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ✅ GET /api/crm/clientes/[id]/contactos - Obtener contactos del cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const contactos = await prisma.crmContactoCliente.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(contactos)
  } catch (error) {
    console.error('❌ Error al obtener contactos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ POST /api/crm/clientes/[id]/contactos - Crear nuevo contacto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await request.json()
    const { nombre, cargo, email, telefono, celular, esDecisionMaker, areasInfluencia, relacionComercial, notas } = data

    // Validar cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const nuevoContacto = await prisma.crmContactoCliente.create({
      data: {
        clienteId: id,
        nombre,
        cargo,
        email,
        telefono,
        celular,
        esDecisionMaker: esDecisionMaker || false,
        areasInfluencia,
        relacionComercial,
        notas
      }
    })

    return NextResponse.json(nuevoContacto, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear contacto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}