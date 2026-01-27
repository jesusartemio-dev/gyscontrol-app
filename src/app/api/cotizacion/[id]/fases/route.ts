// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/[id]/fases/
// 🔧 Descripción: API para gestión de fases de cotización
// ✅ GET: Listar fases de una cotización
// ✅ POST: Crear nueva fase
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-22
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// ✅ Obtener fases de una cotización
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const fases = await prisma.cotizacionFase.findMany({
      where: { cotizacionId: id },
      include: {
        cotizacionEdt: {
          include: {
            edt: true,
            user: true,
            cotizacionActividad: {
              include: {
                cotizacionTarea: {
                  include: {
                    user: true
                  },
                  orderBy: { fechaInicio: 'asc' }
                }
              },
              orderBy: { fechaInicioComercial: 'asc' }
            }
          },
          orderBy: { fechaInicioComercial: 'asc' }
        }
      },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: fases,
      meta: {
        totalFases: fases.length,
        totalEdts: fases.reduce((sum: number, f: any) => sum + f.cotizacionEdt.length, 0),
        totalActividades: fases.reduce((sum: number, f: any) =>
          sum + f.cotizacionEdt.reduce((sumEdt: number, edt: any) => sumEdt + (edt.cotizacionActividad?.length || 0), 0), 0
        ),
        totalTareas: fases.reduce((sum: number, f: any) =>
          sum + f.cotizacionEdt.reduce((sumEdt: number, edt: any) =>
            sumEdt + edt.cotizacionActividad?.reduce((sumAct: number, actividad: any) =>
              sumAct + (actividad.cotizacionTarea?.length || 0), 0
            ) || 0, 0
          ), 0
        )
      }
    })

  } catch (error: any) {
    console.error('❌ Error al obtener fases de cotización:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva fase de cotización
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()
    const { nombre, descripcion, orden, fechaInicioPlan, fechaFinPlan } = data

    // ✅ Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la fase es obligatorio' },
        { status: 400 }
      )
    }

    // ✅ Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id }
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Crear fase
    const nuevaFase = await prisma.cotizacionFase.create({
      data: {
        id: randomUUID(),
        cotizacionId: id,
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        orden: orden || 0,
        fechaInicioPlan: fechaInicioPlan ? new Date(fechaInicioPlan) : null,
        fechaFinPlan: fechaFinPlan ? new Date(fechaFinPlan) : null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: nuevaFase,
      message: 'Fase creada exitosamente'
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Error al crear fase de cotización:', error)

    // ✅ Manejar errores específicos de Prisma
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una fase con ese nombre en esta cotización' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}