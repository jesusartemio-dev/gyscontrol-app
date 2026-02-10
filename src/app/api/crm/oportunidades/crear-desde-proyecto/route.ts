// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/oportunidades/crear-desde-proyecto
// 🔧 Descripción: API para crear oportunidades CRM desde proyectos existentes
// ✅ POST: Crear oportunidad desde proyecto
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
    const { proyectoId, descripcion, tipo } = data

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'ID de proyecto es requerido' },
        { status: 400 }
      )
    }

    // Obtener el proyecto con cliente y cotización
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        cliente: true,
        comercial: true,
        cotizacion: true
      }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    if (!proyecto.cliente) {
      return NextResponse.json(
        { error: 'El proyecto no tiene cliente asociado' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una oportunidad para este proyecto
    const oportunidadExistente = await prisma.crmOportunidad.findFirst({
      where: { proyectoId: proyectoId }
    })

    if (oportunidadExistente) {
      return NextResponse.json(
        { error: 'Ya existe una oportunidad para este proyecto', oportunidad: oportunidadExistente },
        { status: 409 }
      )
    }

    // Determinar el tipo de oportunidad y valor estimado
    let valorEstimado = proyecto.grandTotal
    let nombreOportunidad = proyecto.nombre
    let estadoInicial: 'inicio' | 'contacto_cliente' | 'validacion_tecnica' | 'validacion_comercial' | 'negociacion' | 'seguimiento_proyecto' | 'feedback_mejora' | 'cerrada_ganada' | 'cerrada_perdida' = 'contacto_cliente'

    switch (tipo) {
      case 'upselling':
        nombreOportunidad = `Upselling - ${proyecto.nombre}`
        estadoInicial = 'contacto_cliente'
        // Para upselling, estimar un 20-30% adicional
        valorEstimado = proyecto.grandTotal * 0.25
        break
      case 'mantenimiento':
        nombreOportunidad = `Mantenimiento - ${proyecto.nombre}`
        estadoInicial = 'contacto_cliente'
        // Para mantenimiento, estimar basado en servicios
        valorEstimado = proyecto.totalServiciosInterno * 0.3 // 30% de servicios por año
        break
      case 'seguimiento':
        nombreOportunidad = `Seguimiento - ${proyecto.nombre}`
        estadoInicial = 'seguimiento_proyecto'
        valorEstimado = proyecto.grandTotal * 0.1 // 10% adicional
        break
      default:
        nombreOportunidad = `Oportunidad desde proyecto ${proyecto.nombre}`
        estadoInicial = 'contacto_cliente'
    }

    // Crear la oportunidad
    const oportunidad = await prisma.crmOportunidad.create({
      data: {
        id: crypto.randomUUID(),
        clienteId: proyecto.cliente.id,
        nombre: nombreOportunidad,
        descripcion: descripcion || `Oportunidad creada automáticamente desde el proyecto ${proyecto.nombre}`,
        valorEstimado,
        probabilidad: tipo === 'seguimiento' ? 60 : 40, // Mayor probabilidad para seguimientos
        estado: estadoInicial,
        fuente: tipo || 'proyecto_existente',
        comercialId: session.user.id,
        responsableId: session.user.id,
        proyectoId: proyecto.id,
        fechaCierreEstimada: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 días por defecto
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

    // Crear actividad inicial según el tipo
    let descripcionActividad = `Oportunidad creada desde proyecto ${proyecto.nombre}`

    switch (tipo) {
      case 'upselling':
        descripcionActividad = `Evaluación de oportunidades de upselling para el proyecto ${proyecto.nombre}`
        break
      case 'mantenimiento':
        descripcionActividad = `Planificación de servicios de mantenimiento para el proyecto ${proyecto.nombre}`
        break
      case 'seguimiento':
        descripcionActividad = `Seguimiento post-entrega del proyecto ${proyecto.nombre}`
        break
    }

    await prisma.crmActividad.create({
      data: {
        id: crypto.randomUUID(),
        oportunidadId: oportunidad.id,
        tipo: tipo === 'seguimiento' ? 'seguimiento' : 'llamada',
        descripcion: descripcionActividad,
        fecha: new Date(),
        resultado: 'neutro',
        usuarioId: session.user.id,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(oportunidad, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear oportunidad desde proyecto:', error)
    return NextResponse.json(
      { error: 'Error al crear oportunidad desde proyecto' },
      { status: 500 }
    )
  }
}
