import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { tieneRol } from '@/lib/auth/roles'
import { prisma } from '@/lib/prisma'
import { generarNumeroHoja } from '@/lib/utils/generarNumeroHoja'
import { calcularGruposPagoTerceros } from '@/lib/services/pagoTerceros'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const CATEGORIA_GASTO_HONORARIOS = 'Honorarios Terceros'

interface LineaPayload {
  usuarioId: string
  proyectoId: string
  /** Monto que el usuario dejó en el preview, puede diferir del subtotal sugerido (ajuste manual). */
  monto: number
}

interface PagoTercerosPayload {
  fechaDesde: string
  fechaHasta: string
  proyectoId?: string
  lineas: LineaPayload[]
}

function formatFechaCorta(d: Date) {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// POST /api/hoja-de-gastos/pago-terceros — liquida las horas de terceros del
// periodo. Vuelve a calcular los grupos server-side (no confía en lo que
// mandó el cliente) para no liquidar dos veces horas ya pagadas ni horas que
// dejaron de calificar entre que se abrió el preview y se confirmó.
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
    if (!Array.isArray(payload.lineas) || payload.lineas.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos una línea' }, { status: 400 })
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
    const { grupos } = await calcularGruposPagoTerceros({
      fechaDesde,
      fechaHasta,
      proyectoId: payload.proyectoId,
    })
    const gruposPorClave = new Map(grupos.map((g) => [`${g.usuarioId}::${g.proyectoId}`, g]))

    const lineasValidas: Array<{ grupo: (typeof grupos)[number]; monto: number }> = []
    const omitidas: string[] = []

    for (const l of payload.lineas) {
      const grupo = gruposPorClave.get(`${l.usuarioId}::${l.proyectoId}`)
      if (!grupo) {
        omitidas.push(`${l.usuarioId} / proyecto ${l.proyectoId}`)
        continue
      }
      const monto = Number.isFinite(l.monto) && l.monto >= 0 ? l.monto : grupo.subtotal
      lineasValidas.push({ grupo, monto })
    }

    if (lineasValidas.length === 0) {
      return NextResponse.json(
        {
          error: 'Ninguna de las líneas sigue disponible — probablemente ya se liquidaron en otra hoja mientras revisabas.',
          omitidas,
        },
        { status: 409 },
      )
    }

    const totalPersonas = new Set(lineasValidas.map((l) => l.grupo.usuarioId)).size
    const motivo = `Pago a terceros — ${formatFechaCorta(fechaDesde)} al ${formatFechaCorta(fechaHasta)} (${totalPersonas} persona${totalPersonas !== 1 ? 's' : ''})`

    const numero = await generarNumeroHoja()

    const hoja = await prisma.$transaction(async (tx) => {
      // proyectoId: null a propósito. Todos los reportes de costos reales
      // (costos-reales, margen-real, rentabilidad, kpis) solo suman una hoja
      // de gastos cuando su CABECERA tiene proyectoId — nunca miran el
      // proyectoId de cada línea. Dejarlo null aquí excluye automáticamente
      // esta liquidación de esos reportes: el costo del proyecto ya lo aporta
      // el devengado por horas (RegistroHoras.costoHora), y esta hoja es solo
      // el registro de PAGO — sumar ambos duplicaría el costo.
      const creada = await tx.hojaDeGastos.create({
        data: {
          numero,
          proyectoId: null,
          categoriaCosto: 'servicios',
          tipoPropósito: 'honorarios_terceros',
          empleadoId: session.user.id,
          motivo,
          requiereAnticipo: false,
          estado: 'enviado',
          fechaEnvio: new Date(),
          updatedAt: new Date(),
        },
      })

      for (const { grupo, monto } of lineasValidas) {
        await tx.gastoLinea.create({
          data: {
            hojaDeGastosId: creada.id,
            categoriaGastoId: catHonorarios.id,
            descripcion: `Honorarios ${grupo.nombre} — ${grupo.dias}d × ${grupo.proyectoCodigo}`,
            fecha: fechaHasta,
            monto,
            moneda: 'PEN',
            proyectoId: grupo.proyectoId,
            categoriaCosto: 'servicios',
            updatedAt: new Date(),
          },
        })

        await tx.registroHoras.updateMany({
          where: { id: { in: grupo.registroIds } },
          data: { liquidadoEnHojaId: creada.id },
        })
      }

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: creada.id,
          tipo: 'creado',
          descripcion: `Liquidación de terceros ${numero} creada — ${lineasValidas.length} línea(s)`,
          estadoNuevo: 'borrador',
          usuarioId: session.user.id,
          metadata: { fechaDesde: payload.fechaDesde, fechaHasta: payload.fechaHasta, omitidas },
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

      return tx.hojaDeGastos.findUniqueOrThrow({
        where: { id: creada.id },
        include: { lineas: true, empleado: { select: { id: true, name: true, email: true } } },
      })
    })

    return NextResponse.json({ hoja, omitidas })
  } catch (error) {
    console.error('Error al crear liquidación de terceros:', error)
    return NextResponse.json({ error: 'Error al crear la liquidación' }, { status: 500 })
  }
}
