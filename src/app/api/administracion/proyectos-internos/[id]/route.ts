import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!['admin', 'coordinador', 'gestor'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { nombre, codigo, centroCostoId, gestorId, estado } = body

    const existing = await prisma.proyecto.findFirst({ where: { id, esInterno: true } })
    if (!existing) return NextResponse.json({ error: 'Proyecto interno no encontrado' }, { status: 404 })

    const updateData: any = { updatedAt: new Date() }
    if (nombre !== undefined) updateData.nombre = nombre.trim()
    if (centroCostoId !== undefined) updateData.centroCostoId = centroCostoId
    if (gestorId !== undefined) updateData.gestorId = gestorId
    if (estado !== undefined) updateData.estado = estado
    if (codigo?.trim()) {
      const codigoNuevo = codigo.trim().toUpperCase()
      if (codigoNuevo !== existing.codigo) {
        const existe = await prisma.proyecto.findFirst({ where: { codigo: codigoNuevo, id: { not: id } } })
        if (existe) return NextResponse.json({ error: `El código ${codigoNuevo} ya existe` }, { status: 400 })
        updateData.codigo = codigoNuevo
      }
    }

    const updated = await prisma.proyecto.update({
      where: { id },
      data: updateData,
      select: {
        id: true, codigo: true, nombre: true, estado: true,
        centroCosto: { select: { id: true, nombre: true } },
        gestor: { select: { id: true, name: true } },
        createdAt: true,
      }
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Error al actualizar proyecto interno:', error)
    return NextResponse.json({ error: 'Error al actualizar proyecto interno' }, { status: 500 })
  }
}
