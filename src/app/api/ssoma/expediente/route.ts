import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import {
  buildPromptPETS,
  buildPromptIPERC_Part1,
  buildPromptIPERC_Part2,
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

    // Obtener cotización del proyecto para contexto real
    const cotizacion = proyecto.cotizacionId
      ? await prisma.cotizacion.findUnique({
          where: { id: proyecto.cotizacionId },
          include: {
            cotizacionServicio: {
              include: {
                cotizacionServicioItem: {
                  include: { catalogoServicio: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
            cotizacionEquipo: {
              include: {
                cotizacionEquipoItem: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
            cotizacionTdrAnalisis: true,
          },
        })
      : null

    const tdr = cotizacion?.cotizacionTdrAnalisis?.[0] ?? null

    // Equipos: priorizar TDR (más detallado) sobre items de cotización
    const equiposTdr: string[] = tdr?.equiposIdentificados
      ? (tdr.equiposIdentificados as any[])
          .slice(0, 20)
          .map((e: any) => [
            e.nombre ?? e.equipo ?? '',
            e.especificacion ?? e.descripcion ?? '',
            e.cantidad ? `(x${e.cantidad})` : '',
          ].filter(Boolean).join(' — ').trim())
          .filter(Boolean)
      : []

    const equiposCotizacion: string[] = (cotizacion?.cotizacionEquipo ?? [])
      .flatMap(ce => ce.cotizacionEquipoItem)
      .slice(0, 20)
      .map(item => `${item.descripcion ?? ''} ${item.marca ?? ''}`.trim())
      .filter(Boolean)

    const equiposFinales = equiposTdr.length > 0 ? equiposTdr : equiposCotizacion

    // Servicios: priorizar TDR sobre items de cotización
    const serviciosTdr: string[] = tdr?.serviciosIdentificados
      ? (tdr.serviciosIdentificados as any[])
          .slice(0, 15)
          .map((s: any) => [
            s.nombre ?? s.servicio ?? '',
            s.descripcion ?? '',
            s.horasEstimadas ? `(${s.horasEstimadas}h est.)` : '',
          ].filter(Boolean).join(' — ').trim())
          .filter(Boolean)
      : []

    const serviciosCotizacion: string[] = (cotizacion?.cotizacionServicio ?? [])
      .flatMap(cs => cs.cotizacionServicioItem)
      .slice(0, 15)
      .map(item => item.nombre || item.catalogoServicio?.nombre || item.descripcion || '')
      .filter(Boolean)

    const serviciosFinales = serviciosTdr.length > 0 ? serviciosTdr : serviciosCotizacion

    // Requerimientos críticos del TDR
    const requerimientos: string[] = tdr?.requerimientos
      ? (tdr.requerimientos as any[])
          .filter((r: any) => r.criticidad === 'alta' || r.prioridad === 'alta')
          .slice(0, 10)
          .map((r: any) => r.descripcion ?? r.titulo ?? r.requerimiento ?? '')
          .filter(Boolean)
      : []

    // Alcance y ubicación del TDR
    const alcanceTdr = tdr?.alcanceDetectado ?? tdr?.resumenTdr ?? null
    const ubicacionProyecto = tdr?.ubicacionDetectada ?? null

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
      planta: ubicacionProyecto ?? proyecto.descripcion ?? proyecto.cliente.nombre,
      descripcionTrabajos,
      actividades,
      ingSeguridad,
      gestorNombre,
      ggNombre,
      fecha,
      equiposProyecto: equiposFinales,
      serviciosProyecto: serviciosFinales,
      alcanceTdr,
      ubicacionProyecto,
      requerimientos,
      contactosCliente: proyecto.clienteId
        ? (await prisma.crmContactoCliente.findMany({
            where: { clienteId: proyecto.clienteId },
            select: { nombre: true, cargo: true, telefono: true, email: true },
            take: 6,
          })).map(c => ({ nombre: c.nombre, cargo: c.cargo ?? '', telefono: c.telefono ?? '', correo: c.email ?? '' }))
        : [],
    }

    const specs = getDocSpecs(cod, actividades)

    // Helper to parse IPERC JSON from AI response
    function parseIpercFilas(raw: string): any[] {
      let clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start >= 0 && end > start) clean = clean.substring(start, end + 1)
      try {
        return JSON.parse(clean).filas ?? []
      } catch {
        const lastObj = clean.lastIndexOf('}')
        if (lastObj > 0) {
          try { return JSON.parse(clean.substring(0, lastObj + 1) + ']}').filas ?? [] } catch { return [] }
        }
        return []
      }
    }

    // Seleccionar el prompt correcto por tipo
    function getPrompt(spec: SsomaDocSpec): string {
      switch (spec.tipo) {
        case 'PETS':             return buildPromptPETS(promptData, spec.codigoDocumento)
        case 'IPERC':            return buildPromptIPERC_Part1(promptData, spec.codigoDocumento)
        case 'MATRIZ_EPP':       return buildPromptMatrizEPP(promptData, spec.codigoDocumento)
        case 'PLAN_EMERGENCIA':  return buildPromptPlanEmergencia(promptData, spec.codigoDocumento)
        case 'PAR':              return buildPromptPAR(promptData, spec.parSubtipo!, spec.codigoDocumento)
        default:                 return ''
      }
    }

    // Generar todos los documentos en paralelo
    const results = await Promise.allSettled(
      specs.map(async (spec) => {
        const startMs = Date.now()

        // IPERC: 2 llamadas paralelas de 25 filas cada una
        if (spec.tipo === 'IPERC') {
          const p1 = buildPromptIPERC_Part1(promptData, spec.codigoDocumento)
          const p2 = buildPromptIPERC_Part2(promptData, spec.codigoDocumento)
          const [r1, r2] = await Promise.all([
            anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 8000, messages: [{ role: 'user', content: p1 }] }),
            anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 8000, messages: [{ role: 'user', content: p2 }] }),
          ])
          const t1 = r1.content[0].type === 'text' ? r1.content[0].text : ''
          const t2 = r2.content[0].type === 'text' ? r2.content[0].text : ''
          const merged = { filas: [...parseIpercFilas(t1), ...parseIpercFilas(t2)] }
          const contenido = JSON.stringify(merged, null, 2)
          const duracionMs = Date.now() - startMs
          const totalInput = r1.usage.input_tokens + r2.usage.input_tokens
          const totalOutput = r1.usage.output_tokens + r2.usage.output_tokens
          const costoEstimado = totalInput * 0.000003 + totalOutput * 0.000015

          const usage = await prisma.agenteUsage.create({
            data: {
              userId, tipo: 'ssoma-documento', modelo: 'claude-sonnet-4-20250514',
              tokensInput: totalInput, tokensOutput: totalOutput, costoEstimado, duracionMs,
              metadata: { docTipo: 'IPERC', expedienteId: expediente.id, proyectoId, filasTotal: merged.filas.length },
            },
          })

          return prisma.ssomaDocumento.create({
            data: {
              expedienteId: expediente.id, tipo: spec.tipo, parSubtipo: null,
              codigoDocumento: spec.codigoDocumento, titulo: spec.titulo, revision: spec.revision,
              contenidoTexto: contenido, promptUsado: p1.substring(0, 300),
              generadoPorId: userId, agenteUsageId: usage.id,
            },
          })
        }

        // Non-IPERC: single call
        const prompt = getPrompt(spec)
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
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
  } catch (error: any) {
    console.error('POST /api/ssoma/expediente:', error)
    const rawMsg = error?.message ?? String(error)
    let userMsg = 'Error al generar documentos'

    if (rawMsg.includes('credit balance') || rawMsg.includes('billing')) {
      userMsg = 'Sin créditos en la API de Anthropic. Contacta al administrador para recargar créditos.'
    } else if (rawMsg.includes('rate_limit') || rawMsg.includes('overloaded')) {
      userMsg = 'La API de IA está saturada. Intenta de nuevo en 1 minuto.'
    } else if (rawMsg.includes('authentication') || rawMsg.includes('api_key')) {
      userMsg = 'Error de autenticación con la API de IA. Contacta al administrador.'
    } else {
      userMsg = `Error al generar: ${rawMsg.substring(0, 150)}`
    }

    return NextResponse.json({ error: userMsg }, { status: 500 })
  }
}
