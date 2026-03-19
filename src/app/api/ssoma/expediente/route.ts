import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import {
  buildPromptPETS,
  buildPromptIPERC,
  buildPromptMatrizEPP,
  buildPromptPlanEmergencia,
  buildPromptPAR,
} from '@/lib/ssoma/prompts'
import { getDocSpecs, type SsomaPromptData, type SsomaActividadesAltoRiesgo, type SsomaDocSpec } from '@/lib/ssoma/tipos'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const proyectoId = searchParams.get('proyectoId')
    if (!proyectoId) return NextResponse.json({ error: 'proyectoId requerido' }, { status: 400 })

    const expediente = await prisma.ssomaExpediente.findUnique({
      where: { proyectoId },
      include: {
        documentos: { orderBy: { createdAt: 'asc' } },
        personal: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json(expediente) // null si no existe
  } catch (error) {
    console.error('GET /api/ssoma/expediente:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const userId = (session.user as any).id

    const body = await req.json()
    const {
      proyectoId,
      codigoCod,
      descripcionTrabajos,
      hayTrabajoElectrico,
      nivelElectrico,
      hayTrabajoAltura,
      hayEspacioConfinado,
      hayTrabajoCaliente,
      ingSeguridad,
      gestorNombre,
      ggNombre,
      fechaInicioObra,
    } = body

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { cliente: true },
    })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // Crear el expediente
    const cod = (codigoCod as string).toUpperCase()
    const expediente = await prisma.ssomaExpediente.create({
      data: {
        proyectoId,
        codigoCod: cod,
        descripcionTrabajos,
        hayTrabajoElectrico: hayTrabajoElectrico ?? false,
        nivelElectrico: nivelElectrico ?? null,
        hayTrabajoAltura: hayTrabajoAltura ?? false,
        hayEspacioConfinado: hayEspacioConfinado ?? false,
        hayTrabajoCaliente: hayTrabajoCaliente ?? false,
        ingSeguridad,
        gestorNombre,
        ggNombre,
        estadoHabilitacion: 'en_proceso',
        fechaInicioObra: fechaInicioObra ? new Date(fechaInicioObra) : null,
      },
    })

    const actividades: SsomaActividadesAltoRiesgo = {
      hayTrabajoElectrico: hayTrabajoElectrico ?? false,
      nivelElectrico,
      hayTrabajoAltura: hayTrabajoAltura ?? false,
      hayEspacioConfinado: hayEspacioConfinado ?? false,
      hayTrabajoCaliente: hayTrabajoCaliente ?? false,
    }

    const fecha = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })

    const promptData: SsomaPromptData = {
      codigoCod: cod,
      nombreProyecto: proyecto.nombre,
      cliente: proyecto.cliente.nombre,
      planta: proyecto.descripcion ?? proyecto.cliente.nombre,
      descripcionTrabajos,
      actividades,
      ingSeguridad,
      gestorNombre,
      ggNombre,
      fecha,
    }

    const specs = getDocSpecs(cod, actividades)

    // Seleccionar el prompt correcto por tipo
    function getPrompt(spec: SsomaDocSpec): string {
      switch (spec.tipo) {
        case 'PETS':             return buildPromptPETS(promptData, spec.codigoDocumento)
        case 'IPERC':            return buildPromptIPERC(promptData, spec.codigoDocumento)
        case 'MATRIZ_EPP':       return buildPromptMatrizEPP(promptData, spec.codigoDocumento)
        case 'PLAN_EMERGENCIA':  return buildPromptPlanEmergencia(promptData, spec.codigoDocumento)
        case 'PAR':              return buildPromptPAR(promptData, spec.parSubtipo!, spec.codigoDocumento)
        default:                 return ''
      }
    }

    // Generar todos los documentos en paralelo
    const results = await Promise.allSettled(
      specs.map(async (spec) => {
        const prompt = getPrompt(spec)
        const startMs = Date.now()

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: spec.tipo === 'IPERC' ? 16000 : 4000,
          messages: [{ role: 'user', content: prompt }],
        })

        const contenido = response.content[0].type === 'text' ? response.content[0].text : ''
        const duracionMs = Date.now() - startMs
        const costoEstimado =
          response.usage.input_tokens * 0.000003 +
          response.usage.output_tokens * 0.000015

        const usage = await prisma.agenteUsage.create({
          data: {
            userId,
            tipo: 'ssoma-documento',
            modelo: 'claude-sonnet-4-20250514',
            tokensInput: response.usage.input_tokens,
            tokensOutput: response.usage.output_tokens,
            costoEstimado,
            duracionMs,
            metadata: {
              docTipo: spec.tipo,
              parSubtipo: spec.parSubtipo ?? null,
              expedienteId: expediente.id,
              proyectoId,
            },
          },
        })

        return prisma.ssomaDocumento.create({
          data: {
            expedienteId: expediente.id,
            tipo: spec.tipo,
            parSubtipo: spec.parSubtipo ?? null,
            codigoDocumento: spec.codigoDocumento,
            titulo: spec.titulo,
            revision: spec.revision,
            contenidoTexto: contenido,
            promptUsado: prompt,
            generadoPorId: userId,
            agenteUsageId: usage.id,
          },
        })
      })
    )

    const creados = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value)

    const errores = results
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason?.message)

    return NextResponse.json({
      expediente,
      documentos: creados,
      totalDocumentos: specs.length,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error) {
    console.error('POST /api/ssoma/expediente:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
