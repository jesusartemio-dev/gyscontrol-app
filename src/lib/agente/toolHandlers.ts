// src/lib/agente/toolHandlers.ts
// Handlers de búsqueda y creación - operaciones Prisma directas

import { prisma } from '@/lib/prisma'
import { generateNextCotizacionCode } from '@/lib/utils/cotizacionCodeGenerator'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import { calcularHoras, type TipoFormula } from '@/lib/utils/formulas'
import type { ToolHandlerMap } from './types'

// ── Helpers ───────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

const now = () => new Date()

// ── Handlers ──────────────────────────────────────────────

export const toolHandlers: ToolHandlerMap = {
  // ════════════════════════════════════════════════════════
  // SEARCH TOOLS (Phase 1)
  // ════════════════════════════════════════════════════════

  buscar_equipos_catalogo: async (input) => {
    const query = (input.query as string) || ''
    const categoria = input.categoria as string | undefined
    const marca = input.marca as string | undefined
    const limit = (input.limit as number) || 15

    const where: Record<string, unknown> = {}

    if (query) {
      where.OR = [
        { descripcion: { contains: query, mode: 'insensitive' } },
        { codigo: { contains: query, mode: 'insensitive' } },
        { marca: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (categoria) {
      where.categoriaEquipo = { nombre: { contains: categoria, mode: 'insensitive' } }
    }
    if (marca) {
      where.marca = { contains: marca, mode: 'insensitive' }
    }

    const equipos = await prisma.catalogoEquipo.findMany({
      where,
      include: { categoriaEquipo: true, unidad: true },
      take: limit,
      orderBy: { descripcion: 'asc' },
    })

    return equipos.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      descripcion: e.descripcion,
      marca: e.marca,
      categoria: e.categoriaEquipo.nombre,
      unidad: e.unidad.nombre,
      precioLista: e.precioLista,
      factorCosto: e.factorCosto,
      precioInterno: e.precioInterno,
      factorVenta: e.factorVenta,
      precioVenta: e.precioVenta,
      estado: e.estado,
    }))
  },

  buscar_servicios_catalogo: async (input) => {
    const query = (input.query as string) || ''
    const edtNombre = input.edtNombre as string | undefined
    const recursoNombre = input.recursoNombre as string | undefined
    const limit = (input.limit as number) || 15

    const where: Record<string, unknown> = {}

    if (query) {
      where.OR = [
        { nombre: { contains: query, mode: 'insensitive' } },
        { descripcion: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (edtNombre) {
      where.edt = { nombre: { contains: edtNombre, mode: 'insensitive' } }
    }
    if (recursoNombre) {
      where.recurso = { nombre: { contains: recursoNombre, mode: 'insensitive' } }
    }

    const servicios = await prisma.catalogoServicio.findMany({
      where,
      include: { edt: true, unidadServicio: true, recurso: true },
      take: limit,
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    })

    return servicios.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      edt: s.edt.nombre,
      edtId: s.edt.id,
      recurso: s.recurso.nombre,
      recursoId: s.recurso.id,
      costoHora: s.recurso.costoHora,
      unidadServicio: s.unidadServicio.nombre,
      unidadServicioId: s.unidadServicio.id,
      horaBase: s.horaBase,
      horaRepetido: s.horaRepetido,
      cantidad: s.cantidad,
      nivelDificultad: s.nivelDificultad,
    }))
  },

  buscar_gastos_catalogo: async (input) => {
    const query = (input.query as string) || ''
    const categoria = input.categoria as string | undefined
    const limit = (input.limit as number) || 15

    const where: Record<string, unknown> = {}

    if (query) {
      where.OR = [
        { descripcion: { contains: query, mode: 'insensitive' } },
        { codigo: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (categoria) {
      where.categoria = { nombre: { contains: categoria, mode: 'insensitive' } }
    }
    where.estado = 'activo'

    const gastos = await prisma.catalogoGasto.findMany({
      where,
      include: { categoria: true },
      take: limit,
      orderBy: { descripcion: 'asc' },
    })

    return gastos.map((g) => ({
      id: g.id,
      codigo: g.codigo,
      descripcion: g.descripcion,
      categoria: g.categoria.nombre,
      cantidad: g.cantidad,
      precioInterno: g.precioInterno,
      margen: g.margen,
      precioVenta: g.precioVenta,
    }))
  },

  buscar_clientes: async (input) => {
    const query = (input.query as string) || ''
    const limit = (input.limit as number) || 10

    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { ruc: { contains: query, mode: 'insensitive' } },
          { codigo: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { nombre: 'asc' },
    })

    return clientes.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      ruc: c.ruc,
      direccion: c.direccion,
      telefono: c.telefono,
      correo: c.correo,
      sector: c.sector,
      estadoRelacion: c.estadoRelacion,
    }))
  },

  buscar_recursos: async (input) => {
    const nombre = input.nombre as string | undefined
    const tipo = input.tipo as string | undefined

    const where: Record<string, unknown> = {}

    if (nombre) {
      where.nombre = { contains: nombre, mode: 'insensitive' }
    }
    if (tipo) {
      where.tipo = tipo
    }

    const recursos = await prisma.recurso.findMany({
      where,
      orderBy: { nombre: 'asc' },
    })

    return recursos.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      costoHora: r.costoHora,
      descripcion: r.descripcion,
    }))
  },

  buscar_cotizaciones_similares: async (input) => {
    const query = input.query as string | undefined
    const clienteNombre = input.clienteNombre as string | undefined
    const estado = input.estado as string | undefined
    const limit = (input.limit as number) || 10

    const where: Record<string, unknown> = {}

    if (query) {
      where.nombre = { contains: query, mode: 'insensitive' }
    }
    if (clienteNombre) {
      where.cliente = { nombre: { contains: clienteNombre, mode: 'insensitive' } }
    }
    if (estado) {
      where.estado = estado
    }

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      include: {
        cliente: { select: { nombre: true, codigo: true } },
        user: { select: { name: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return cotizaciones.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      estado: c.estado,
      cliente: c.cliente?.nombre || 'Sin cliente',
      comercial: c.user?.name || 'Sin comercial',
      moneda: c.moneda,
      totalInterno: c.totalInterno,
      totalCliente: c.totalCliente,
      grandTotal: c.grandTotal,
      fecha: c.fecha,
    }))
  },

  obtener_edts: async () => {
    const edts = await prisma.edt.findMany({
      orderBy: { nombre: 'asc' },
    })

    return edts.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      descripcion: e.descripcion,
    }))
  },

  obtener_unidades: async () => {
    const [unidades, unidadesServicio] = await Promise.all([
      prisma.unidad.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.unidadServicio.findMany({ orderBy: { nombre: 'asc' } }),
    ])

    return {
      unidadesEquipo: unidades.map((u) => ({ id: u.id, nombre: u.nombre })),
      unidadesServicio: unidadesServicio.map((u) => ({ id: u.id, nombre: u.nombre })),
    }
  },

  // ════════════════════════════════════════════════════════
  // PROJECT READ-ONLY TOOLS
  // ════════════════════════════════════════════════════════

  buscar_proyectos: async (input) => {
    const query = input.query as string | undefined
    const clienteNombre = input.clienteNombre as string | undefined
    const estado = input.estado as string | undefined
    const limit = (input.limit as number) || 10

    const where: Record<string, unknown> = { deletedAt: null }

    if (query) {
      where.OR = [
        { nombre: { contains: query, mode: 'insensitive' } },
        { codigo: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (clienteNombre) {
      where.cliente = { nombre: { contains: clienteNombre, mode: 'insensitive' } }
    }
    if (estado) {
      where.estado = estado
    }

    const proyectos = await prisma.proyecto.findMany({
      where,
      include: {
        cliente: { select: { nombre: true } },
        comercial: { select: { name: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return proyectos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      cliente: p.cliente.nombre,
      estado: p.estado,
      moneda: p.moneda,
      comercial: p.comercial.name,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      progresoGeneral: p.progresoGeneral,
      // Cotizado
      totalInterno: p.totalInterno,
      totalCliente: p.totalCliente,
      grandTotal: p.grandTotal,
      // Real
      totalReal: p.totalReal,
      totalRealEquipos: p.totalRealEquipos,
      totalRealServicios: p.totalRealServicios,
      totalRealGastos: p.totalRealGastos,
      // Desviación
      desviacionPorcentaje:
        p.totalInterno > 0
          ? +((p.totalReal / p.totalInterno - 1) * 100).toFixed(1)
          : null,
    }))
  },

  obtener_detalle_proyecto: async (input) => {
    const proyectoId = input.proyectoId as string

    const p = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        cliente: { select: { nombre: true, ruc: true } },
        comercial: { select: { name: true } },
        gestor: { select: { name: true } },
        proyectoEquipoCotizado: {
          include: {
            proyectoEquipoCotizadoItem: {
              select: {
                descripcion: true,
                codigo: true,
                categoria: true,
                marca: true,
                unidad: true,
                cantidad: true,
                precioInterno: true,
                precioCliente: true,
                costoInterno: true,
                costoCliente: true,
                precioReal: true,
                cantidadReal: true,
                costoReal: true,
                estado: true,
              },
            },
          },
        },
        proyectoServicioCotizado: {
          include: {
            edt: { select: { nombre: true } },
            proyectoServicioCotizadoItem: {
              select: {
                nombre: true,
                cantidadHoras: true,
                costoInterno: true,
                costoCliente: true,
                costoReal: true,
                horasEjecutadas: true,
              },
            },
          },
        },
        proyectoGastoCotizado: {
          include: {
            proyectoGastoCotizadoItem: {
              select: {
                nombre: true,
                cantidad: true,
                precioUnitario: true,
                costoInterno: true,
                costoCliente: true,
                costoReal: true,
              },
            },
          },
        },
      },
    })

    if (!p) throw new Error(`Proyecto ${proyectoId} no encontrado`)

    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      cliente: p.cliente.nombre,
      clienteRuc: p.cliente.ruc,
      comercial: p.comercial.name,
      gestor: p.gestor.name,
      estado: p.estado,
      moneda: p.moneda,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin,
      progresoGeneral: p.progresoGeneral,
      // Totales cotizados
      totalInterno: p.totalInterno,
      totalCliente: p.totalCliente,
      grandTotal: p.grandTotal,
      // Totales reales
      totalReal: p.totalReal,
      totalRealEquipos: p.totalRealEquipos,
      totalRealServicios: p.totalRealServicios,
      totalRealGastos: p.totalRealGastos,
      // Detalle por categoría
      equipos: p.proyectoEquipoCotizado.map((g) => ({
        grupo: g.nombre,
        subtotalInterno: g.subtotalInterno,
        subtotalReal: g.subtotalReal,
        items: g.proyectoEquipoCotizadoItem,
      })),
      servicios: p.proyectoServicioCotizado.map((g) => ({
        grupo: g.nombre,
        edt: g.edt.nombre,
        subtotalInterno: g.subtotalInterno,
        subtotalReal: g.subtotalReal,
        items: g.proyectoServicioCotizadoItem,
      })),
      gastos: p.proyectoGastoCotizado.map((g) => ({
        grupo: g.nombre,
        subtotalInterno: g.subtotalInterno,
        subtotalReal: g.subtotalReal,
        items: g.proyectoGastoCotizadoItem,
      })),
      // Resumen desviación
      desviacion: {
        equipos: p.totalRealEquipos > 0
          ? +((p.totalRealEquipos / p.totalEquiposInterno - 1) * 100).toFixed(1)
          : null,
        servicios: p.totalRealServicios > 0
          ? +((p.totalRealServicios / p.totalServiciosInterno - 1) * 100).toFixed(1)
          : null,
        gastos: p.totalRealGastos > 0
          ? +((p.totalRealGastos / p.totalGastosInterno - 1) * 100).toFixed(1)
          : null,
        total: p.totalReal > 0
          ? +((p.totalReal / p.totalInterno - 1) * 100).toFixed(1)
          : null,
      },
    }
  },

  buscar_listas_equipo: async (input) => {
    const proyectoId = input.proyectoId as string | undefined
    const query = input.query as string | undefined
    const estado = input.estado as string | undefined
    const limit = (input.limit as number) || 10

    const where: Record<string, unknown> = {}

    if (proyectoId) where.proyectoId = proyectoId
    if (query) {
      where.nombre = { contains: query, mode: 'insensitive' }
    }
    if (estado) where.estado = estado

    const listas = await prisma.listaEquipo.findMany({
      where,
      include: {
        proyecto: { select: { nombre: true, codigo: true } },
        listaEquipoItem: {
          select: {
            descripcion: true,
            codigo: true,
            categoria: true,
            unidad: true,
            marca: true,
            cantidad: true,
            presupuesto: true,
            precioElegido: true,
            costoElegido: true,
            costoReal: true,
            estado: true,
          },
          take: 50,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return listas.map((l) => ({
      id: l.id,
      codigo: l.codigo,
      nombre: l.nombre,
      estado: l.estado,
      proyecto: l.proyecto.nombre,
      proyectoCodigo: l.proyecto.codigo,
      totalItems: l.listaEquipoItem.length,
      items: l.listaEquipoItem,
    }))
  },

  obtener_cronograma_proyecto: async (input) => {
    const proyectoId = input.proyectoId as string

    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoId },
      orderBy: { orden: 'asc' },
      include: {
        proyectoEdt: {
          select: {
            nombre: true,
            porcentajeAvance: true,
            estado: true,
          },
          orderBy: { orden: 'asc' },
        },
      },
    })

    if (fases.length === 0) {
      return { message: 'Este proyecto no tiene cronograma definido', fases: [] }
    }

    return {
      totalFases: fases.length,
      fases: fases.map((f) => ({
        nombre: f.nombre,
        estado: f.estado,
        porcentajeAvance: f.porcentajeAvance,
        fechaInicioPlan: f.fechaInicioPlan,
        fechaFinPlan: f.fechaFinPlan,
        fechaInicioReal: f.fechaInicioReal,
        fechaFinReal: f.fechaFinReal,
        edts: f.proyectoEdt.map((e) => ({
          nombre: e.nombre,
          avance: e.porcentajeAvance,
          estado: e.estado,
        })),
      })),
    }
  },

  buscar_ordenes_compra: async (input) => {
    const proyectoId = input.proyectoId as string | undefined
    const proveedorNombre = input.proveedorNombre as string | undefined
    const estado = input.estado as string | undefined
    const limit = (input.limit as number) || 10

    const where: Record<string, unknown> = {}

    if (proyectoId) where.proyectoId = proyectoId
    if (proveedorNombre) {
      where.proveedor = { nombre: { contains: proveedorNombre, mode: 'insensitive' } }
    }
    if (estado) where.estado = estado

    const ordenes = await prisma.ordenCompra.findMany({
      where,
      include: {
        proveedor: { select: { nombre: true, ruc: true } },
        proyecto: { select: { nombre: true, codigo: true } },
        items: {
          select: {
            codigo: true,
            descripcion: true,
            unidad: true,
            cantidad: true,
            precioUnitario: true,
            costoTotal: true,
            cantidadRecibida: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return ordenes.map((oc) => ({
      id: oc.id,
      numero: oc.numero,
      estado: oc.estado,
      moneda: oc.moneda,
      subtotal: oc.subtotal,
      igv: oc.igv,
      total: oc.total,
      proveedor: oc.proveedor.nombre,
      proveedorRuc: oc.proveedor.ruc,
      proyecto: oc.proyecto?.nombre || null,
      proyectoCodigo: oc.proyecto?.codigo || null,
      condicionPago: oc.condicionPago,
      fechaEmision: oc.fechaEmision,
      fechaEntregaEstimada: oc.fechaEntregaEstimada,
      items: oc.items,
    }))
  },

  // ════════════════════════════════════════════════════════
  // CREATION TOOLS (Phase 2)
  // ════════════════════════════════════════════════════════

  crear_cotizacion: async (input, context) => {
    const nombre = input.nombre as string
    const clienteId = input.clienteId as string
    const moneda = (input.moneda as string) || 'USD'
    const notas = input.notas as string | undefined

    // Validate client exists
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) throw new Error(`Cliente con ID ${clienteId} no encontrado`)

    const { codigo, numeroSecuencia } = await generateNextCotizacionCode()
    const cotizacionId = genId('cot')

    await prisma.cotizacion.create({
      data: {
        id: cotizacionId,
        codigo,
        numeroSecuencia,
        nombre,
        clienteId,
        comercialId: context.userId,
        estado: 'borrador',
        moneda,
        notas: notas || null,
        formaPago: null,
        validezOferta: 15,
        fecha: now(),
        updatedAt: now(),
        totalEquiposInterno: 0,
        totalEquiposCliente: 0,
        totalServiciosInterno: 0,
        totalServiciosCliente: 0,
        totalGastosInterno: 0,
        totalGastosCliente: 0,
        totalInterno: 0,
        totalCliente: 0,
        grandTotal: 0,
      },
    })

    return {
      cotizacionId,
      codigo,
      nombre,
      cliente: cliente.nombre,
      moneda,
      estado: 'borrador',
      link: `/comercial/cotizaciones/${cotizacionId}`,
    }
  },

  agregar_equipos: async (input) => {
    const cotizacionId = input.cotizacionId as string
    const grupoNombre = input.grupoNombre as string
    const items = input.items as Array<Record<string, unknown>>

    // Validate cotización exists
    const cot = await prisma.cotizacion.findUnique({ where: { id: cotizacionId } })
    if (!cot) throw new Error(`Cotización ${cotizacionId} no encontrada`)

    const grupoId = genId('cot-eq')
    await prisma.cotizacionEquipo.create({
      data: {
        id: grupoId,
        cotizacionId,
        nombre: grupoNombre,
        subtotalInterno: 0,
        subtotalCliente: 0,
        updatedAt: now(),
      },
    })

    let itemCount = 0
    for (const item of items) {
      const precioLista = Number(item.precioLista) || 0
      const factorCosto = Number(item.factorCosto) || 1.0
      const factorVenta = Number(item.factorVenta) || 1.25
      const cantidad = Number(item.cantidad) || 1
      const precioInterno = +(precioLista * factorCosto).toFixed(2)
      const precioCliente = +(precioInterno * factorVenta).toFixed(2)
      const costoInterno = +(precioInterno * cantidad).toFixed(2)
      const costoCliente = +(precioCliente * cantidad).toFixed(2)

      await prisma.cotizacionEquipoItem.create({
        data: {
          id: genId('cot-eqi'),
          cotizacionEquipoId: grupoId,
          catalogoEquipoId: (item.catalogoEquipoId as string) || null,
          codigo: (item.codigo as string) || `EQ-${(++itemCount).toString().padStart(3, '0')}`,
          descripcion: item.descripcion as string,
          categoria: (item.categoria as string) || 'General',
          unidad: (item.unidad as string) || 'Und',
          marca: (item.marca as string) || '',
          precioLista,
          precioInterno,
          factorCosto,
          factorVenta,
          precioCliente,
          cantidad,
          costoInterno,
          costoCliente,
          updatedAt: now(),
        },
      })
    }

    // Recalculate totals
    const totales = await recalcularTotalesCotizacion(cotizacionId)

    return {
      grupoId,
      grupoNombre,
      itemsCreados: items.length,
      totalesCotizacion: totales,
    }
  },

  agregar_servicios: async (input) => {
    const cotizacionId = input.cotizacionId as string
    const grupoNombre = input.grupoNombre as string
    const edtId = input.edtId as string
    const items = input.items as Array<Record<string, unknown>>

    // Validate cotización and EDT
    const cot = await prisma.cotizacion.findUnique({ where: { id: cotizacionId } })
    if (!cot) throw new Error(`Cotización ${cotizacionId} no encontrada`)
    const edt = await prisma.edt.findUnique({ where: { id: edtId } })
    if (!edt) throw new Error(`EDT ${edtId} no encontrado`)

    // Get default unidadServicio (Hora)
    let defaultUnidadServicioId: string | null = null
    let defaultUnidadServicioNombre = 'Hora'
    const unidadHora = await prisma.unidadServicio.findFirst({
      where: { nombre: { contains: 'Hora', mode: 'insensitive' } },
    })
    if (unidadHora) {
      defaultUnidadServicioId = unidadHora.id
      defaultUnidadServicioNombre = unidadHora.nombre
    } else {
      const anyUnit = await prisma.unidadServicio.findFirst()
      if (anyUnit) {
        defaultUnidadServicioId = anyUnit.id
        defaultUnidadServicioNombre = anyUnit.nombre
      }
    }

    const grupoId = genId('cot-sv')
    await prisma.cotizacionServicio.create({
      data: {
        id: grupoId,
        cotizacionId,
        nombre: grupoNombre,
        edtId,
        subtotalInterno: 0,
        subtotalCliente: 0,
        updatedAt: now(),
      },
    })

    for (const item of items) {
      const recursoId = item.recursoId as string
      // Fetch recurso to get costoHora if not provided
      const recurso = await prisma.recurso.findUnique({ where: { id: recursoId } })
      if (!recurso) throw new Error(`Recurso ${recursoId} no encontrado`)

      const costoHora = Number(item.costoHora) || recurso.costoHora
      const cantidad = Number(item.cantidad) || 1
      const horaBase = Number(item.horaBase) || 0
      const horaRepetido = Number(item.horaRepetido) || 0
      const horaFijo = Number(item.horaFijo) || 0
      const formula = (item.formula as TipoFormula) || 'Escalonada'
      const factorSeguridad = Number(item.factorSeguridad) || 1.0
      const margen = Number(item.margen) || 1.35

      // Resolve unidadServicio
      let unidadServicioId = defaultUnidadServicioId
      let unidadServicioNombre = defaultUnidadServicioNombre
      if (item.unidadServicioId) {
        const us = await prisma.unidadServicio.findUnique({
          where: { id: item.unidadServicioId as string },
        })
        if (us) {
          unidadServicioId = us.id
          unidadServicioNombre = us.nombre
        }
      }

      const horaTotal = calcularHoras({
        formula,
        cantidad,
        horaBase,
        horaRepetido,
        horaFijo,
      })

      const costoCliente = +(horaTotal * costoHora * factorSeguridad).toFixed(2)
      const costoInterno = margen > 0 ? +(costoCliente / margen).toFixed(2) : costoCliente

      await prisma.cotizacionServicioItem.create({
        data: {
          id: genId('cot-svi'),
          cotizacionServicioId: grupoId,
          nombre: item.nombre as string,
          descripcion: (item.descripcion as string) || (item.nombre as string),
          edtId,
          recursoId,
          recursoNombre: recurso.nombre,
          unidadServicioId: unidadServicioId!,
          unidadServicioNombre,
          formula,
          horaFijo,
          horaBase,
          horaRepetido,
          costoHora,
          cantidad,
          horaTotal,
          factorSeguridad,
          margen,
          costoInterno,
          costoCliente,
          updatedAt: now(),
        },
      })
    }

    const totales = await recalcularTotalesCotizacion(cotizacionId)

    return {
      grupoId,
      grupoNombre,
      edtNombre: edt.nombre,
      itemsCreados: items.length,
      totalesCotizacion: totales,
    }
  },

  agregar_gastos: async (input) => {
    const cotizacionId = input.cotizacionId as string
    const grupoNombre = input.grupoNombre as string
    const items = input.items as Array<Record<string, unknown>>

    const cot = await prisma.cotizacion.findUnique({ where: { id: cotizacionId } })
    if (!cot) throw new Error(`Cotización ${cotizacionId} no encontrada`)

    const grupoId = genId('cot-gs')
    await prisma.cotizacionGasto.create({
      data: {
        id: grupoId,
        cotizacionId,
        nombre: grupoNombre,
        subtotalInterno: 0,
        subtotalCliente: 0,
        updatedAt: now(),
      },
    })

    for (const item of items) {
      const cantidad = Number(item.cantidad) || 1
      const precioUnitario = Number(item.precioUnitario) || 0
      const factorSeguridad = Number(item.factorSeguridad) || 1.0
      const margen = Number(item.margen) || 1.0

      const costoCliente = +(cantidad * precioUnitario * factorSeguridad).toFixed(2)
      const costoInterno = margen > 0 ? +(costoCliente / margen).toFixed(2) : costoCliente

      await prisma.cotizacionGastoItem.create({
        data: {
          id: genId('cot-gsi'),
          gastoId: grupoId,
          nombre: item.nombre as string,
          descripcion: (item.descripcion as string) || null,
          cantidad,
          precioUnitario,
          factorSeguridad,
          margen,
          costoInterno,
          costoCliente,
          updatedAt: now(),
        },
      })
    }

    const totales = await recalcularTotalesCotizacion(cotizacionId)

    return {
      grupoId,
      grupoNombre,
      itemsCreados: items.length,
      totalesCotizacion: totales,
    }
  },

  agregar_condiciones: async (input) => {
    const cotizacionId = input.cotizacionId as string
    const condiciones = input.condiciones as Array<Record<string, unknown>>

    const cot = await prisma.cotizacion.findUnique({ where: { id: cotizacionId } })
    if (!cot) throw new Error(`Cotización ${cotizacionId} no encontrada`)

    // Get current max orden
    const lastCondicion = await prisma.cotizacionCondicion.findFirst({
      where: { cotizacionId },
      orderBy: { orden: 'desc' },
    })
    let orden = (lastCondicion?.orden ?? -1) + 1

    for (const c of condiciones) {
      await prisma.cotizacionCondicion.create({
        data: {
          id: genId('cot-cond'),
          cotizacionId,
          descripcion: c.descripcion as string,
          tipo: (c.tipo as string) || null,
          orden: orden++,
          updatedAt: now(),
        },
      })
    }

    return { condicionesAgregadas: condiciones.length, totalOrden: orden }
  },

  agregar_exclusiones: async (input) => {
    const cotizacionId = input.cotizacionId as string
    const exclusiones = input.exclusiones as Array<Record<string, unknown>>

    const cot = await prisma.cotizacion.findUnique({ where: { id: cotizacionId } })
    if (!cot) throw new Error(`Cotización ${cotizacionId} no encontrada`)

    const lastExclusion = await prisma.cotizacionExclusion.findFirst({
      where: { cotizacionId },
      orderBy: { orden: 'desc' },
    })
    let orden = (lastExclusion?.orden ?? -1) + 1

    for (const e of exclusiones) {
      await prisma.cotizacionExclusion.create({
        data: {
          id: genId('cot-excl'),
          cotizacionId,
          descripcion: e.descripcion as string,
          orden: orden++,
          updatedAt: now(),
        },
      })
    }

    return { exclusionesAgregadas: exclusiones.length, totalOrden: orden }
  },

  recalcular_cotizacion: async (input) => {
    const cotizacionId = input.cotizacionId as string
    const totales = await recalcularTotalesCotizacion(cotizacionId)
    return totales
  },

  obtener_resumen_cotizacion: async (input) => {
    const cotizacionId = input.cotizacionId as string

    const cot = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: { select: { nombre: true, ruc: true } },
        user: { select: { name: true } },
        cotizacionEquipo: {
          include: {
            cotizacionEquipoItem: {
              select: {
                codigo: true,
                descripcion: true,
                categoria: true,
                unidad: true,
                marca: true,
                precioLista: true,
                factorCosto: true,
                precioInterno: true,
                factorVenta: true,
                precioCliente: true,
                cantidad: true,
                costoInterno: true,
                costoCliente: true,
                catalogoEquipoId: true,
              },
            },
          },
        },
        cotizacionServicio: {
          include: {
            edt: { select: { id: true, nombre: true } },
            cotizacionServicioItem: {
              select: {
                nombre: true,
                descripcion: true,
                recursoId: true,
                recursoNombre: true,
                unidadServicioId: true,
                unidadServicioNombre: true,
                formula: true,
                horaFijo: true,
                horaBase: true,
                horaRepetido: true,
                costoHora: true,
                cantidad: true,
                horaTotal: true,
                factorSeguridad: true,
                margen: true,
                costoInterno: true,
                costoCliente: true,
              },
            },
          },
        },
        cotizacionGasto: {
          include: {
            cotizacionGastoItem: {
              select: {
                nombre: true,
                descripcion: true,
                cantidad: true,
                precioUnitario: true,
                factorSeguridad: true,
                margen: true,
                costoInterno: true,
                costoCliente: true,
              },
            },
          },
        },
        cotizacionCondicion: {
          select: { descripcion: true, tipo: true, orden: true },
          orderBy: { orden: 'asc' },
        },
        cotizacionExclusion: {
          select: { descripcion: true, orden: true },
          orderBy: { orden: 'asc' },
        },
      },
    })

    if (!cot) throw new Error(`Cotización ${cotizacionId} no encontrada`)

    return {
      cotizacionId: cot.id,
      codigo: cot.codigo,
      nombre: cot.nombre,
      estado: cot.estado,
      moneda: cot.moneda,
      cliente: cot.cliente?.nombre || 'Sin cliente',
      clienteRuc: cot.cliente?.ruc || null,
      comercial: cot.user?.name || 'Sin comercial',
      fecha: cot.fecha,
      notas: cot.notas,
      formaPago: cot.formaPago,
      validezOferta: cot.validezOferta,
      equipos: cot.cotizacionEquipo.map((g) => ({
        grupo: g.nombre,
        items: g.cotizacionEquipoItem,
      })),
      servicios: cot.cotizacionServicio.map((g) => ({
        grupo: g.nombre,
        edtId: g.edt?.id || null,
        edtNombre: g.edt?.nombre || null,
        items: g.cotizacionServicioItem,
      })),
      gastos: cot.cotizacionGasto.map((g) => ({
        grupo: g.nombre,
        items: g.cotizacionGastoItem,
      })),
      condiciones: cot.cotizacionCondicion,
      exclusiones: cot.cotizacionExclusion,
      totalEquiposInterno: cot.totalEquiposInterno,
      totalEquiposCliente: cot.totalEquiposCliente,
      totalServiciosInterno: cot.totalServiciosInterno,
      totalServiciosCliente: cot.totalServiciosCliente,
      totalGastosInterno: cot.totalGastosInterno,
      totalGastosCliente: cot.totalGastosCliente,
      totalInterno: cot.totalInterno,
      totalCliente: cot.totalCliente,
      grandTotal: cot.grandTotal,
      link: `/comercial/cotizaciones/${cot.id}`,
    }
  },

  // ════════════════════════════════════════════════════════
  // ANALYSIS TOOLS
  // ════════════════════════════════════════════════════════

  generar_consultas_tdr: async (input) => {
    const tituloTdr = input.tituloTdr as string
    const clienteNombre = input.clienteNombre as string
    const requerimientos = (input.requerimientos as string[]) || []
    const ambiguedades = (input.ambiguedades as string[]) || []
    const vacios = (input.vacios as string[]) || []
    const consultas = (input.consultas as Array<{
      categoria: string
      pregunta: string
      justificacion: string
    }>) || []
    const supuestos = (input.supuestos as string[]) || []

    // Group consultas by category
    const porCategoria = new Map<string, typeof consultas>()
    for (const c of consultas) {
      const cat = c.categoria
      if (!porCategoria.has(cat)) porCategoria.set(cat, [])
      porCategoria.get(cat)!.push(c)
    }

    // Build formatted document
    const lines: string[] = []
    lines.push(`# CONSULTAS Y OBSERVACIONES`)
    lines.push(`**TDR:** ${tituloTdr}`)
    lines.push(`**Cliente:** ${clienteNombre}`)
    lines.push(`**Fecha:** ${new Date().toLocaleDateString('es-PE')}`)
    lines.push(`**Elaborado por:** GYS Control Industrial SAC`)
    lines.push('')

    if (requerimientos.length > 0) {
      lines.push(`## Requerimientos Identificados`)
      requerimientos.forEach((r, i) => lines.push(`${i + 1}. ${r}`))
      lines.push('')
    }

    if (ambiguedades.length > 0) {
      lines.push(`## Puntos Ambiguos Detectados`)
      ambiguedades.forEach((a, i) => lines.push(`${i + 1}. ${a}`))
      lines.push('')
    }

    if (vacios.length > 0) {
      lines.push(`## Información Faltante`)
      vacios.forEach((v, i) => lines.push(`${i + 1}. ${v}`))
      lines.push('')
    }

    lines.push(`## Consultas Formales`)
    lines.push('')
    let consultaNum = 1
    for (const [categoria, items] of porCategoria) {
      lines.push(`### ${categoria}`)
      for (const c of items) {
        lines.push(`**${consultaNum}.** ${c.pregunta}`)
        lines.push(`   _Impacto en cotización: ${c.justificacion}_`)
        lines.push('')
        consultaNum++
      }
    }

    if (supuestos.length > 0) {
      lines.push(`## Supuestos para Cotización Preliminar`)
      lines.push(`_En caso de no recibir respuesta a las consultas anteriores, GYS asumirá:_`)
      supuestos.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
      lines.push('')
    }

    lines.push('---')
    lines.push(`Total de consultas: ${consultas.length}`)
    lines.push(`Categorías: ${[...porCategoria.keys()].join(', ')}`)

    return {
      documento: lines.join('\n'),
      totalConsultas: consultas.length,
      categorias: [...porCategoria.keys()],
      totalRequerimientos: requerimientos.length,
      totalAmbiguedades: ambiguedades.length,
      totalVacios: vacios.length,
      totalSupuestos: supuestos.length,
    }
  },
}
