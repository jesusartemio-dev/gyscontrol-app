import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generarSiglas, calcularNivelesOrgNodos, normalizarTexto, NIVELES_PARTICIPANTES_MATRIZ } from '@/lib/matrizComunicacion/utils'
import { aplicarReglaResponsableAFilas } from '@/lib/matrizComunicacion/aplicarReglaResponsable'
import { generarFilasMatriz } from '@/lib/matrizComunicacion/generarFilas'
import { ROL_CONTACTO_CLIENTE_LABELS } from '@/lib/config/rolesContactoCliente'
import { resolverOrganigramaProyecto } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { registrarCargoLabelsNoReconocidos } from '@/lib/cronogramaResponsables/auditoriaOrganigrama'

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
            // El puesto del catálogo es la clave de la tabla de reglas, y su
            // rolFuncional el que resuelve quién autoriza cada EDT.
            puesto: { select: { nombre: true, rolFuncional: true, orden: true } },
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
      // Sin bandera de IA: la matriz ya no llama a ningún modelo, así que
      // apagar la IA no tiene por qué dejar al proyecto sin matriz.
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
      const siglasGys = new Set<string>()
      const personal = orgNodos.map(n => {
        const siglas = generarSiglas(n.user!.name!, usadas)
        usadas.add(siglas)
        siglaPorUserId.set(n.userId!, siglas)
        siglasGys.add(siglas)
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

      // La matriz se arma con la tabla de reglas, no con IA: las filas salen del
      // catálogo de EDTs, las columnas del organigrama y las celdas de reglas de
      // negocio fijas. Antes la decidía un modelo guiado por heurísticas de texto
      // que emparejaban por el nombre del EDT, no por quién hace el trabajo.
      // Se recorren TODOS los nodos del proyecto, no solo los participantes
      // deduplicados: una persona puede ocupar varios puestos y cada uno le da
      // participaciones distintas en la matriz.
      const puestosPorSigla = new Map<string, string[]>()
      for (const n of proyecto.orgNodos) {
        if (!n.userId || !n.puesto?.nombre) continue
        const sigla = siglaPorUserId.get(n.userId)
        if (!sigla) continue
        const actuales = puestosPorSigla.get(sigla) ?? []
        if (!actuales.includes(n.puesto.nombre)) actuales.push(n.puesto.nombre)
        puestosPorSigla.set(sigla, actuales)
      }

      const participantes = personal.map(p => ({
        siglas: p.siglas,
        puestos: puestosPorSigla.get(p.siglas) ?? [],
        esCliente: !siglasGys.has(p.siglas),
      }))

      const { filas: filasCrudas, edtsSinRegla } = generarFilasMatriz(
        edts.map(e => ({ nombre: e.nombre, codigo: e.codigo, orden: e.orden })),
        participantes
      )
      if (edtsSinRegla.length > 0) {
        console.warn('EDTs sin regla en la matriz (filas vacías):', edtsSinRegla.join(', '))
      }

      // El código "R" (Autoriza) sale de la tabla EDT->rol + el organigrama, y
      // sube de nivel si el responsable ya es emisor en esa fila.
      const organigramaResuelto = resolverOrganigramaProyecto(orgNodos)

      // Se pasan TODOS los nodos (no solo los participantes) porque la cadena de
      // padres puede atravesar un nodo vacante antes de llegar al autorizador.
      const filas = aplicarReglaResponsableAFilas(
        filasCrudas,
        edtInfoPorNombre,
        organigramaResuelto.porRol,
        siglaPorUserId,
        proyecto.orgNodos.map(n => ({ id: n.id, parentId: n.parentId, userId: n.userId }))
      )

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

