// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/oportunidades/
// 🔧 Descripción: API para gestión de oportunidades CRM
// ✅ GET: Listar oportunidades con filtros y paginación
// ✅ POST: Crear nueva oportunidad
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { registrarCreacion } from '@/lib/services/audit'
// Tipos locales para CRM
interface CrmOportunidad {
  id: string
  clienteId: string
  nombre: string
  descripcion?: string
  valorEstimado?: number
  probabilidad: number
  fechaCierreEstimada?: Date
  fuente?: string
  estado: string
  prioridad: string
  comercialId?: string
  responsableId?: string
  fechaUltimoContacto?: Date
  notas?: string
  competencia?: string
  createdAt: Date
  updatedAt: Date
}

// ✅ Obtener oportunidades con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // 📊 Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // 🔍 Filtros
    const clienteId = searchParams.get('clienteId')
    const comercialId = searchParams.get('comercialId')
    const estado = searchParams.get('estado')
    const prioridad = searchParams.get('prioridad')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const valorMin = searchParams.get('valorMin')
    const valorMax = searchParams.get('valorMax')

    // 📝 Búsqueda por texto
    const search = searchParams.get('search')

    // ✅ Filtros avanzados
    const hasCotizacion = searchParams.get('hasCotizacion')
    const hasProyecto = searchParams.get('hasProyecto')
    const estadoCotizacion = searchParams.get('estadoCotizacion')
    const estadoProyecto = searchParams.get('estadoProyecto')
    const probabilidadMin = searchParams.get('probabilidadMin')
    const probabilidadMax = searchParams.get('probabilidadMax')
    const diasSinContacto = searchParams.get('diasSinContacto')
    const soloUrgentes = searchParams.get('soloUrgentes')
    const soloVencidas = searchParams.get('soloVencidas')
    const soloActivas = searchParams.get('soloActivas')

    // Quick lookup by proyectoId (for back-links)
    const proyectoId = searchParams.get('proyectoId')
    if (proyectoId) {
      const oportunidades = await prisma.crmOportunidad.findMany({
        where: { proyectoId },
        select: { id: true, nombre: true, estado: true },
        take: 1,
      })
      return NextResponse.json(oportunidades)
    }

    // 🔧 Construir filtros
    const where: any = {}

    if (clienteId) where.clienteId = clienteId
    if (comercialId) where.comercialId = comercialId
    if (estado && estado !== 'todos') where.estado = estado
    if (prioridad && prioridad !== 'todos') where.prioridad = prioridad

    // 📅 Filtros de fecha
    if (fechaDesde || fechaHasta) {
      where.createdAt = {}
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde)
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta)
    }

    // 💰 Filtros de valor
    if (valorMin || valorMax) {
      where.valorEstimado = {}
      if (valorMin) where.valorEstimado.gte = parseFloat(valorMin)
      if (valorMax) where.valorEstimado.lte = parseFloat(valorMax)
    }

    // 🔍 Búsqueda por texto
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // ✅ Filtros avanzados
    if (hasCotizacion === 'true') {
      where.cotizacionId = { not: null }
    } else if (hasCotizacion === 'false') {
      where.cotizacionId = null
    }

    if (hasProyecto === 'true') {
      const proyectos = await prisma.proyecto.findMany({
        select: { cotizacionId: true },
        where: { cotizacionId: { not: null } }
      })
      const cotizacionIdsConProyecto = proyectos.map(p => p.cotizacionId).filter(Boolean) as string[]
      where.cotizacionId = { in: cotizacionIdsConProyecto }
    } else if (hasProyecto === 'false') {
      const proyectos = await prisma.proyecto.findMany({
        select: { cotizacionId: true },
        where: { cotizacionId: { not: null } }
      })
      const cotizacionIdsConProyecto = proyectos.map(p => p.cotizacionId).filter(Boolean) as string[]
      where.OR = [
        { cotizacionId: null },
        { cotizacionId: { notIn: cotizacionIdsConProyecto } }
      ]
    }

    if (estadoCotizacion) {
      where.cotizacion = { estado: estadoCotizacion }
    }

    if (probabilidadMin || probabilidadMax) {
      where.probabilidad = {}
      if (probabilidadMin) where.probabilidad.gte = parseInt(probabilidadMin)
      if (probabilidadMax) where.probabilidad.lte = parseInt(probabilidadMax)
    }

    if (soloUrgentes === 'true') {
      where.AND = [
        { prioridad: { in: ['alta', 'critica'] } },
        { fechaCierreEstimada: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } } // Próximos 30 días
      ]
    }

    if (soloVencidas === 'true') {
      where.fechaCierreEstimada = { lt: new Date() }
    }

    if (soloActivas === 'true') {
      // Excluir estados finales (nuevos y legacy)
      where.estado = { notIn: ['cerrada_ganada', 'cerrada_perdida', 'seguimiento_proyecto', 'feedback_mejora'] }
    }

    // RBAC: comercial solo ve sus propias oportunidades
    const rolesConAccesoTotal = ['admin', 'gerente', 'coordinador']
    if (!rolesConAccesoTotal.includes(session.user.role as string)) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: [{ comercialId: session.user.id }, { responsableId: session.user.id }] }
      ]
    }

    // 📊 Obtener oportunidades con relaciones
    const [oportunidades, total] = await Promise.all([
      prisma.crmOportunidad.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              ruc: true,
              sector: true
            }
          },
          comercial: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          cotizacion: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              estado: true
            }
          },
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          crmActividad: {
            select: {
              id: true,
              tipo: true,
              fecha: true,
              resultado: true
            },
            orderBy: { fecha: 'desc' },
            take: 3
          },
          _count: {
            select: {
              crmActividad: true
            }
          }
        },
        orderBy: [
          { prioridad: 'desc' },
          { fechaCierreEstimada: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.crmOportunidad.count({ where })
    ])

    // 📈 Calcular estadísticas
    const estadisticas = await prisma.crmOportunidad.groupBy({
      by: ['estado'],
      where,
      _count: { id: true },
      _sum: { valorEstimado: true }
    })

    return NextResponse.json({
      data: oportunidades,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      estadisticas: estadisticas.reduce((acc, stat) => {
        acc[stat.estado] = {
          count: stat._count.id,
          valorTotal: stat._sum.valorEstimado || 0
        }
        return acc
      }, {} as Record<string, { count: number; valorTotal: number }>)
    })

  } catch (error) {
    console.error('❌ Error al obtener oportunidades:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva oportunidad
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('👤 Session user:', session.user)

    // ✅ Verificar que el usuario existe, si no, intentar crearlo
    let usuario = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!usuario && session.user.email) {
      // Intentar encontrar por email primero
      usuario = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
    }

    if (!usuario) {
      console.log('⚠️ Usuario no encontrado, intentando crear:', session.user)

      try {
        // Intentar crear el usuario desde la sesión
        usuario = await prisma.user.create({
          data: {
            id: session.user.id,
            name: session.user.name || 'Usuario',
            email: session.user.email || `${session.user.id}@temp.com`,
            password: '$2b$10$dummy.hash.for.session.user', // Hash dummy
            role: 'comercial' // Rol por defecto
          }
        })
        console.log('✅ Usuario creado desde sesión:', usuario.name, usuario.email)
      } catch (createError) {
        console.log('❌ Error creando usuario:', createError)
        return NextResponse.json(
          { error: 'No se pudo crear el usuario de la sesión' },
          { status: 500 }
        )
      }
    } else {
      console.log('✅ Usuario encontrado:', usuario.name, usuario.email)
    }

    const data = await request.json()
    console.log('📥 Datos recibidos en POST /api/crm/oportunidades:', data)

    const {
      clienteId,
      nombre,
      descripcion,
      valorEstimado,
      probabilidad,
      fechaCierreEstimada,
      fuente,
      prioridad,
      responsableId,
      notas,
      competencia
    } = data

    console.log('📋 Campos extraídos:', { clienteId, nombre, descripcion, valorEstimado, probabilidad, fechaCierreEstimada, fuente, prioridad, responsableId, notas, competencia })

    // ✅ Validaciones
    if (!clienteId?.trim() || !nombre?.trim()) {
      console.log('❌ Validación fallida: clienteId o nombre faltantes/vacíos', {
        clienteId: clienteId,
        nombre: nombre,
        clienteIdTrim: clienteId?.trim(),
        nombreTrim: nombre?.trim()
      })
      return NextResponse.json(
        { error: 'Cliente y nombre son obligatorios' },
        { status: 400 }
      )
    }

    // ✅ Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Verificar que el responsable existe (si se proporciona)
    if (responsableId) {
      const responsable = await prisma.user.findUnique({
        where: { id: responsableId }
      })

      if (!responsable) {
        return NextResponse.json(
          { error: 'Responsable no encontrado' },
          { status: 404 }
        )
      }
    }

    // ✅ Crear oportunidad completa
    console.log('🔄 Intentando crear oportunidad con datos:', {
      clienteId,
      nombre,
      descripcion,
      valorEstimado,
      probabilidad,
      fechaCierreEstimada,
      fuente,
      prioridad,
      comercialId: usuario.id,
      responsableId: responsableId || usuario.id,
      notas,
      competencia
    })

    const nuevaOportunidad = await prisma.crmOportunidad.create({
      data: {
        id: `crm-opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clienteId,
        nombre,
        descripcion: descripcion || null,
        valorEstimado: valorEstimado || null,
        probabilidad: probabilidad || 0,
        fechaCierreEstimada: fechaCierreEstimada ? new Date(fechaCierreEstimada) : null,
        fuente: fuente || null,
        prioridad: prioridad || 'media',
        comercialId: usuario.id,
        responsableId: responsableId || usuario.id,
        notas: notas || null,
        competencia: competencia || null,
        updatedAt: new Date()
      }
    })

    console.log('✅ Oportunidad creada exitosamente:', nuevaOportunidad.id)

    // ✅ Retornar datos básicos sin include
    const oportunidadCompleta = {
      ...nuevaOportunidad,
      cliente: null,
      comercial: null,
      responsable: null
    }

    // ✅ Registrar en auditoría (simplificado)
    try {
      await registrarCreacion(
        'OPORTUNIDAD',
        nuevaOportunidad.id,
        usuario.id,
        nuevaOportunidad.nombre,
        {
          clienteId: nuevaOportunidad.clienteId,
          valorEstimado: nuevaOportunidad.valorEstimado,
          prioridad: nuevaOportunidad.prioridad,
          fuente: nuevaOportunidad.fuente
        }
      )
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
      // No fallar la creación por error de auditoría
    }

    return NextResponse.json(oportunidadCompleta, { status: 201 })

  } catch (error: any) {
    console.error('❌ Error al crear oportunidad:', error)

    // ✅ Manejar errores específicos de Prisma
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Los datos de relación (cliente o responsable) no son válidos' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
