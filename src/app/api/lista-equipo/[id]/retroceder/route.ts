import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canRollback, isValidRollback } from '@/lib/utils/rollbackValidation'
import { crearEvento } from '@/lib/utils/trazabilidad'

// Roles que pueden retroceder: los mismos que aprueban/validan
const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'logistico', 'coordinador']

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

    const result = await canRollback('listaEquipo', id, target)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error en pre-check rollback lista:', error)
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

    const lista = await prisma.listaEquipo.findUnique({
      where: { id },
      select: { estado: true, codigo: true, proyectoId: true },
    })
    if (!lista) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
    }

    if (!isValidRollback('listaEquipo', lista.estado, targetEstado)) {
      return NextResponse.json(
        { error: `No se puede retroceder de "${lista.estado}" a "${targetEstado}"` },
        { status: 400 }
      )
    }

    const check = await canRollback('listaEquipo', id, targetEstado)
    if (!check.allowed) {
      return NextResponse.json(
        { error: check.message, blockers: check.blockers },
        { status: 409 }
      )
    }

    // Campos a limpiar según target
    const cleanFields: Record<string, null> = {}
    if (targetEstado === 'por_cotizar') {
      cleanFields.fechaFinCotizacion = null
    } else if (targetEstado === 'por_validar') {
      cleanFields.fechaValidacion = null
    }

    const updated = await prisma.listaEquipo.update({
      where: { id },
      data: {
        estado: targetEstado as any,
        ...cleanFields,
        updatedAt: new Date(),
      },
    })

    // Registrar evento
    await crearEvento(prisma, {
      listaEquipoId: id,
      proyectoId: lista.proyectoId,
      tipo: 'lista_retrocedida',
      descripcion: `Lista ${lista.codigo} retrocedida de ${lista.estado} a ${targetEstado}${motivo ? ': ' + motivo : ''}`,
      usuarioId: session.user.id,
      metadata: {
        listaCodigo: lista.codigo,
        estadoAnterior: lista.estado,
        estadoNuevo: targetEstado,
        motivo: motivo || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al retroceder lista:', error)
    return NextResponse.json({ error: 'Error al retroceder lista' }, { status: 500 })
  }
}
