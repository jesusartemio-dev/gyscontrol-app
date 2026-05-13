import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { descargarPlantillaMpp } from '@/lib/mpp/descargarPlantilla'
import { construirDataBagMpp } from '@/lib/mpp/construirDataBag'

export const maxDuration = 120

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      cliente: true,
      mpp: {
        include: {
          items: {
            include: { mppEppCatalogo: true },
            orderBy: { orden: 'asc' },
          },
        },
      },
    },
  })

  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }
  if (!proyecto.mpp) {
    return NextResponse.json({ error: 'MPP no existe para este proyecto' }, { status: 404 })
  }
  if (proyecto.mpp.items.length === 0) {
    return NextResponse.json(
      { error: 'MPP sin items — generá el contenido antes de exportar' },
      { status: 422 }
    )
  }

  let plantillaBuffer: Buffer
  try {
    plantillaBuffer = await descargarPlantillaMpp()
  } catch (e) {
    console.error('[mpp.exportar-xlsx] Error descargando plantilla:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al descargar plantilla' },
      { status: 500 }
    )
  }

  const dataBag = construirDataBagMpp(proyecto.mpp, proyecto)

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const formData = new FormData()
  formData.append(
    'plantilla',
    new Blob([plantillaBuffer], { type: MIME_XLSX }),
    'plantilla.xlsx'
  )
  formData.append('dataBag', JSON.stringify(dataBag))

  const internalHeaders: HeadersInit = {}
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    internalHeaders['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    internalHeaders['x-vercel-set-bypass-cookie'] = 'true'
  }

  let pythonRes: Response
  try {
    pythonRes = await fetch(`${baseUrl}/api/mpp/render-xlsx`, {
      method: 'POST',
      headers: internalHeaders,
      body: formData,
    })
  } catch (e) {
    console.error('[mpp.exportar-xlsx] Error llamando al render Python:', e)
    return NextResponse.json(
      { error: 'No se pudo conectar con el render Python' },
      { status: 500 }
    )
  }

  if (!pythonRes.ok) {
    const errorText = await pythonRes.text().catch(() => 'Error desconocido')
    console.error('[mpp.exportar-xlsx] Render Python falló:', errorText)
    return NextResponse.json(
      { error: `Render falló: ${errorText}` },
      { status: 500 }
    )
  }

  const xlsxBuffer = Buffer.from(await pythonRes.arrayBuffer())
  const fileName = `${proyecto.mpp.codigoDocumento}.xlsx`

  return new NextResponse(xlsxBuffer, {
    status: 200,
    headers: {
      'Content-Type': MIME_XLSX,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(xlsxBuffer.length),
    },
  })
}
