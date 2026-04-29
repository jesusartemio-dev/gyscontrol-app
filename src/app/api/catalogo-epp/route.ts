import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const includeRelations = {
  unidad: { select: { id: true, nombre: true } },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const subcategoria = searchParams.get('subcategoria')
    const activo = searchParams.get('activo')
    const busqueda = searchParams.get('busqueda')

    const where: any = {}
    if (subcategoria) where.subcategoria = subcategoria
    if (activo !== null && activo !== undefined) where.activo = activo === 'true'
    if (busqueda) {
      where.OR = [
        { codigo: { contains: busqueda, mode: 'insensitive' } },
        { descripcion: { contains: busqueda, mode: 'insensitive' } },
        { marca: { contains: busqueda, mode: 'insensitive' } },
        { modelo: { contains: busqueda, mode: 'insensitive' } },
      ]
    }

    const data = await prisma.catalogoEPP.findMany({
      where,
      include: includeRelations,
      orderBy: [{ subcategoria: 'asc' }, { codigo: 'asc' }],
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener catálogo EPP:', error)
    return NextResponse.json({ error: 'Error al obtener catálogo EPP' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()

    if (!body.codigo || !body.descripcion || !body.unidadId || !body.subcategoria) {
      return NextResponse.json(
        { error: 'codigo, descripcion, unidadId y subcategoria son requeridos' },
        { status: 400 }
      )
    }

    // Validar que requiereTalla, tallaCampo y talla sean coherentes
    if (body.requiereTalla && !body.tallaCampo) {
      return NextResponse.json(
        { error: 'Si requiereTalla=true, tallaCampo es obligatorio' },
        { status: 400 }
      )
    }
    if (body.requiereTalla && !body.talla?.toString().trim()) {
      return NextResponse.json(
        { error: 'Si requiereTalla=true, debes indicar la talla específica de este SKU (ej. M, 40)' },
        { status: 400 }
      )
    }

    const created = await prisma.catalogoEPP.create({
      data: {
        codigo: body.codigo.trim(),
        descripcion: body.descripcion.trim(),
        marca: body.marca?.trim() || null,
        modelo: body.modelo?.trim() || null,
        talla: body.requiereTalla ? body.talla.toString().trim() : null,
        unidadId: body.unidadId,
        subcategoria: body.subcategoria,
        requiereTalla: !!body.requiereTalla,
        tallaCampo: body.requiereTalla ? body.tallaCampo : null,
        vidaUtilDias: body.vidaUtilDias ? Number(body.vidaUtilDias) : null,
        esConsumible: !!body.esConsumible,
        imagenUrl: body.imagenUrl || null,
        precioReferencial: body.precioReferencial ? Number(body.precioReferencial) : null,
        monedaReferencial: body.monedaReferencial || 'PEN',
        activo: body.activo !== false,
      },
      include: includeRelations,
    })

    return NextResponse.json(created)
  } catch (error: any) {
    console.error('Error al crear EPP:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'El código ya existe' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear EPP' }, { status: 500 })
  }
}
