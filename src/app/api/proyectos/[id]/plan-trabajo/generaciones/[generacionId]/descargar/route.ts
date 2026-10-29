import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileContent, getFileContentRango } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Bajo el tope de ~4.5MB de una respuesta de función en Vercel. */
const TAMANIO_PARTE_BYTES = 3 * 1024 * 1024

/**
 * Sin parámetros devuelve el archivo completo (solo sirve si pesa menos de
 * ~4.5MB). Con `?desde=N` devuelve la parte que empieza en el byte N (hasta
 * TAMANIO_PARTE_BYTES) y el total en X-Total-Bytes: el navegador pide partes
 * hasta completar el archivo (ver descargarGeneracionPorPartes.ts).
 */
export async function GET(req: NextRequest, { params }: Ctx) {
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

  const desde = req.nextUrl.searchParams.get('desde')
  if (desde !== null) {
    const inicio = Math.max(0, Number(desde) || 0)
    try {
      const { data, total } = await getFileContentRango(generacion.driveFileId, inicio, inicio + TAMANIO_PARTE_BYTES - 1)
      return new NextResponse(data, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(data.length), 'X-Total-Bytes': String(total) },
      })
    } catch (e) {
      console.error('[descargar-generacion] Error leyendo parte desde Drive:', e)
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al descargar desde Drive' }, { status: 502 })
    }
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
