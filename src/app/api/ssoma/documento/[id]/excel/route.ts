import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generarExcelIPERC } from '@/lib/ssoma/exportIperc'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    const doc = await prisma.ssomaDocumento.findUnique({
      where: { id },
      include: {
        expediente: {
          include: { proyecto: { include: { cliente: true } } },
        },
      },
    })
    if (!doc) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (doc.tipo !== 'IPERC') return NextResponse.json({ error: 'No es IPERC' }, { status: 400 })
    if (!doc.contenidoTexto) return NextResponse.json({ error: 'Sin contenido' }, { status: 400 })

    // Parse JSON from AI content
    let ipercData: { filas: any[] }
    try {
      const clean = doc.contenidoTexto
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      ipercData = JSON.parse(clean)
    } catch {
      return NextResponse.json(
        { error: 'El contenido no es JSON válido. Regenera el documento IPERC.' },
        { status: 422 }
      )
    }

    const exp = doc.expediente
    const buffer = await generarExcelIPERC({
      codigo: doc.codigoDocumento,
      revision: doc.revision,
      fecha: new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      proyecto: exp.proyecto.nombre,
      cliente: exp.proyecto.cliente?.nombre ?? '',
      planta: exp.proyecto.descripcion ?? exp.proyecto.cliente?.nombre ?? '',
      ingSeguridad: exp.ingSeguridad ?? '',
      ggNombre: exp.ggNombre ?? '',
      equipoEvaluador: [exp.ingSeguridad ?? '', exp.gestorNombre ?? ''].filter(Boolean),
      filas: ipercData.filas,
    })

    const filename = `${doc.codigoDocumento}.xlsx`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Excel IPERC error:', error)
    return NextResponse.json({ error: 'Error generando Excel' }, { status: 500 })
  }
}
