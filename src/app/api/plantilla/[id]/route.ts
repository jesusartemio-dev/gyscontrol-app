// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/plantilla/[id]
// 🔧 Descripción: API para obtener, actualizar o eliminar una plantilla
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-05-01
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic' // ✅ recomendado por Next.js para rutas dinámicas

// ✅ Obtener una plantilla por ID (completa o independiente)
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // ✅ Primero intentar obtener plantilla completa
    let plantilla = await prisma.plantilla.findUnique({
      where: { id },
      include: {
        equipos: {
          include: {
            items: true,
          },
        },
        servicios: {
          include: {
            items: {
              include: {
                catalogoServicio: true,
                recurso: true,
                unidadServicio: true,
              },
            },
          },
        },
        gastos: {
          include: {
            items: true,
          },
        },
      },
    })

    if (plantilla) {
      return NextResponse.json(plantilla)
    }

    // ✅ Si no es completa, buscar en plantillas independientes
    // Buscar en equipos independientes
    const plantillaEquipos = await prisma.plantillaEquipoIndependiente.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            catalogoEquipo: true
          }
        },
        _count: {
          select: { items: true }
        }
      },
    })

    if (plantillaEquipos) {
      return NextResponse.json(plantillaEquipos)
    }

    // Buscar en servicios independientes
    const plantillaServicios = await prisma.plantillaServicioIndependiente.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            catalogoServicio: true,
            recurso: true,
            unidadServicio: true
          }
        },
        _count: {
          select: { items: true }
        }
      },
    })

    if (plantillaServicios) {
      return NextResponse.json(plantillaServicios)
    }

    // Buscar en gastos independientes
    const plantillaGastos = await prisma.plantillaGastoIndependiente.findUnique({
      where: { id },
      include: {
        items: true,
        _count: {
          select: { items: true }
        }
      },
    })

    if (plantillaGastos) {
      return NextResponse.json(plantillaGastos)
    }

    // ✅ Si no se encuentra en ninguna tabla
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  } catch (error) {
    console.error('❌ Error al obtener plantilla:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ Actualizar una plantilla (completa o independiente)
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // ✅ Intentar actualizar en tabla principal Plantilla
    try {
      const actualizada = await prisma.plantilla.update({
        where: { id },
        data: data,
      })
      return NextResponse.json(actualizada)
    } catch (error) {
      // Si no existe en Plantilla, continuar con independientes
    }

    // ✅ Intentar actualizar en PlantillaEquipoIndependiente
    try {
      const actualizada = await prisma.plantillaEquipoIndependiente.update({
        where: { id },
        data: { nombre: data.nombre }, // Solo actualizar nombre para independientes
      })
      return NextResponse.json(actualizada)
    } catch (error) {
      // Si no existe, continuar
    }

    // ✅ Intentar actualizar en PlantillaServicioIndependiente
    try {
      const actualizada = await prisma.plantillaServicioIndependiente.update({
        where: { id },
        data: { nombre: data.nombre }, // Solo actualizar nombre para independientes
      })
      return NextResponse.json(actualizada)
    } catch (error) {
      // Si no existe, continuar
    }

    // ✅ Intentar actualizar en PlantillaGastoIndependiente
    try {
      const actualizada = await prisma.plantillaGastoIndependiente.update({
        where: { id },
        data: { nombre: data.nombre }, // Solo actualizar nombre para independientes
      })
      return NextResponse.json(actualizada)
    } catch (error) {
      // Si no existe en ninguna tabla
    }

    // ✅ Si no se encontró en ninguna tabla
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  } catch (error) {
    console.error('❌ Error al actualizar plantilla:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ✅ Eliminar una plantilla (completa o independiente)
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // ✅ Intentar eliminar de tabla principal Plantilla
    try {
      await prisma.plantilla.delete({ where: { id } })
      return NextResponse.json({ status: 'ok' })
    } catch (error) {
      // Si no existe en Plantilla, continuar con independientes
    }

    // ✅ Intentar eliminar de PlantillaEquipoIndependiente
    try {
      await prisma.plantillaEquipoIndependiente.delete({ where: { id } })
      return NextResponse.json({ status: 'ok' })
    } catch (error) {
      // Si no existe, continuar
    }

    // ✅ Intentar eliminar de PlantillaServicioIndependiente
    try {
      await prisma.plantillaServicioIndependiente.delete({ where: { id } })
      return NextResponse.json({ status: 'ok' })
    } catch (error) {
      // Si no existe, continuar
    }

    // ✅ Intentar eliminar de PlantillaGastoIndependiente
    try {
      await prisma.plantillaGastoIndependiente.delete({ where: { id } })
      return NextResponse.json({ status: 'ok' })
    } catch (error) {
      // Si no existe en ninguna tabla
    }

    // ✅ Si no se encontró en ninguna tabla
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  } catch (error) {
    console.error('❌ Error al eliminar plantilla:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
