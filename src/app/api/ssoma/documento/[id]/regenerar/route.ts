import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import {
  buildPromptPETS,
  buildPromptIPERC,
  buildPromptIPERC_Part1,
  buildPromptIPERC_Part2,
  buildPromptMatrizEPP,
  buildPromptPlanEmergencia,
  buildPromptPAR,
} from '@/lib/ssoma/prompts'
import type { SsomaPromptData, SsomaActividadesAltoRiesgo } from '@/lib/ssoma/tipos'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const userId = session.user.id as string

    const { id } = await params

    // Get document with expediente and project context
    const doc = await prisma.ssomaDocumento.findUnique({
      where: { id },
      include: {
        expediente: {
          include: { proyecto: { include: { cliente: true } } },
        },
      },
    })

    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

    const exp = doc.expediente
    const proyecto = exp.proyecto

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

    const requerimientos: string[] = tdr?.requerimientos
      ? (tdr.requerimientos as any[])
          .filter((r: any) => r.criticidad === 'alta' || r.prioridad === 'alta')
          .slice(0, 10)
          .map((r: any) => r.descripcion ?? r.titulo ?? r.requerimiento ?? '')
          .filter(Boolean)
      : []

    const alcanceTdr = tdr?.alcanceDetectado ?? tdr?.resumenTdr ?? null
    const ubicacionProyecto = tdr?.ubicacionDetectada ?? null

    // Build prompt data from expediente
    const actividades: SsomaActividadesAltoRiesgo = {
      hayTrabajoElectrico: exp.hayTrabajoElectrico,
      nivelElectrico: exp.nivelElectrico,
      hayTrabajoAltura: exp.hayTrabajoAltura,
      hayEspacioConfinado: exp.hayEspacioConfinado,
      hayTrabajoCaliente: exp.hayTrabajoCaliente,
    }

    const promptData: SsomaPromptData = {
      codigoCod: exp.codigoCod,
      nombreProyecto: proyecto.nombre,
      cliente: proyecto.cliente?.nombre ?? '',
      planta: proyecto.descripcion ?? proyecto.cliente?.nombre ?? '',
      descripcionTrabajos: exp.descripcionTrabajos,
      actividades,
      ingSeguridad: exp.ingSeguridad ?? '',
      gestorNombre: exp.gestorNombre ?? '',
      ggNombre: exp.ggNombre ?? '',
      fecha: new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
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

    // Select prompt by doc type — IPERC uses 2 parallel calls
    if (doc.tipo === 'IPERC') {
      const prompt1 = buildPromptIPERC_Part1(promptData, doc.codigoDocumento)
      const prompt2 = buildPromptIPERC_Part2(promptData, doc.codigoDocumento)

      const startMs = Date.now()
      const [res1, res2] = await Promise.all([
        anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [{ role: 'user', content: prompt1 }],
        }),
        anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [{ role: 'user', content: prompt2 }],
        }),
      ])
      const duracionMs = Date.now() - startMs

      // Parse and merge filas from both parts
      const text1 = res1.content[0].type === 'text' ? res1.content[0].text : ''
      const text2 = res2.content[0].type === 'text' ? res2.content[0].text : ''

      const parseFilas = (raw: string): any[] => {
        let clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
        const start = clean.indexOf('{')
        const end = clean.lastIndexOf('}')
        if (start >= 0 && end > start) clean = clean.substring(start, end + 1)
        try {
          return JSON.parse(clean).filas ?? []
        } catch {
          // Try repair truncated JSON
          const lastObj = clean.lastIndexOf('}')
          if (lastObj > 0) {
            try { return JSON.parse(clean.substring(0, lastObj + 1) + ']}').filas ?? [] } catch { return [] }
          }
          return []
        }
      }

      const filas1 = parseFilas(text1)
      const filas2 = parseFilas(text2)
      const merged = { filas: [...filas1, ...filas2] }
      const contenido = JSON.stringify(merged, null, 2)

      const totalInput = res1.usage.input_tokens + res2.usage.input_tokens
      const totalOutput = res1.usage.output_tokens + res2.usage.output_tokens
      const costoEstimado = totalInput * 0.000003 + totalOutput * 0.000015

      const usage = await prisma.agenteUsage.create({
        data: {
          userId,
          tipo: 'ssoma-documento-regenerar',
          modelo: 'claude-sonnet-4-20250514',
          tokensInput: totalInput,
          tokensOutput: totalOutput,
          costoEstimado,
          duracionMs,
          metadata: {
            docTipo: 'IPERC',
            expedienteId: exp.id,
            proyectoId: proyecto.id,
            regeneracion: true,
            filasP1: filas1.length,
            filasP2: filas2.length,
          },
        },
      })

      const updated = await prisma.ssomaDocumento.update({
        where: { id },
        data: {
          contenidoTexto: contenido,
          promptUsado: prompt1.substring(0, 500) + '\n---PART2---\n' + prompt2.substring(0, 500),
          generadoPorId: userId,
          agenteUsageId: usage.id,
          estado: 'borrador',
        },
      })

      return NextResponse.json({
        id: updated.id,
        tipo: updated.tipo,
        contenidoLength: contenido.length,
        tokensUsed: totalInput + totalOutput,
        duracionMs,
        filas: merged.filas.length,
      })
    }

    // Non-IPERC documents — single call
    let prompt: string
    switch (doc.tipo) {
      case 'PETS':
        prompt = buildPromptPETS(promptData, doc.codigoDocumento)
        break
      case 'MATRIZ_EPP':
        prompt = buildPromptMatrizEPP(promptData, doc.codigoDocumento)
        break
      case 'PLAN_EMERGENCIA':
        prompt = buildPromptPlanEmergencia(promptData, doc.codigoDocumento)
        break
      case 'PAR':
        if (!doc.parSubtipo) return NextResponse.json({ error: 'PAR sin subtipo' }, { status: 400 })
        prompt = buildPromptPAR(promptData, doc.parSubtipo, doc.codigoDocumento)
        break
      default:
        return NextResponse.json({ error: 'Tipo de documento no soportado' }, { status: 400 })
    }

    const startMs = Date.now()
    const maxTokens = doc.tipo === 'PLAN_EMERGENCIA' ? 4096 : 4000
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
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
        tipo: 'ssoma-documento-regenerar',
        modelo: 'claude-sonnet-4-20250514',
        tokensInput: response.usage.input_tokens,
        tokensOutput: response.usage.output_tokens,
        costoEstimado,
        duracionMs,
        metadata: {
          docTipo: doc.tipo,
          parSubtipo: doc.parSubtipo ?? null,
          expedienteId: exp.id,
          proyectoId: proyecto.id,
          regeneracion: true,
        },
      },
    })

    // Update document content
    const updated = await prisma.ssomaDocumento.update({
      where: { id },
      data: {
        contenidoTexto: contenido,
        promptUsado: prompt,
        generadoPorId: userId,
        agenteUsageId: usage.id,
        estado: 'borrador',
      },
    })

    return NextResponse.json({
      id: updated.id,
      tipo: updated.tipo,
      contenidoLength: contenido.length,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      duracionMs,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error regenerando documento SSOMA:', msg, error)
    return NextResponse.json({ error: `Error al regenerar: ${msg.substring(0, 200)}` }, { status: 500 })
  }
}
