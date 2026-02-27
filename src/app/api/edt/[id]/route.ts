// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/edt/[id]/
// 🔧 API REST para obtener, actualizar o eliminar EDT
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 🔍 GET
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const edt = await prisma.edt.findUnique({
      where: { id },
      include: {
        catalogoServicio: true,
        faseDefault: true
      },
    })

    return NextResponse.json(edt)
  } catch (error) {
    console.error('❌ Error en GET /edt/[id]:', error)
    return NextResponse.json({ error: 'Error al obtener EDT' }, { status: 500 })
  }
}

// ✏️ PUT
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const body = await req.json()
    const data = await prisma.edt.update({
      where: { id },
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        faseDefaultId: body.faseDefaultId || null // 🆕 campo faseDefaultId
      } as any, // Cast temporal hasta regenerar tipos
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en PUT /edt/[id]:', error)
    return NextResponse.json({ error: 'Error al actualizar EDT' }, { status: 500 })
  }
}

// 🗑️ DELETE
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const existente = await prisma.edt.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cotizacionEdt: true,
            proyectoEdt: true,
            catalogoServicio: true,
          }
        }
      }
    })

    if (!existente) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    // Validar que no esté en uso
    const { cotizacionEdt, proyectoEdt, catalogoServicio } = existente._count
    const totalUso = cotizacionEdt + proyectoEdt + catalogoServicio

    if (totalUso > 0) {
      const detalles: string[] = []
      if (cotizacionEdt > 0) detalles.push(`${cotizacionEdt} cotización(es)`)
      if (proyectoEdt > 0) detalles.push(`${proyectoEdt} proyecto(s)`)
      if (catalogoServicio > 0) detalles.push(`${catalogoServicio} servicio(s)`)

      return NextResponse.json({
        error: `No se puede eliminar. EDT en uso en: ${detalles.join(', ')}`
      }, { status: 409 })
    }

    const data = await prisma.edt.delete({ where: { id } })
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Error en DELETE /edt/[id]:', error)
    return NextResponse.json({ error: 'Error al eliminar EDT' }, { status: 500 })
  }
}
