import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirDataBagPets } from '@/lib/pets/construirDataBag'
import { renderizarPetsDocx } from '@/lib/pets/exportDocx'

export const maxDuration = 120

type Ctx = { params: Promise<{ id: string }> }

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ROLES_CON_ACCESO = ['admin', 'gerente', 'gestor', 'seguridad', 'comercial']

async function verificarAcceso(proyectoId: string, userId: string, role: string) {
  const proy = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { gestorId: true, supervisorId: true, liderId: true, comercialId: true },
  })
  if (!proy) return { ok: false as const, status: 404, error: 'Proyecto no encontrado' }

  const esAsignado =
    proy.gestorId === userId ||
    proy.supervisorId === userId ||
    proy.liderId === userId ||
    proy.comercialId === userId

  if (!ROLES_CON_ACCESO.includes(role) && !esAsignado) {
    return { ok: false as const, status: 403, error: 'Sin acceso a este proyecto' }
  }

  return { ok: true as const }
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id: proyectoId } = await params
  const acceso = await verificarAcceso(proyectoId, session.user.id, session.user.role)
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status })

  const pets = await prisma.pets.findUnique({ where: { proyectoId } })
  if (!pets) return NextResponse.json({ error: 'PETS no encontrado' }, { status: 404 })
  if (!pets.contenido) {
    return NextResponse.json(
      { error: 'El PETS no tiene contenido generado aún' },
      { status: 422 }
    )
  }

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: { cliente: true },
  })
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  let dataBag: ReturnType<typeof construirDataBagPets>
  try {
    dataBag = construirDataBagPets(pets, proyecto)
  } catch (e) {
    console.error('[pets/exportar-docx] construirDataBag error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al construir datos' },
      { status: 422 }
    )
  }

  let docxBuffer: Buffer
  try {
    docxBuffer = await renderizarPetsDocx({ dataBag: dataBag as unknown as Record<string, unknown> })
  } catch (e) {
    console.error('[pets/exportar-docx] render error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al generar DOCX' },
      { status: 500 }
    )
  }

  const archivoNombre = `PETS_${proyecto.codigo}_Rev${pets.revision ?? '01'}.docx`
  const headers = new Headers()
  headers.set('Content-Type', MIME_DOCX)
  headers.set('Content-Disposition', `attachment; filename="${archivoNombre}"`)
  headers.set('Content-Length', String(docxBuffer.length))

  return new NextResponse(docxBuffer, { status: 200, headers })
}
