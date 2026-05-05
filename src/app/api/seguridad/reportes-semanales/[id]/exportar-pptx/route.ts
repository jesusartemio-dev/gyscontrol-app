import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerReporteAgregado } from '@/lib/services/reporteSeguridad'
import { generarPptReporteSeguridad } from '@/lib/services/pptGenerator'
import { format } from 'date-fns'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'seguridad']

// El PPT puede demorar varios segundos (descarga de 20+ fotos de Drive)
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const agregado = await obtenerReporteAgregado(id)
    if (!agregado) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (
      session.user.role === 'seguridad' &&
      agregado.reporte.ingenieroId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const buffer = await generarPptReporteSeguridad(agregado)

    const codigo = agregado.reporte.proyecto.codigo.replace(/[^a-zA-Z0-9_-]/g, '_')
    const inicio = format(agregado.reporte.fechaInicio, 'yyyy-MM-dd')
    const fin = format(agregado.reporte.fechaFin, 'yyyy-MM-dd')
    const filename = `Reporte_${agregado.reporte.semanaIso}_${codigo}_${inicio}_a_${fin}.pptx`

    const isPreview = req.nextUrl.searchParams.get('preview') === 'true'
    const disposition = isPreview ? 'inline' : 'attachment'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[GET /api/seguridad/reportes-semanales/[id]/exportar-pptx]', e)
    return NextResponse.json(
      { error: 'Error al generar PPT', detalle: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    )
  }
}
