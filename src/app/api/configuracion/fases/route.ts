// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/configuracion/fases/
// 🔧 Descripción: API para gestión de fases por defecto
// ✅ GET: Listar fases por defecto activas
// ✅ POST: Crear nueva fase por defecto
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-22
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Obtener fases por defecto activas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const fasesDefault = await prisma.faseDefault.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: fasesDefault,
      meta: {
        totalFases: fasesDefault.length
      }
    })

  } catch (error: any) {
    console.error('❌ Error al obtener fases por defecto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva fase por defecto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await request.json()
    const { nombre, descripcion, orden, porcentajeDuracion, color } = data

    // ✅ Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la fase es obligatorio' },
        { status: 400 }
      )
    }

    // ✅ Crear fase por defecto
    const nuevaFaseDefault = await prisma.faseDefault.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        orden: orden || 0,
        porcentajeDuracion: porcentajeDuracion || null,
        color: color || null,
        activo: true
      }
    })

    return NextResponse.json({
      success: true,
      data: nuevaFaseDefault,
      message: 'Fase por defecto creada exitosamente'
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Error al crear fase por defecto:', error)

    // ✅ Manejar errores específicos de Prisma
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una fase por defecto con ese nombre' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
