import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerReporteAvanceAgregado } from '@/lib/services/reporteAvance'
import { generarExcelReporteAvance } from '@/lib/services/excelAvanceGenerator'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'

// La descarga de fotos de Drive puede tardar varios segundos.
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const agg = await obtenerReporteAvanceAgregado(id)
    if (!agg) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const buffer = await generarExcelReporteAvance(agg)

    const isPreview = req.nextUrl.searchParams.get('preview') === 'true'
    const disposition = isPreview ? 'inline' : 'attachment'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `${disposition}; filename="${agg.cabecera.nombreArchivo}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/proyectos/reportes-semanales/[id]/exportar-excel]', e)
    return NextResponse.json(
      { error: 'Error al generar Excel', detalle: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    )
  }
}
