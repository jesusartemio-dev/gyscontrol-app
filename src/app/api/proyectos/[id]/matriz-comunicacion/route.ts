import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { buildPromptMatriz, type MatrizFilaIA } from '@/lib/matrizComunicacion/prompt'
import { getModelForTask } from '@/lib/agente/models'
import { generarSiglas } from '@/lib/matrizComunicacion/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// GET — obtener la matriz del proyecto (con filas)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const matriz = await prisma.matrizComunicacion.findUnique({
      where: { proyectoId },
      include: {
        filas: { orderBy: { orden: 'asc' } },
      },
    })

    return NextResponse.json(matriz)
  } catch (error) {
    console.error('GET /api/proyectos/[id]/matriz-comunicacion:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST — crear matriz vacía O generar con IA
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json().catch(() => ({}))
    const generarConIA: boolean = body.generarConIA ?? false

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        cliente: { select: { nombre: true } },
        orgNodos: {
          where: { userId: { not: null } },
          orderBy: { orden: 'asc' },
          select: {
            userId: true,
            cargoLabel: true,
            empresaOverride: true,
            telefonoOverride: true,
            cipOverride: true,
            user: {
              select: {
                name: true,
                email: true,
                empleado: { select: { telefono: true, cip: true } },
              },
            },
          },
        },
        proyectoEdt: {
          where: { proyectoCronograma: { tipo: 'ejecucion' } },
          orderBy: { orden: 'asc' },
          select: {
            nombre: true,
            orden: true,
            proyectoFase: { select: { nombre: true } },
          },
          take: 40,
        },
      },
    })

    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const existente = await prisma.matrizComunicacion.findUnique({ where: { proyectoId } })
    if (existente) return NextResponse.json({ error: 'La matriz ya existe' }, { status: 409 })

    type FilaInput = {
      orden: number; informacion: string; emisor: string; receptores: string
      medio: string; frecuencia: string; formato: string; notas: string | null
    }
    let filasData: FilaInput[] = []
    let generadoConIA = false

    if (generarConIA) {
      // Deduplicar por userId: si la misma persona aparece en varios nodos
      // (ej. nodo fijo GYS + nodo de proyecto), tomar solo la primera aparición
      const seenUserIds = new Set<string>()
      const orgNodos = proyecto.orgNodos.filter(n => {
        if (!n.user?.name || !n.userId) return false
        if (seenUserIds.has(n.userId)) return false
        seenUserIds.add(n.userId)
        return true
      })

      const usadas = new Set<string>()
      const personal = orgNodos.map(n => {
        const siglas = generarSiglas(n.user!.name!, usadas)
        usadas.add(siglas)
        return {
          siglas,
          nombre: n.user!.name!,
          cargo: n.cargoLabel,
          empresa: n.empresaOverride ?? 'GYS CONTROL INDUSTRIAL SAC',
          celular: n.telefonoOverride ?? n.user?.empleado?.telefono ?? '',
          correo: n.user!.email,
        }
      })

      const edts = proyecto.proyectoEdt.map(e => ({
        nombre: e.nombre,
        fase: e.proyectoFase?.nombre ?? 'Sin fase',
        orden: e.orden,
      }))

      const prompt = buildPromptMatriz({
        proyecto: { nombre: proyecto.nombre, codigo: proyecto.codigo },
        cliente: proyecto.cliente?.nombre ?? 'Cliente',
        personal,
        edts,
      })

      const response = await anthropic.messages.create({
        model: getModelForTask('ssoma-document'),
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

      // IA returns { filas: [...] } or directly [...]
      const parsed = JSON.parse(text)
      const filas: MatrizFilaIA[] = Array.isArray(parsed) ? parsed : (parsed.filas ?? [])

      filasData = filas.map(f => ({
        orden: f.orden,
        informacion: f.edtNombre,
        emisor: '',
        receptores: JSON.stringify(f.celdas),
        medio: f.medio,
        frecuencia: f.frecuencia,
        formato: '',
        notas: null,
      }))

      generadoConIA = true
    }

    const matriz = await prisma.matrizComunicacion.create({
      data: {
        proyectoId,
        generadoConIA,
        ...(filasData.length > 0 && { filas: { create: filasData } }),
      },
      include: {
        filas: { orderBy: { orden: 'asc' } },
      },
    })

    return NextResponse.json(matriz, { status: 201 })
  } catch (error) {
    console.error('POST /api/proyectos/[id]/matriz-comunicacion:', error)
    const msg = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — eliminar la matriz completa (cascade filas)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const matriz = await prisma.matrizComunicacion.findUnique({ where: { proyectoId } })
    if (!matriz) return NextResponse.json({ error: 'No existe matriz' }, { status: 404 })

    await prisma.matrizComunicacion.delete({ where: { proyectoId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/proyectos/[id]/matriz-comunicacion:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH — actualizar metadatos (version, estado)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()

    const matriz = await prisma.matrizComunicacion.update({
      where: { proyectoId },
      data: {
        ...(body.version !== undefined && { version: body.version }),
        ...(body.estado !== undefined && { estado: body.estado }),
      },
    })

    return NextResponse.json(matriz)
  } catch (error) {
    console.error('PATCH /api/proyectos/[id]/matriz-comunicacion:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

