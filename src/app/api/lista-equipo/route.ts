// ===================================================
// 📁 Archivo: /api/lista-equipo/route.ts
// 🔧 Descripción: API para obtener y crear listas de equipos con código automático por proyecto
// 🧠 Uso: GET para listar por proyecto, POST para crear nueva con código secuencial
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-29
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const listaEquipoSchema = z.object({
  proyectoId: z.string().min(1, 'El proyectoId es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')

    const data = await prisma.listaEquipo.findMany({
      where: {
        ...(proyectoId ? { proyectoId } : {}),
      },
      include: {
        proyecto: true,
        items: {
          include: {
            lista: true, // ✅ Relación agregada
            proveedor: true,
            cotizaciones: true,
            pedidos: true,
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /lista-equipo:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const parsed = listaEquipoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Error de validación', detalles: parsed.error.errors },
        { status: 400 }
      )
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: parsed.data.proyectoId },
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    const ultimaLista = await prisma.listaEquipo.findFirst({
      where: { proyectoId: parsed.data.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
    })

    const nuevoNumero = ultimaLista ? ultimaLista.numeroSecuencia + 1 : 1
    const codigoGenerado = `${proyecto.codigo}-LST-${String(nuevoNumero).padStart(3, '0')}`

    const nuevaLista = await prisma.listaEquipo.create({
      data: {
        proyectoId: parsed.data.proyectoId,
        codigo: codigoGenerado,
        numeroSecuencia: nuevoNumero,
        nombre: parsed.data.nombre,
      },
      include: {
        proyecto: true,
        items: {
          include: {
            lista: true, // ✅ Relación agregada
            proveedor: true,
            cotizaciones: true,
            pedidos: true,
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(nuevaLista)
  } catch (error) {
    console.error('❌ Error en POST /lista-equipo:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
