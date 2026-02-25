import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canRollback, isValidRollback } from '@/lib/utils/rollbackValidation'
import { crearEvento } from '@/lib/utils/trazabilidad'

const ROLES_ALLOWED = ['admin', 'gerente', 'logistico']

// GET: pre-check sin ejecutar el rollback
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

    const result = await canRollback('ordenCompra', id, target)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error en pre-check rollback OC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST: ejecutar el rollback
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

    // Verificar estado actual y validar transición
    const oc = await prisma.ordenCompra.findUnique({
      where: { id },
      select: { estado: true, numero: true, proyectoId: true },
    })
    if (!oc) {
      return NextResponse.json({ error: 'Orden de compra no encontrada' }, { status: 404 })
    }

    if (!isValidRollback('ordenCompra', oc.estado, targetEstado)) {
      return NextResponse.json(
        { error: `No se puede retroceder de "${oc.estado}" a "${targetEstado}"` },
        { status: 400 }
      )
    }

    // Validar dependientes
    const check = await canRollback('ordenCompra', id, targetEstado)
    if (!check.allowed) {
      return NextResponse.json(
        { error: check.message, blockers: check.blockers },
        { status: 409 }
      )
    }

    // Campos a limpiar según target
    const cleanFields: Record<string, null> = {}
    if (targetEstado === 'borrador') {
      cleanFields.fechaAprobacion = null
      cleanFields.aprobadorId = null
    } else if (targetEstado === 'aprobada') {
      cleanFields.fechaEnvio = null
    }

    const updated = await prisma.ordenCompra.update({
      where: { id },
      data: {
        estado: targetEstado as any,
        ...cleanFields,
        updatedAt: new Date(),
      },
      include: {
        proveedor: true,
        solicitante: { select: { id: true, name: true, email: true } },
        aprobador: { select: { id: true, name: true, email: true } },
        items: true,
      },
    })

    // Registrar evento de trazabilidad
    await crearEvento(prisma, {
      proyectoId: oc.proyectoId,
      tipo: 'oc_retrocedida',
      descripcion: `OC ${oc.numero} retrocedida de ${oc.estado} a ${targetEstado}${motivo ? ': ' + motivo : ''}`,
      usuarioId: session.user.id,
      metadata: {
        ordenCompraId: id,
        ocNumero: oc.numero,
        estadoAnterior: oc.estado,
        estadoNuevo: targetEstado,
        motivo: motivo || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al retroceder OC:', error)
    return NextResponse.json({ error: 'Error al retroceder orden de compra' }, { status: 500 })
  }
}
