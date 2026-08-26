import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { tieneRol } from '@/lib/auth/roles'
import { prisma } from '@/lib/prisma'
import { generarNumeroHoja } from '@/lib/utils/generarNumeroHoja'
import { calcularGruposPagoTerceros } from '@/lib/services/pagoTerceros'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const CATEGORIA_GASTO_HONORARIOS = 'Honorarios Terceros'

interface DiaPayload {
  usuarioId: string
  proyectoId: string
  /** YYYY-MM-DD — un día específico, no todo el periodo. */
  fecha: string
  /** Monto que el usuario dejó en el preview, puede diferir del subtotal sugerido (ajuste manual). */
  monto: number
}

interface PagoTercerosPayload {
  fechaDesde: string
  fechaHasta: string
  proyectoId?: string
  dias: DiaPayload[]
  /** Descripción editada por el usuario, por persona+proyecto — clave `usuarioId::proyectoId`. */
  descripciones?: Record<string, string>
}

function formatFechaCorta(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function claveGrupo(usuarioId: string, proyectoId: string) {
  return `${usuarioId}::${proyectoId}`
}

// POST /api/hoja-de-gastos/pago-terceros — liquida las horas de terceros del
// periodo. El dinero va DIRECTO a la cuenta de cada tercero, nunca a quien
// genera la hoja — por eso se crea UNA HojaDeGastos POR PERSONA (empleadoId
// = el tercero, no session.user.id), con una línea por cada proyecto en el
// que trabajó ese periodo (agregando sus días). requiereAnticipo: true para
// que siga el flujo normal de aprobar → depositar → rendir (con el Recibo
// por Honorarios como adjunto de esa línea), no el camino de "reembolso a
// quien creó la hoja" que aplicaría con requiereAnticipo: false.
//
// Vuelve a calcular los días server-side (no confía en lo que mandó el
// cliente) para no liquidar dos veces horas ya pagadas ni horas que dejaron
// de calificar entre que se abrió el preview y se confirmó.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_PERMITIDOS)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const payload = (await req.json()) as PagoTercerosPayload
    if (!payload.fechaDesde || !payload.fechaHasta) {
      return NextResponse.json({ error: 'fechaDesde y fechaHasta son requeridos' }, { status: 400 })
    }
    if (!Array.isArray(payload.dias) || payload.dias.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un día' }, { status: 400 })
    }

    const fechaDesde = new Date(`${payload.fechaDesde}T00:00:00`)
    const fechaHasta = new Date(`${payload.fechaHasta}T23:59:59.999`)
    if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime()) || fechaDesde > fechaHasta) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const catHonorarios = await prisma.categoriaGasto.findFirst({
      where: { nombre: { equals: CATEGORIA_GASTO_HONORARIOS, mode: 'insensitive' } },
    })
    if (!catHonorarios) {
      return NextResponse.json(
        { error: `Falta crear la categoría de gasto "${CATEGORIA_GASTO_HONORARIOS}" en /catalogo/categorias-gasto` },
        { status: 400 },
      )
    }

    // Fuente de verdad recalculada ahora mismo, no lo que mandó el cliente.
    const { lineas: disponibles } = await calcularGruposPagoTerceros({
      fechaDesde,
      fechaHasta,
      proyectoId: payload.proyectoId,
    })
    const disponiblesPorClave = new Map(disponibles.map((d) => [`${d.usuarioId}::${d.proyectoId}::${d.fecha}`, d]))

    type DiaValido = (typeof disponibles)[number] & { monto: number }
    const diasValidos: DiaValido[] = []
    const omitidas: string[] = []

    for (const l of payload.dias) {
      const dia = disponiblesPorClave.get(`${l.usuarioId}::${l.proyectoId}::${l.fecha}`)
      if (!dia) {
        omitidas.push(`${l.usuarioId} / proyecto ${l.proyectoId} / ${l.fecha}`)
        continue
      }
      const monto = Number.isFinite(l.monto) && l.monto >= 0 ? l.monto : dia.subtotal
      diasValidos.push({ ...dia, monto })
    }

    if (diasValidos.length === 0) {
      return NextResponse.json(
        {
          error: 'Ninguno de los días sigue disponible — probablemente ya se liquidaron en otra hoja mientras revisabas.',
          omitidas,
        },
        { status: 409 },
      )
    }

    // Agrupar por persona (1 hoja) y dentro de eso por proyecto (1 línea).
    const porPersona = new Map<string, { nombre: string; porProyecto: Map<string, DiaValido[]> }>()
    for (const d of diasValidos) {
      if (!porPersona.has(d.usuarioId)) porPersona.set(d.usuarioId, { nombre: d.nombre, porProyecto: new Map() })
      const persona = porPersona.get(d.usuarioId)!
      const grupoKey = claveGrupo(d.usuarioId, d.proyectoId)
      if (!persona.porProyecto.has(grupoKey)) persona.porProyecto.set(grupoKey, [])
      persona.porProyecto.get(grupoKey)!.push(d)
    }

    const hojasCreadas = await prisma.$transaction(async (tx) => {
      const resultado: Array<{ id: string; numero: string; empleadoId: string; nombre: string; total: number }> = []

      for (const [usuarioId, { nombre, porProyecto }] of porPersona) {
        const gruposProyecto = Array.from(porProyecto.values())
        const totalPersona = gruposProyecto.flat().reduce((s, d) => s + d.monto, 0)
        // Con `tx`, no con el cliente global — ver el comentario en
        // generarNumeroHoja.ts: se llama varias veces en esta misma
        // transacción y necesita ver las hojas recién creadas.
        const numero = await generarNumeroHoja(tx)

        const motivo = `Honorarios ${nombre} — ${formatFechaCorta(payload.fechaDesde)} al ${formatFechaCorta(payload.fechaHasta)}`

        const creada = await tx.hojaDeGastos.create({
          data: {
            numero,
            // proyectoId: null a propósito — si la persona trabajó en más de
            // un proyecto, la cabecera no puede cargar uno solo, y así queda
            // consistente con el resto de casos (ver nota abajo).
            proyectoId: null,
            categoriaCosto: 'servicios',
            tipoPropósito: 'honorarios_terceros',
            empleadoId: usuarioId, // el tercero — el dinero va a SU cuenta
            creadoPorId: session.user.id, // quien generó la liquidación
            motivo,
            requiereAnticipo: true, // habilita el flujo normal aprobar→depositar
            estado: 'enviado',
            fechaEnvio: new Date(),
            updatedAt: new Date(),
          },
        })

        for (const dias of gruposProyecto) {
          const primero = dias[0]
          const totalGrupo = dias.reduce((s, d) => s + d.monto, 0)
          const fechas = dias.map((d) => d.fecha).sort()
          const ultimaFecha = fechas[fechas.length - 1]
          const totalDias = Math.round(dias.reduce((s, d) => s + d.dias, 0) * 100) / 100

          const claveDescripcion = claveGrupo(primero.usuarioId, primero.proyectoId)
          const descripcion =
            payload.descripciones?.[claveDescripcion]?.trim() ||
            `Honorarios ${primero.nombre} — ${primero.proyectoCodigo} — ${fechas.map(formatFechaCorta).join(', ')} ` +
              `(${totalDias}d) — Adjuntar Recibo por Honorarios`

          await tx.gastoLinea.create({
            data: {
              hojaDeGastosId: creada.id,
              categoriaGastoId: catHonorarios.id,
              descripcion,
              fecha: new Date(`${ultimaFecha}T00:00:00`),
              monto: totalGrupo,
              moneda: 'PEN',
              proyectoId: primero.proyectoId,
              categoriaCosto: 'servicios',
              updatedAt: new Date(),
            },
          })

          await tx.registroHoras.updateMany({
            where: { id: { in: dias.flatMap((d) => d.registroIds) } },
            data: { liquidadoEnHojaId: creada.id },
          })
        }

        await tx.hojaDeGastosEvento.create({
          data: {
            hojaDeGastosId: creada.id,
            tipo: 'creado',
            descripcion: `Liquidación de terceros ${numero} creada por ${session.user.name ?? session.user.id} — ${gruposProyecto.length} línea(s)`,
            estadoNuevo: 'borrador',
            usuarioId: session.user.id,
            metadata: { fechaDesde: payload.fechaDesde, fechaHasta: payload.fechaHasta },
          },
        })
        await tx.hojaDeGastosEvento.create({
          data: {
            hojaDeGastosId: creada.id,
            tipo: 'enviado',
            descripcion: 'Enviado automáticamente al crear la liquidación de terceros',
            estadoAnterior: 'borrador',
            estadoNuevo: 'enviado',
            usuarioId: session.user.id,
          },
        })

        resultado.push({ id: creada.id, numero, empleadoId: usuarioId, nombre, total: totalPersona })
      }

      return resultado
    })

    return NextResponse.json({ hojas: hojasCreadas, omitidas })
  } catch (error) {
    console.error('Error al crear liquidación de terceros:', error)
    return NextResponse.json({ error: 'Error al crear la liquidación' }, { status: 500 })
  }
}
