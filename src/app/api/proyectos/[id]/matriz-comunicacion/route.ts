import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { buildPromptMatriz, type MatrizFilaIA } from '@/lib/matrizComunicacion/prompt'
import { getModelForTask } from '@/lib/agente/models'

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
        filas: {
          orderBy: { orden: 'asc' },
          include: { edt: { select: { id: true, nombre: true } } },
        },
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

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        descripcion: true,
        cliente: { select: { nombre: true } },
        orgNodos: {
          where: { userId: { not: null } },
          select: {
            cargoLabel: true,
            cipOverride: true,
            user: { select: { name: true } },
          },
        },
        proyectoEdt: {
          where: { proyectoCronograma: { tipo: 'ejecucion' } },
          select: { nombre: true, descripcion: true },
          take: 30,
        },
      },
    })

    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    // No crear si ya existe
    const existente = await prisma.matrizComunicacion.findUnique({ where: { proyectoId } })
    if (existente) return NextResponse.json({ error: 'La matriz ya existe' }, { status: 409 })

    type FilaCreateInput = {
      orden: number; informacion: string; emisor: string; receptores: string
      medio: string; frecuencia: string; formato: string; notas: string | null
    }
    let filasData: FilaCreateInput[] = []
    let generadoConIA = false

    if (generarConIA) {
      const orgNodos = proyecto.orgNodos.filter(n => n.user?.name)
      const personal = buildPersonalConSiglas(
        orgNodos.map(n => ({ cargoLabel: n.cargoLabel, user: { name: n.user!.name! } }))
      )

      const promptData = {
        nombreProyecto: proyecto.nombre,
        codigoProyecto: proyecto.codigo,
        cliente: proyecto.cliente?.nombre ?? 'Cliente',
        descripcion: proyecto.descripcion ?? undefined,
        personal,
        edts: proyecto.proyectoEdt.map(e => ({
          nombre: e.nombre,
          descripcion: e.descripcion ?? undefined,
        })),
      }

      const prompt = buildPromptMatriz(promptData)
      const response = await anthropic.messages.create({
        model: getModelForTask('ssoma-document'),
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const filas: MatrizFilaIA[] = JSON.parse(text)

      filasData = filas.map(f => ({
        orden: f.orden,
        informacion: f.informacion,
        emisor: f.emisor,
        receptores: JSON.stringify(f.receptores),
        medio: f.medio,
        frecuencia: f.frecuencia,
        formato: f.formato,
        notas: f.notas ?? null,
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
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH — actualizar metadatos de la matriz (version, estado)
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

// ─── helpers ────────────────────────────────────────────────────────────────

type OrgNode = { cargoLabel: string; user: { name: string } }

function buildPersonalConSiglas(nodos: OrgNode[]) {
  const usadas = new Set<string>()
  return nodos.map(n => {
      const nombre = n.user.name
      const siglas = generarSiglas(nombre, usadas)
      usadas.add(siglas)
      return { nombre, siglas, cargo: n.cargoLabel }
    })
}

function generarSiglas(nombre: string, usadas: Set<string>): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  // Intento 1: iniciales de cada palabra
  const base = partes.map(p => p[0].toUpperCase()).join('')
  if (!usadas.has(base)) return base

  // Intento 2: primeras 2 letras del primer apellido + inicial nombre
  if (partes.length >= 2) {
    const alt = partes[0][0].toUpperCase() + partes[1].substring(0, 2).toUpperCase()
    if (!usadas.has(alt)) return alt
  }

  // Fallback: base + número
  let i = 2
  while (usadas.has(`${base}${i}`)) i++
  return `${base}${i}`
}
