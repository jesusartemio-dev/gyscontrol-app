// ===================================================
// 📁 src/app/api/logistica/listas/route.ts
// 🔧 API dedicada para logística → listas filtradas con resumen de cotizaciones
// ✅ Incluye resumen de ítems cotizados, pendientes y respondidos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-27
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EstadoCotizacionProveedor } from '@prisma/client'

export async function GET() {
  try {
    const listas = await prisma.listaEquipo.findMany({
      where: {
        estado: {
          in: ['por_cotizar', 'por_validar', 'por_aprobar'],
        },
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
          },
        },
        items: {
          include: {
            cotizaciones: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 💡 Armar resumen por lista
    const listasConResumen = listas.map((lista) => {
      const totalItems = lista.items.length
      const cotizados = lista.items.filter(i => i.cotizaciones.length > 0).length
      const respondidos = lista.items.filter(i =>
        i.cotizaciones.some(c => c.estado === EstadoCotizacionProveedor.cotizado)
      ).length
      const pendientes = totalItems - cotizados

      return {
        ...lista,
        resumen: {
          totalItems,
          cotizados,
          respondidos,
          pendientes,
        },
      }
    })

    return NextResponse.json(listasConResumen)
  } catch (error) {
    console.error('❌ Error en /api/logistica/listas:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
