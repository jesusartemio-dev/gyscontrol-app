import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function generarNumero(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `REQ-${yy}${mm}${dd}`

  const ultimo = await prisma.hojaDeGastos.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  centroCosto: { select: { id: true, nombre: true, tipo: true } },
  empleado: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  lineas: {
    include: {
      adjuntos: true,
      categoriaGasto: true,
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      centroCosto: { select: { id: true, nombre: true } },
    },
    orderBy: { fecha: 'asc' as const },
  },
  itemsMateriales: {
    include: {
      pedidoEquipoItem: {
        select: {
          id: true,
          codigo: true,
          descripcion: true,
          unidad: true,
          cantidadPedida: true,
          cantidadAtendida: true,
          precioUnitario: true,
        },
      },
      pedidoEquipo: { select: { id: true, codigo: true } },
      proyecto: { select: { id: true, codigo: true, nombre: true } },
    },
  },
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const centroCostoId = searchParams.get('centroCostoId')
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')
    const empleadoId = searchParams.get('empleadoId')
    const scope = searchParams.get('scope')
    const tipoProposito = searchParams.get('tipoProposito')

    const where: any = {}
    if (centroCostoId) where.centroCostoId = centroCostoId
    if (proyectoId) where.proyectoId = proyectoId
    if (estado) where.estado = estado
    if (empleadoId) where.empleadoId = empleadoId
    if (tipoProposito) where['tipoPropósito'] = tipoProposito

    // scope=propios: solo hojas del usuario actual (ignora filtro de roles)
    if (scope === 'propios') {
      where.empleadoId = session.user.id
    } else {
      // Filtrar por permisos
      const role = session.user.role
      if (!['admin', 'gerente', 'administracion', 'gestor', 'coordinador', 'coordinador_logistico'].includes(role)) {
        where.OR = [
          { empleadoId: session.user.id },
          // Hojas de proyecto: visible si eres gestor/supervisor/lider
          { proyecto: { gestorId: session.user.id } },
          { proyecto: { supervisorId: session.user.id } },
          { proyecto: { liderId: session.user.id } },
        ]
      }
    }

    const data = await prisma.hojaDeGastos.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener hojas de gastos:', error)
    return NextResponse.json({ error: 'Error al obtener hojas de gastos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await req.json()

    const tipoProposito: string = payload.tipoProposito || 'gastos_viaticos'
    const esCompra = tipoProposito === 'compra_materiales'

    // ─── Requerimiento de materiales ───────────────────────────────────────
    if (esCompra) {
      // Solo logística puede crear requerimientos de materiales
      if (!['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Solo logística puede crear requerimientos de materiales' }, { status: 403 })
      }

      if (!payload.motivo?.trim()) {
        return NextResponse.json({ error: 'El motivo es requerido' }, { status: 400 })
      }

      // Items obligatorios al crear
      const items: Array<{
        pedidoEquipoItemId: string
        pedidoId: string
        proyectoId: string
        codigo: string
        descripcion: string
        unidad: string
        cantidadSolicitada: number
        precioEstimado?: number | null
      }> = payload.items || []

      if (items.length === 0) {
        return NextResponse.json({ error: 'Debe incluir al menos un item del pedido' }, { status: 400 })
      }

      // Buscar CC GYS.LOG automáticamente (nombre exacto primero, luego fallback contains LOG)
      const ccLogistica = await prisma.centroCosto.findFirst({
        where: {
          OR: [
            { nombre: { equals: 'GYS.LOG', mode: 'insensitive' } },
            { nombre: { contains: 'GYS.LOG', mode: 'insensitive' } },
          ],
          activo: true,
        },
      })
      if (!ccLogistica) {
        return NextResponse.json({ error: 'Centro de costo GYS.LOG no encontrado. Contacte al administrador.' }, { status: 400 })
      }

      // Validar que los pedidoEquipoItemIds existen y son elegibles
      const itemIds = items.map(i => i.pedidoEquipoItemId)
      const pedidoItems = await prisma.pedidoEquipoItem.findMany({
        where: { id: { in: itemIds } },
        select: {
          id: true,
          pedidoId: true,
          codigo: true,
          descripcion: true,
          unidad: true,
          precioUnitario: true,
          pedidoEquipo: { select: { proyectoId: true, estado: true } },
        },
      })

      if (pedidoItems.length !== items.length) {
        return NextResponse.json({ error: 'Uno o más items del pedido no fueron encontrados' }, { status: 400 })
      }

      const itemsMap = new Map(pedidoItems.map(i => [i.id, i]))

      const numero = await generarNumero()

      // Calcular monto estimado (suma de cantidadSolicitada × precioEstimado)
      const montoEstimado = items.reduce((sum, item) => {
        const precio = item.precioEstimado ?? itemsMap.get(item.pedidoEquipoItemId)?.precioUnitario ?? 0
        return sum + (item.cantidadSolicitada * precio)
      }, 0)

      const data = await prisma.$transaction(async (tx) => {
        const hoja = await tx.hojaDeGastos.create({
          data: {
            numero,
            proyectoId: null,
            centroCostoId: ccLogistica.id,
            categoriaCosto: 'equipos',
            tipoPropósito: 'compra_materiales',
            empleadoId: payload.empleadoId || session.user.id,
            motivo: payload.motivo.trim(),
            justificacionMateriales: payload.justificacionMateriales?.trim() || null,
            observaciones: payload.observaciones || null,
            requiereAnticipo: payload.requiereAnticipo ?? true,
            montoAnticipo: payload.requiereAnticipo !== false ? (payload.montoAnticipo || montoEstimado) : 0,
            updatedAt: new Date(),
          },
          include: includeRelations,
        })

        // Crear RequerimientoMaterialItems
        for (const item of items) {
          const pedidoItem = itemsMap.get(item.pedidoEquipoItemId)!
          const precioEstimado = item.precioEstimado ?? pedidoItem.precioUnitario ?? null
          const totalEstimado = precioEstimado !== null ? item.cantidadSolicitada * precioEstimado : null

          await tx.requerimientoMaterialItem.create({
            data: {
              hojaDeGastosId: hoja.id,
              pedidoEquipoItemId: item.pedidoEquipoItemId,
              pedidoId: item.pedidoId || pedidoItem.pedidoId,
              proyectoId: (item.proyectoId || pedidoItem.pedidoEquipo.proyectoId) as string,
              codigo: item.codigo || pedidoItem.codigo,
              descripcion: item.descripcion || pedidoItem.descripcion,
              unidad: item.unidad || pedidoItem.unidad,
              cantidadSolicitada: item.cantidadSolicitada,
              precioEstimado,
              totalEstimado,
              updatedAt: new Date(),
            },
          })
        }

        await tx.hojaDeGastosEvento.create({
          data: {
            hojaDeGastosId: hoja.id,
            tipo: 'creado',
            descripcion: `Requerimiento de materiales ${numero} creado con ${items.length} item(s)`,
            estadoNuevo: 'borrador',
            usuarioId: session.user.id,
          },
        })

        return hoja
      })

      return NextResponse.json(data)
    }

    // ─── Requerimiento de gastos/viáticos (flujo existente) ────────────────
    // Mutual exclusivity: proyectoId XOR centroCostoId
    const hasProyecto = !!payload.proyectoId
    const hasCentroCosto = !!payload.centroCostoId
    if (hasProyecto && hasCentroCosto) {
      return NextResponse.json({ error: 'Debe imputar a proyecto O centro de costo, no ambos' }, { status: 400 })
    }
    if (!hasProyecto && !hasCentroCosto) {
      return NextResponse.json({ error: 'Debe seleccionar un proyecto o centro de costo' }, { status: 400 })
    }

    // Validate proyecto or centro de costo
    if (hasProyecto) {
      const proyecto = await prisma.proyecto.findUnique({ where: { id: payload.proyectoId } })
      if (!proyecto) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
      }
    }
    if (hasCentroCosto) {
      const centroCosto = await prisma.centroCosto.findUnique({ where: { id: payload.centroCostoId } })
      if (!centroCosto) {
        return NextResponse.json({ error: 'Centro de costo no encontrado' }, { status: 404 })
      }
      if (!centroCosto.activo) {
        return NextResponse.json({ error: 'Centro de costo inactivo' }, { status: 400 })
      }
    }

    if (!payload.motivo?.trim()) {
      return NextResponse.json({ error: 'El motivo es requerido' }, { status: 400 })
    }

    const numero = await generarNumero()

    const data = await prisma.$transaction(async (tx) => {
      const hoja = await tx.hojaDeGastos.create({
        data: {
          numero,
          proyectoId: payload.proyectoId || null,
          centroCostoId: payload.centroCostoId || null,
          categoriaCosto: payload.categoriaCosto || 'gastos',
          empleadoId: payload.empleadoId || session.user.id,
          motivo: payload.motivo.trim(),
          observaciones: payload.observaciones || null,
          requiereAnticipo: payload.requiereAnticipo || false,
          montoAnticipo: payload.requiereAnticipo ? (payload.montoAnticipo || 0) : 0,
          updatedAt: new Date(),
        },
        include: includeRelations,
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: hoja.id,
          tipo: 'creado',
          descripcion: `Requerimiento ${numero} creado`,
          estadoNuevo: 'borrador',
          usuarioId: session.user.id,
        },
      })

      return hoja
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al crear hoja de gastos:', error)
    return NextResponse.json({ error: 'Error al crear hoja de gastos' }, { status: 500 })
  }
}
