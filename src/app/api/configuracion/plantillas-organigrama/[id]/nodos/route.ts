import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: plantillaId } = await params
    const body = await req.json()
    const { cargoLabel, parentId, orden, recursoId, esObligatorio, gysParentLabel, userId } = body

    if (!cargoLabel?.trim()) {
      return NextResponse.json({ error: 'cargoLabel es requerido' }, { status: 400 })
    }

    // Verificar que la plantilla existe
    const plantilla = await prisma.plantillaOrganigrama.findUnique({ where: { id: plantillaId } })
    if (!plantilla) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

    const nodo = await prisma.plantillaOrgNodo.create({
      data: {
        plantillaId,
        cargoLabel: cargoLabel.trim(),
        parentId: parentId || null,
        orden: orden ?? 0,
        recursoId: recursoId || null,
        esObligatorio: esObligatorio ?? true,
        gysParentLabel: gysParentLabel || null,
        userId: userId || null,
      },
      include: {
        recurso: { select: { id: true, nombre: true, tipo: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(nodo, { status: 201 })
  } catch (error) {
    console.error('Error creando nodo plantilla:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
