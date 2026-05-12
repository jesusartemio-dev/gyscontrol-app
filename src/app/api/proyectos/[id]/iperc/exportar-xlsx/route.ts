import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { descargarPlantillaIperc } from '@/lib/iperc/descargarPlantilla'
import { construirDataBagIperc } from '@/lib/iperc/construirDataBag'

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
      iperc: {
        include: { filas: { orderBy: { numero: 'asc' } } },
      },
    },
  })

  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }
  if (!proyecto.iperc) {
    return NextResponse.json({ error: 'IPERC no existe para este proyecto' }, { status: 404 })
  }
  if (proyecto.iperc.filas.length === 0) {
    return NextResponse.json({ error: 'IPERC sin filas — generá el contenido antes de exportar' }, { status: 422 })
  }

  // Descargar plantilla desde Drive (con cache 30 min)
  let plantillaBuffer: Buffer
  try {
    plantillaBuffer = await descargarPlantillaIperc()
  } catch (e) {
    console.error('[iperc.exportar-xlsx] Error descargando plantilla:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al descargar plantilla' },
      { status: 500 }
    )
  }

  // Construir dataBag
  const dataBag = construirDataBagIperc(proyecto.iperc, proyecto)

  // Llamar al endpoint Python (mismo deployment de Vercel)
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

  let pythonRes: Response
  try {
    pythonRes = await fetch(`${baseUrl}/api/iperc/render-xlsx`, {
      method: 'POST',
      body: formData,
    })
  } catch (e) {
    console.error('[iperc.exportar-xlsx] Error llamando al render Python:', e)
    return NextResponse.json(
      { error: 'No se pudo conectar con el render Python' },
      { status: 500 }
    )
  }

  if (!pythonRes.ok) {
    const errorText = await pythonRes.text().catch(() => 'Error desconocido')
    console.error('[iperc.exportar-xlsx] Render Python falló:', errorText)
    return NextResponse.json(
      { error: `Render falló: ${errorText}` },
      { status: 500 }
    )
  }

  const xlsxBuffer = Buffer.from(await pythonRes.arrayBuffer())
  const fileName = `${proyecto.iperc.codigoDocumento}.xlsx`

  return new NextResponse(xlsxBuffer, {
    status: 200,
    headers: {
      'Content-Type': MIME_XLSX,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(xlsxBuffer.length),
    },
  })
}
