import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { actualizarEvidenciaSeguridadSchema } from '@/lib/validators/evidenciaSeguridad'
import {
  obtenerEvidenciaPorId,
  cerrarEvidencia,
  reabrirEvidencia,
} from '@/lib/services/evidenciaSeguridad'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']
const ROLES_BYPASS = ['admin', 'gerente', 'gestor']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const evidencia = await obtenerEvidenciaPorId(id)
    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
    }

    return NextResponse.json(evidencia)
  } catch (error) {
    console.error('Error al obtener evidencia:', error)
    return NextResponse.json({ error: 'Error al obtener evidencia' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_PERMITIDOS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const existente = await prisma.evidenciaSeguridad.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        creadoPorId: true,
        jornada: { select: { estado: true } },
      },
    })
    if (!existente) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
    }

    const isBypass = ROLES_BYPASS.includes(session.user.role)
    const isCreador = existente.creadoPorId === session.user.id

    const body = await req.json()
    const parsed = actualizarEvidenciaSeguridadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Reabrir solo admin/gerente/gestor
    if (parsed.data.estado === 'abierta' && existente.estado === 'cerrada' && !isBypass) {
      return NextResponse.json(
        { error: 'Solo admin, gerente o gestor pueden reabrir una evidencia cerrada' },
        { status: 403 },
      )
    }

    // Cerrar: creador, admin, gerente o gestor
    if (parsed.data.estado === 'cerrada' && !isBypass && !isCreador) {
      return NextResponse.json(
        { error: 'Solo el creador, admin, gerente o gestor pueden cerrar una evidencia' },
        { status: 403 },
      )
    }

    if (parsed.data.estado === 'cerrada' && existente.estado === 'abierta') {
      const actualizada = await cerrarEvidencia(id, parsed.data.observaciones ?? undefined)
      return NextResponse.json(actualizada)
    }
    if (parsed.data.estado === 'abierta' && existente.estado === 'cerrada') {
      const actualizada = await reabrirEvidencia(id)
      return NextResponse.json(actualizada)
    }

    // Solo cambio de observaciones
    if (parsed.data.observaciones !== undefined) {
      const actualizada = await prisma.evidenciaSeguridad.update({
        where: { id },
        data: { observaciones: parsed.data.observaciones },
      })
      return NextResponse.json(actualizada)
    }

    return NextResponse.json(existente)
  } catch (error) {
    console.error('Error al actualizar evidencia:', error)
    return NextResponse.json({ error: 'Error al actualizar evidencia' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_BYPASS.includes(session.user.role)) {
      return NextResponse.json({ error: 'Solo admin, gerente o gestor pueden eliminar evidencias' }, { status: 403 })
    }

    const { id } = await params
    const existente = await prisma.evidenciaSeguridad.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existente) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
    }

    await prisma.evidenciaSeguridad.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar evidencia:', error)
    return NextResponse.json({ error: 'Error al eliminar evidencia' }, { status: 500 })
  }
}
