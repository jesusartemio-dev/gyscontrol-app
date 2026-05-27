import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mesParamSchema } from '@/lib/validators/informeMensual'
import {
  tipoRegistroSeguridadEnum,
  type TipoRegistroSeguridad,
} from '@/lib/validators/registroSeguridad'
import { rangoMes } from '@/lib/utils/periodoMes'
import { descargarBufferDrive } from '@/lib/services/driveImageLoader'
import { zipSync, type Zippable } from 'fflate'

export const maxDuration = 120

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']

const TIPO_CARPETA: Record<TipoRegistroSeguridad, string> = {
  charla:            '01_Charlas',
  inspeccion:        '02_Inspecciones',
  observacion:       '03_Observaciones',
  incidente:         '04_Incidentes',
  riesgo_critico:    '05_Riesgos_criticos',
  actividad_general: '06_Actividad_general',
  medio_ambiente:    '07_Medio_ambiente',
  prevencion_salud:  '08_Prevencion_salud',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ proyectoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { proyectoId } = await params
    const mesRaw = req.nextUrl.searchParams.get('mes') ?? ''
    const tipoRaw = req.nextUrl.searchParams.get('tipo')

    const mesParsed = mesParamSchema.safeParse(mesRaw)
    if (!mesParsed.success)
      return NextResponse.json({ error: 'Parámetro mes inválido' }, { status: 400 })

    const tipoParsed = tipoRaw ? tipoRegistroSeguridadEnum.safeParse(tipoRaw) : null
    if (tipoParsed && !tipoParsed.success)
      return NextResponse.json({ error: 'Tipo de registro inválido' }, { status: 400 })
    const tipo = tipoParsed?.data ?? null

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, codigo: true },
    })
    if (!proyecto)
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const { fechaInicio, fechaFin } = rangoMes(mesParsed.data)

    const fotos = await prisma.registroSeguridadFoto.findMany({
      where: {
        driveFileId: { not: null },
        registro: {
          ...(tipo ? { tipo } : {}),
          evidencia: {
            jornada: {
              proyectoId,
              fechaTrabajo: { gte: fechaInicio, lte: fechaFin },
            },
          },
        },
      },
      select: {
        id: true,
        nombreArchivo: true,
        driveFileId: true,
        tipoArchivo: true,
        orden: true,
        registro: {
          select: {
            tipo: true,
            evidencia: {
              select: {
                jornada: { select: { fechaTrabajo: true } },
              },
            },
          },
        },
      },
      orderBy: [{ registro: { tipo: 'asc' } }, { orden: 'asc' }],
    })

    if (fotos.length === 0)
      return NextResponse.json({ error: 'No hay fotos en este período' }, { status: 404 })

    // Download photos from Drive in batches of 4 to respect rate limits
    const BATCH = 4
    const archiveFiles: Zippable = {}
    const counters: Record<string, number> = {}

    for (let i = 0; i < fotos.length; i += BATCH) {
      const batch = fotos.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(async (foto) => {
          if (!foto.driveFileId) return null
          const data = await descargarBufferDrive(foto.driveFileId)
          if (!data) return null
          return { foto, data }
        }),
      )
      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const { foto, data } = result.value
        const tipoFoto = foto.registro.tipo as TipoRegistroSeguridad
        const carpeta = TIPO_CARPETA[tipoFoto]
        const fecha = new Date(foto.registro.evidencia.jornada.fechaTrabajo)
          .toISOString()
          .slice(0, 10)
        counters[carpeta] = (counters[carpeta] ?? 0) + 1
        const n = String(counters[carpeta]).padStart(2, '0')
        const ext =
          foto.tipoArchivo?.split('/')[1] ??
          foto.nombreArchivo.split('.').pop() ??
          'jpg'
        archiveFiles[`${carpeta}/${fecha}_${n}.${ext}`] = [
          new Uint8Array(data.buffer),
          { level: 0 },
        ]
      }
    }

    if (Object.keys(archiveFiles).length === 0)
      return NextResponse.json({ error: 'No se pudieron descargar las fotos' }, { status: 502 })

    const zipBuffer = zipSync(archiveFiles)
    const zipNombre = tipo
      ? `${proyecto.codigo}_${TIPO_CARPETA[tipo]}_${mesParsed.data}.zip`
      : `${proyecto.codigo}_fotos_${mesParsed.data}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipNombre}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[fotos-zip] Error:', error)
    return NextResponse.json({ error: 'Error al generar el ZIP' }, { status: 500 })
  }
}

