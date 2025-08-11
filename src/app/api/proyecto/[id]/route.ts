// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/proyecto/[id]
// 🔧 Descripción: API para manejar GET, PUT y DELETE de proyectos
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener proyecto por ID
export async function GET(_: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
        cotizacion: true,
        equipos: {
          include: {
            items: {
              include: {
                lista: true, // ✅ Incluye la lista para mostrar item.lista?.nombre
                listaEquipoSeleccionado: true
              },
            },
          },
        },
        servicios: { include: { items: true } },
        gastos: { include: { items: true } },
      },
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(proyecto)
  } catch (error) {
    console.error('❌ Error al obtener proyecto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ Actualizar proyecto
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    const actualizado = await prisma.proyecto.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar proyecto:', error)
    return NextResponse.json({ error: 'Error interno al actualizar proyecto' }, { status: 500 })
  }
}

// ✅ Eliminar proyecto
export async function DELETE(_: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params

    await prisma.proyecto.delete({ where: { id } })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar proyecto:', error)
    return NextResponse.json({ error: 'Error al eliminar proyecto' }, { status: 500 })
  }
}
