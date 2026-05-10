import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileContent } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, generacionId } = await params

  const plan = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!plan) {
    return NextResponse.json({ error: 'Plan de Trabajo no encontrado' }, { status: 404 })
  }

  const generacion = await prisma.planTrabajoGeneracion.findUnique({
    where: { id: generacionId },
    select: { planTrabajoId: true, driveFileId: true, archivoNombre: true },
  })

  if (!generacion || generacion.planTrabajoId !== plan.id) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }

  let fileData: { data: Buffer; mimeType: string; fileName: string }
  try {
    fileData = await getFileContent(generacion.driveFileId)
  } catch (e) {
    console.error('[descargar-generacion] Error desde Drive:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al descargar desde Drive' },
      { status: 502 }
    )
  }

  const headers = new Headers()
  headers.set('Content-Type', fileData.mimeType || MIME_DOCX)
  headers.set('Content-Disposition', `attachment; filename="${generacion.archivoNombre}"`)
  headers.set('Content-Length', String(fileData.data.length))

  return new NextResponse(fileData.data, { status: 200, headers })
}
