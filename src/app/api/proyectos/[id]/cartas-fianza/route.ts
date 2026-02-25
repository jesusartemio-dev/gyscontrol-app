import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador']

const cartaFianzaSchema = z.object({
  tipo: z.enum(['fiel_cumplimiento', 'adelanto', 'garantia', 'beneficios_sociales']),
  entidadFinanciera: z.string().min(1),
  numeroCarta: z.string().optional(),
  moneda: z.enum(['USD', 'PEN']).default('USD'),
  monto: z.number().positive(),
  fechaEmision: z.string().transform(s => new Date(s)),
  fechaVencimiento: z.string().transform(s => new Date(s)),
  notas: z.string().optional(),
  cartaRenovadaId: z.string().optional(),
})

// GET — List cartas fianza for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: proyectoId } = await params

    const cartas = await prisma.cartaFianza.findMany({
      where: { proyectoId },
      include: {
        adjuntos: { select: { id: true, nombreArchivo: true, urlArchivo: true, tipoArchivo: true, tamano: true } },
        cartaRenovada: { select: { id: true, numeroCarta: true, tipo: true } },
        renovaciones: { select: { id: true, numeroCarta: true, estado: true, fechaVencimiento: true } },
      },
      orderBy: { fechaVencimiento: 'asc' },
    })

    return NextResponse.json({ cartas })
  } catch (error) {
    console.error('Error al listar cartas fianza:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST — Create a new carta fianza
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: proyectoId } = await params
    const body = await request.json()
    const data = cartaFianzaSchema.parse(body)

    // Verify project exists
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // If renovating, mark old carta as "renovada"
    if (data.cartaRenovadaId) {
      await prisma.cartaFianza.update({
        where: { id: data.cartaRenovadaId },
        data: { estado: 'renovada', updatedAt: new Date() },
      })
    }

    const carta = await prisma.cartaFianza.create({
      data: {
        proyectoId,
        tipo: data.tipo,
        entidadFinanciera: data.entidadFinanciera,
        numeroCarta: data.numeroCarta,
        moneda: data.moneda,
        monto: data.monto,
        fechaEmision: data.fechaEmision,
        fechaVencimiento: data.fechaVencimiento,
        notas: data.notas,
        cartaRenovadaId: data.cartaRenovadaId,
        updatedAt: new Date(),
      },
      include: {
        adjuntos: true,
        cartaRenovada: { select: { id: true, numeroCarta: true, tipo: true } },
      },
    })

    return NextResponse.json({ carta }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Error al crear carta fianza:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT — Update a carta fianza
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...rest } = body
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const updateSchema = z.object({
      tipo: z.enum(['fiel_cumplimiento', 'adelanto', 'garantia', 'beneficios_sociales']).optional(),
      estado: z.enum(['vigente', 'por_vencer', 'vencida', 'ejecutada', 'devuelta', 'renovada']).optional(),
      entidadFinanciera: z.string().min(1).optional(),
      numeroCarta: z.string().optional(),
      moneda: z.enum(['USD', 'PEN']).optional(),
      monto: z.number().positive().optional(),
      fechaEmision: z.string().transform(s => new Date(s)).optional(),
      fechaVencimiento: z.string().transform(s => new Date(s)).optional(),
      notas: z.string().optional(),
    })

    const data = updateSchema.parse(rest)

    const carta = await prisma.cartaFianza.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        adjuntos: true,
        cartaRenovada: { select: { id: true, numeroCarta: true, tipo: true } },
        renovaciones: { select: { id: true, numeroCarta: true, estado: true, fechaVencimiento: true } },
      },
    })

    return NextResponse.json({ carta })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Error al actualizar carta fianza:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE — Delete a carta fianza
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!['admin', 'gerente'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    await prisma.cartaFianza.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar carta fianza:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
