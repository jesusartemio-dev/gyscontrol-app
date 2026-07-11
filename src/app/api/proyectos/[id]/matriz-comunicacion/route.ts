import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { buildPromptMatriz, type MatrizFilaIA } from '@/lib/matrizComunicacion/prompt'
import { getModelForTask } from '@/lib/agente/models'
import { generarSiglas, calcularNivelesOrgNodos, normalizarTexto, NIVELES_PARTICIPANTES_MATRIZ } from '@/lib/matrizComunicacion/utils'
import { aplicarReglaResponsableAFilas } from '@/lib/matrizComunicacion/aplicarReglaResponsable'
import { ROL_CONTACTO_CLIENTE_LABELS } from '@/lib/config/rolesContactoCliente'
import { resolverOrganigramaProyecto } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { registrarCargoLabelsNoReconocidos } from '@/lib/cronogramaResponsables/auditoriaOrganigrama'
import { trackUsage, trackUsageError } from '@/lib/agente/usageTracker'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'

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
          // Se traen TODOS los nodos (no solo los que tienen usuario) para poder
          // calcular el nivel de cada uno recorriendo la cadena de padres completa.
          orderBy: { orden: 'asc' },
          select: {
            id: true,
            parentId: true,
            userId: true,
            cargoLabel: true,
            orden: true,
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
      },
    })

    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const existente = await prisma.matrizComunicacion.findUnique({ where: { proyectoId } })
    if (existente) return NextResponse.json({ error: 'La matriz ya existe' }, { status: 409 })

    type FilaInput = {
      orden: number; informacion: string; emisor: string; receptores: string
      medio: string; frecuencia: string; formato: string; notas: string | null
      edtId?: string | null
    }
    let filasData: FilaInput[] = []
    let generadoConIA = false

    const userId = (session.user as { id?: string }).id ?? session.user.email ?? 'unknown'

    if (generarConIA) {
      const iaEnabled = await isIAFeatureEnabled('matrizComunicacion')
      if (!iaEnabled) return NextResponse.json({ error: 'La generación con IA de Matriz de Comunicaciones está deshabilitada' }, { status: 403 })
      // Solo participan en la matriz los niveles de gestión/ejecución del organigrama
      // (no la Gerencia General de nivel 1, ni los técnicos de campo del último nivel)
      const niveles = calcularNivelesOrgNodos(proyecto.orgNodos)

      // Deduplicar por userId: si la misma persona aparece en varios nodos
      // (ej. nodo fijo GYS + nodo de proyecto), tomar solo la primera aparición
      const seenUserIds = new Set<string>()
      const orgNodos = proyecto.orgNodos.filter(n => {
        if (!n.user?.name || !n.userId) return false
        if (!NIVELES_PARTICIPANTES_MATRIZ.includes(niveles.get(n.id) as 2 | 3 | 4)) return false
        if (seenUserIds.has(n.userId)) return false
        seenUserIds.add(n.userId)
        return true
      })

      const usadas = new Set<string>()
      // userId -> siglas asignadas acá — se necesita después para forzar el
      // código "R" en la celda de quien resuelva la tabla EDT->rol +
      // organigrama (ver aplicarReglaResponsableAFilas), sin tocar el resto
      // de la forma de `personal` que ya usa el prompt de la IA.
      const siglaPorUserId = new Map<string, string>()
      const personal = orgNodos.map(n => {
        const siglas = generarSiglas(n.user!.name!, usadas)
        usadas.add(siglas)
        siglaPorUserId.set(n.userId!, siglas)
        return {
          siglas,
          nombre: n.user!.name!,
          cargo: n.cargoLabel,
          empresa: n.empresaOverride ?? 'GYS CONTROL INDUSTRIAL SAC',
          celular: n.telefonoOverride ?? n.user?.empleado?.telefono ?? '',
          correo: n.user!.email,
        }
      })

      // Agregar contactos del cliente como participantes adicionales
      const contactosClienteDB = await prisma.proyectoContactoCliente.findMany({
        where: { proyectoId },
        include: { crmContacto: { select: { nombre: true, email: true, celular: true, telefono: true } } },
        orderBy: { createdAt: 'asc' },
      })
      for (const cc of contactosClienteDB) {
        const siglas = generarSiglas(cc.crmContacto.nombre, usadas)
        usadas.add(siglas)
        personal.push({
          siglas,
          nombre: cc.crmContacto.nombre,
          cargo: ROL_CONTACTO_CLIENTE_LABELS[cc.rolEnProyecto] ?? cc.rolEnProyecto,
          empresa: proyecto.cliente?.nombre ?? 'Cliente',
          celular: cc.crmContacto.celular ?? cc.crmContacto.telefono ?? '',
          correo: cc.crmContacto.email ?? '',
        })
      }

      // Query all EDTs for this project — no cronograma type filter so we get all
      const proyectoEdtsRaw = await prisma.proyectoEdt.findMany({
        where: { proyectoId },
        include: { proyectoFase: { select: { nombre: true, orden: true } }, edt: { select: { nombre: true } } },
        orderBy: [{ proyectoFase: { orden: 'asc' } }, { orden: 'asc' }],
        take: 60,
      })
      // Dedup by nombre across cronogramas
      const seenEdtNames = new Set<string>()
      const edts = proyectoEdtsRaw
        .filter(e => {
          if (seenEdtNames.has(e.nombre)) return false
          seenEdtNames.add(e.nombre)
          return true
        })
        .map(e => ({ id: e.id, nombre: e.nombre, fase: e.proyectoFase?.nombre ?? 'Sin fase', orden: e.orden, codigo: e.edt.nombre }))
      // ProyectoEdt.nombre (descriptivo, ej. "Construcción") -> {id, código
      // real del catálogo, ej. "CON"} — se usa después para (a) resolver el
      // rol responsable de cada fila vía la tabla EDT->rol y (b) setear
      // edtId en la fila persistida en vez de dejarlo null.
      const edtInfoPorNombre = new Map(edts.map(e => [normalizarTexto(e.nombre), { id: e.id, codigo: e.codigo }]))
      console.log('Total EDTs encontrados:', edts.length)
      console.log('EDTs enviados al prompt:', edts.map(e => e.nombre))
      console.log('Proyecto codigo:', proyecto.codigo)

      const prompt = buildPromptMatriz({
        proyecto: { nombre: proyecto.nombre, codigo: proyecto.codigo ?? '' },
        cliente: proyecto.cliente?.nombre ?? 'Cliente',
        personal,
        edts,
      })

      const modelo = getModelForTask('ssoma-document')
      const startMs = Date.now()
      let response: Awaited<ReturnType<typeof anthropic.messages.create>>
      try {
        response = await anthropic.messages.create({
          model: modelo,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        })
      } catch (err) {
        trackUsageError({
          userId, tipo: 'matriz-comunicacion', modelo,
          duracionMs: Date.now() - startMs,
          metadata: { proyectoId, errorMessage: String(err instanceof Error ? err.message : err).substring(0, 300) },
        })
        throw err
      }
      trackUsage({
        userId, tipo: 'matriz-comunicacion', modelo,
        tokensInput: response.usage.input_tokens,
        tokensOutput: response.usage.output_tokens,
        tokensCacheCreation: (response.usage as unknown as Record<string, number>).cache_creation_input_tokens ?? 0,
        tokensCacheRead: (response.usage as unknown as Record<string, number>).cache_read_input_tokens ?? 0,
        duracionMs: Date.now() - startMs,
        metadata: { proyectoId, edtsTotal: edts.length, personalTotal: personal.length },
      })

      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

      // IA returns { filas: [...] } or directly [...]
      const parsed = JSON.parse(text)
      const filasCrudas: MatrizFilaIA[] = Array.isArray(parsed) ? parsed : (parsed.filas ?? [])

      // El código "R" (Autoriza) nunca lo decide la IA — se calcula acá desde
      // la tabla EDT->rol + el organigrama de este proyecto y se fuerza en
      // la celda correspondiente (ver aplicarReglaResponsableAFilas).
      const organigramaResuelto = resolverOrganigramaProyecto(orgNodos)
      const filas = aplicarReglaResponsableAFilas(filasCrudas, edtInfoPorNombre, organigramaResuelto.porRol, siglaPorUserId)

      filasData = filas.map(f => ({
        orden: f.orden,
        informacion: f.edtNombre,
        emisor: '',
        receptores: JSON.stringify(f.celdas),
        medio: f.medio,
        frecuencia: f.frecuencia,
        formato: '',
        notas: null,
        edtId: edtInfoPorNombre.get(normalizarTexto(f.edtNombre))?.id ?? null,
      }))

      generadoConIA = true

      await registrarCargoLabelsNoReconocidos(userId, proyectoId, organigramaResuelto.cargoLabelsNoReconocidos)
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
        ...(body.codigoDocumento !== undefined && { codigoDocumento: body.codigoDocumento }),
        ...(body.revisionDocumento !== undefined && { revisionDocumento: body.revisionDocumento }),
        ...(body.numeroConsultor !== undefined && { numeroConsultor: body.numeroConsultor }),
        ...(body.desarrolloNombre !== undefined && { desarrolloNombre: body.desarrolloNombre }),
        ...(body.verificoNombre !== undefined && { verificoNombre: body.verificoNombre }),
        ...(body.aproboNombre !== undefined && { aproboNombre: body.aproboNombre }),
        ...(body.autorizoNombre !== undefined && { autorizoNombre: body.autorizoNombre }),
      },
    })

    return NextResponse.json(matriz)
  } catch (error) {
    console.error('PATCH /api/proyectos/[id]/matriz-comunicacion:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

