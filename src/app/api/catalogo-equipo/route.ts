import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { createId } from '@paralleldrive/cuid2'

// 📥 CatalogoEquipo Payload (importar desde tus types si quieres hacerlo aún más estricto)
// O validar manualmente aquí.

export async function GET() {
  try {
    const equipos = await prisma.catalogoEquipo.findMany({
      include: {
        categoriaEquipo: true,
        unidad: true,
        _count: {
          select: {
            cotizacionEquipoItem: true,
            proyectoEquipoCotizadoItem: true,
            listaEquipoItem: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(equipos)
  } catch (error) {
    console.error('❌ Error al obtener equipos:', error)
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // 🔎 Validación mínima de campos requeridos
    const requiredFields = ['codigo', 'descripcion', 'marca', 'precioInterno', 'margen', 'precioVenta', 'categoriaId', 'unidadId', 'estado']
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json({ error: `Falta el campo obligatorio: ${field}` }, { status: 400 })
      }
    }

    const nuevo = await prisma.catalogoEquipo.create({
      data: {
        id: createId(),
        codigo: data.codigo,
        descripcion: data.descripcion,
        marca: data.marca,
        precioInterno: data.precioInterno,
        margen: data.margen,
        precioVenta: data.precioVenta,
        categoriaId: data.categoriaId,
        unidadId: data.unidadId,
        estado: data.estado,
        updatedAt: new Date(),
      },
      include: {
        categoriaEquipo: true,
        unidad: true,
      }
    })

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('❌ Error al crear equipo:', error)
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 })
  }
}
