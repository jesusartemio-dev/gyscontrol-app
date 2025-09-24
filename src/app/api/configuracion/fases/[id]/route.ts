// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/configuracion/fases/[id]/
// 🔧 Descripción: API para gestión individual de fases por defecto
// ✅ GET: Obtener fase por defecto específica
// ✅ PUT: Actualizar fase por defecto
// ✅ DELETE: Desactivar fase por defecto
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-22
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Obtener fase por defecto específica
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
    const faseDefault = await prisma.faseDefault.findUnique({
      where: { id }
    })

    if (!faseDefault) {
      return NextResponse.json(
        { error: 'Fase por defecto no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: faseDefault
    })

  } catch (error: any) {
    console.error('❌ Error al obtener fase por defecto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Actualizar fase por defecto
export async function PUT(
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
    const { nombre, descripcion, orden, porcentajeDuracion, color, activo } = data

    // ✅ Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la fase es obligatorio' },
        { status: 400 }
      )
    }

    // ✅ Verificar que existe
    const faseExistente = await prisma.faseDefault.findUnique({
      where: { id }
    })

    if (!faseExistente) {
      return NextResponse.json(
        { error: 'Fase por defecto no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Actualizar fase por defecto
    const faseActualizada = await prisma.faseDefault.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        orden: orden || 0,
        porcentajeDuracion: porcentajeDuracion || null,
        color: color || null,
        activo: activo !== undefined ? activo : faseExistente.activo
      }
    })

    return NextResponse.json({
      success: true,
      data: faseActualizada,
      message: 'Fase por defecto actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error al actualizar fase por defecto:', error)

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

// ✅ Desactivar fase por defecto (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // ✅ Verificar que existe
    const faseExistente = await (prisma as any).faseDefault.findUnique({
      where: { id }
    })

    if (!faseExistente) {
      return NextResponse.json(
        { error: 'Fase por defecto no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Desactivar fase por defecto (no eliminar físicamente)
    const faseDesactivada = await prisma.faseDefault.update({
      where: { id },
      data: { activo: false }
    })

    return NextResponse.json({
      success: true,
      data: faseDesactivada,
      message: 'Fase por defecto desactivada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error al desactivar fase por defecto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}