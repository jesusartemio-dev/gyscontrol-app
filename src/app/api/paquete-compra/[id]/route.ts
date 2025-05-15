// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/paquete-compra/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar o eliminar un paquete de compra por ID.
//
// 🧠 Uso: Utilizado en vistas de detalle de paquetes de compra.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-09
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ================================
// 🔍 GET → Obtener un paquete por ID
// ================================
export async function GET(context: any) {
  try {
    const { id } = await context.params

    const paquete = await prisma.paqueteCompra.findUnique({
      where: { id },
      include: {
        items: true,
        proyecto: {
          select: { id: true, nombre: true }
        }
      }
    })

    if (!paquete) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    return NextResponse.json(paquete)
  } catch (error) {
    return NextResponse.json({ error: `Error al obtener paquete: ${String(error)}` }, { status: 500 })
  }
}

// ================================
// ✏️ PUT → Actualizar paquete
// ================================
export async function PUT(context: any) {
  try {
    const { id } = await context.params
    const data = await context.request.json()

    const updated = await prisma.paqueteCompra.update({
      where: { id },
      data
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: `Error al actualizar: ${String(error)}` }, { status: 500 })
  }
}

// ================================
// ❌ DELETE → Eliminar paquete
// ================================
export async function DELETE(context: any) {
  try {
    const { id } = await context.params

    const deleted = await prisma.paqueteCompra.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Paquete eliminado', deleted })
  } catch (error) {
    return NextResponse.json({ error: `Error al eliminar: ${String(error)}` }, { status: 500 })
  }
}
