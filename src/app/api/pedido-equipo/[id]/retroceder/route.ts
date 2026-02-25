import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canRollback, isValidRollback } from '@/lib/utils/rollbackValidation'
import { crearEvento } from '@/lib/utils/trazabilidad'

const ROLES_ALLOWED = ['admin', 'gerente', 'logistico', 'proyectos']

// GET: pre-check sin ejecutar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const target = request.nextUrl.searchParams.get('target')
    if (!target) {
      return NextResponse.json({ error: 'Parámetro "target" requerido' }, { status: 400 })
    }

    const result = await canRollback('pedidoEquipo', id, target)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error en pre-check rollback pedido:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST: ejecutar rollback
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para retroceder' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { targetEstado, motivo } = body as { targetEstado: string; motivo?: string }

    if (!targetEstado) {
      return NextResponse.json({ error: 'targetEstado es requerido' }, { status: 400 })
    }

    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id },
      select: { estado: true, codigo: true, proyectoId: true, listaId: true },
    })
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    if (!isValidRollback('pedidoEquipo', pedido.estado, targetEstado)) {
      return NextResponse.json(
        { error: `No se puede retroceder de "${pedido.estado}" a "${targetEstado}"` },
        { status: 400 }
      )
    }

    const check = await canRollback('pedidoEquipo', id, targetEstado)
    if (!check.allowed) {
      return NextResponse.json(
        { error: check.message, blockers: check.blockers },
        { status: 409 }
      )
    }

    const updated = await prisma.pedidoEquipo.update({
      where: { id },
      data: {
        estado: targetEstado as any,
        updatedAt: new Date(),
      },
    })

    // Registrar evento
    await crearEvento(prisma, {
      pedidoEquipoId: id,
      listaEquipoId: pedido.listaId,
      proyectoId: pedido.proyectoId,
      tipo: 'pedido_retrocedido',
      descripcion: `Pedido ${pedido.codigo} retrocedido de ${pedido.estado} a ${targetEstado}${motivo ? ': ' + motivo : ''}`,
      usuarioId: session.user.id,
      metadata: {
        pedidoCodigo: pedido.codigo,
        estadoAnterior: pedido.estado,
        estadoNuevo: targetEstado,
        motivo: motivo || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al retroceder pedido:', error)
    return NextResponse.json({ error: 'Error al retroceder pedido' }, { status: 500 })
  }
}
