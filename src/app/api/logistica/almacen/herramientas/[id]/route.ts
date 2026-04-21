import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente', 'coordinador_logistico', 'logistico'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { codigo, nombre, categoria, descripcion, fotoUrl, unidadMedida, activo } = body

    // gestionPorUnidad NO es editable: cambiarlo invalidaría el stock existente.
    // Para ajustes de cantidad, se usa el movimiento "ajuste_inventario".

    const existente = await prisma.catalogoHerramienta.findUnique({ where: { id } })
    if (!existente) return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 })

    const data: any = {}
    if (codigo !== undefined) data.codigo = codigo
    if (nombre !== undefined) data.nombre = nombre
    if (categoria !== undefined) data.categoria = categoria
    if (descripcion !== undefined) data.descripcion = descripcion
    if (fotoUrl !== undefined) data.fotoUrl = fotoUrl
    if (unidadMedida !== undefined) data.unidadMedida = unidadMedida
    if (activo !== undefined) data.activo = activo

    const actualizada = await prisma.catalogoHerramienta.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizada)
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'El código ya existe' }, { status: 409 })
    console.error('Error al editar herramienta:', error)
    return NextResponse.json({ error: 'Error al editar herramienta' }, { status: 500 })
  }
}
