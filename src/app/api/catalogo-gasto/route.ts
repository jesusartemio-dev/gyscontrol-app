import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// src/app/api/catalogo-gasto/route.ts

export async function GET() {
  try {
    const gastos = await prisma.catalogoGasto.findMany({
      include: {
        categoria: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(gastos)
  } catch (error) {
    console.error('Error al obtener gastos:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Validación de campos requeridos
    const requiredFields = ['codigo', 'descripcion', 'categoriaId', 'precioInterno', 'precioVenta']
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json({ error: `Falta el campo obligatorio: ${field}` }, { status: 400 })
      }
    }

    // Verificar si el código ya existe
    const existente = await prisma.catalogoGasto.findUnique({
      where: { codigo: data.codigo }
    })

    if (existente) {
      return NextResponse.json({ error: 'Ya existe un gasto con ese código' }, { status: 400 })
    }

    const nuevo = await prisma.catalogoGasto.create({
      data: {
        codigo: data.codigo,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        cantidad: data.cantidad || 1,
        precioInterno: data.precioInterno,
        margen: data.margen || 0.2,
        precioVenta: data.precioVenta,
        estado: data.estado || 'activo',
      },
      include: {
        categoria: true,
      }
    })

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('Error al crear gasto:', error)
    return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 })
  }
}
