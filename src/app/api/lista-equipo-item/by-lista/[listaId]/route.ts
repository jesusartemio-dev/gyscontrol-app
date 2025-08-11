// ===================================================
// 📁 Archivo: /api/lista-equipo-item/by-lista/[listaId]/route.ts
// 🔧 Descripción: API para obtener ítems de una lista específica
// 🧠 Uso: GET /api/lista-equipo-item/by-lista/:listaId
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-24
// ===================================================
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { listaId: string } }) {
  try {
    const { listaId } = await params

    if (!listaId) {
      return NextResponse.json({ error: 'listaId es obligatorio' }, { status: 400 })
    }

    const data = await prisma.listaEquipoItem.findMany({
      where: { listaId },
      include: {
        proveedor: true,
        cotizaciones: true,
        pedidos: true,
        proyectoEquipo: true, // ✅ Agregado: para equipos nuevos sin proyectoEquipoItem
        proyectoEquipoItem: {
          include: {
            proyectoEquipo: true, // ✅ para obtener nombre del equipo padre desde el item
            listaEquipoSeleccionado: true, // ✅ incluir la relación entera
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en GET /by-lista:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
