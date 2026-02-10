// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/oportunidades/crear-desde-cotizacion
// 🔧 Descripción: API para crear oportunidades CRM desde cotizaciones existentes
// ✅ POST: Crear oportunidad desde cotización
// ===================================================

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { cotizacionId, descripcion } = data

    if (!cotizacionId) {
      return NextResponse.json(
        { error: 'ID de cotización es requerido' },
        { status: 400 }
      )
    }

    // Obtener la cotización con cliente
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        user: true
      }
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    if (!cotizacion.cliente) {
      return NextResponse.json(
        { error: 'La cotización no tiene cliente asociado' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una oportunidad para esta cotización
    const oportunidadExistente = await prisma.crmOportunidad.findFirst({
      where: { cotizacionId }
    })

    if (oportunidadExistente) {
      return NextResponse.json(
        { error: 'Ya existe una oportunidad para esta cotización', oportunidad: oportunidadExistente },
        { status: 409 }
      )
    }

    // Crear la oportunidad
    const oportunidad = await prisma.crmOportunidad.create({
      data: {
        id: crypto.randomUUID(),
        clienteId: cotizacion.cliente.id,
        nombre: cotizacion.nombre || `Oportunidad desde cotización ${cotizacion.codigo}`,
        descripcion: descripcion || `Oportunidad creada automáticamente desde la cotización ${cotizacion.codigo}`,
        valorEstimado: cotizacion.grandTotal,
        probabilidad: 50, // Probabilidad inicial por defecto
        estado: 'contacto_cliente',
        fuente: 'cotizacion_existente',
        comercialId: session.user.id,
        responsableId: session.user.id,
        cotizacionId: cotizacion.id,
        fechaCierreEstimada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        updatedAt: new Date()
      },
      include: {
        cliente: {
          select: { nombre: true, codigo: true }
        },
        comercial: {
          select: { name: true }
        }
      }
    })

    // Crear actividad inicial
    await prisma.crmActividad.create({
      data: {
        id: crypto.randomUUID(),
        oportunidadId: oportunidad.id,
        tipo: 'seguimiento',
        descripcion: `Oportunidad creada desde cotización ${cotizacion.codigo}`,
        fecha: new Date(),
        resultado: 'neutro',
        usuarioId: session.user.id,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(oportunidad, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear oportunidad desde cotización:', error)
    return NextResponse.json(
      { error: 'Error al crear oportunidad desde cotización' },
      { status: 500 }
    )
  }
}
