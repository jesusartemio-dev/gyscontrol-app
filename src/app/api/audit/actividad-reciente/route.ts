// ===================================================
// 📊 API DE ACTIVIDAD RECIENTE
// ===================================================
// GET /api/audit/actividad-reciente
// Obtiene la actividad reciente de todo el sistema con filtros y paginación
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ===================================================
// 📡 GET - Obtener actividad reciente
// ===================================================

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const limite = parseInt(searchParams.get('limite') || '20')
    const pagina = parseInt(searchParams.get('pagina') || '1')
    const usuarioId = searchParams.get('usuarioId') || undefined
    const entidadTipo = searchParams.get('entidadTipo') || undefined
    const accion = searchParams.get('accion') || undefined
    const busqueda = searchParams.get('busqueda') || undefined
    const fechaDesde = searchParams.get('fechaDesde') || undefined
    const fechaHasta = searchParams.get('fechaHasta') || undefined

    // Validar límite y página
    const limiteValidado = Math.min(Math.max(limite, 1), 100)
    const paginaValidada = Math.max(pagina, 1)
    const skip = (paginaValidada - 1) * limiteValidado

    // Construir filtros dinámicos
    const where: any = {}

    if (usuarioId) {
      where.usuarioId = usuarioId
    }

    if (entidadTipo && entidadTipo !== 'all') {
      where.entidadTipo = entidadTipo
    }

    if (accion && accion !== 'all') {
      where.accion = accion
    }

    if (busqueda) {
      where.descripcion = {
        contains: busqueda,
        mode: 'insensitive'
      }
    }

    if (fechaDesde || fechaHasta) {
      where.createdAt = {}
      if (fechaDesde) {
        where.createdAt.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        // Agregar un día para incluir todo el día final
        const fechaFin = new Date(fechaHasta)
        fechaFin.setDate(fechaFin.getDate() + 1)
        where.createdAt.lte = fechaFin
      }
    }

    // Obtener total para paginación
    const total = await prisma.auditLog.count({ where })

    // Obtener actividad con filtros y paginación
    const rawActividad = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limiteValidado
    })

    // Mapear para compatibilidad con frontend
    const actividad = rawActividad.map((log: any) => ({
      ...log,
      usuario: log.user
    }))

    // Obtener lista de usuarios únicos para filtros
    const usuarios = await prisma.auditLog.findMany({
      select: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      distinct: ['usuarioId']
    })

    // Obtener tipos de entidad únicos
    const entidades = await prisma.auditLog.findMany({
      select: {
        entidadTipo: true
      },
      distinct: ['entidadTipo']
    })

    // Obtener acciones únicas
    const acciones = await prisma.auditLog.findMany({
      select: {
        accion: true
      },
      distinct: ['accion']
    })

    const totalPaginas = Math.ceil(total / limiteValidado)

    return NextResponse.json({
      data: actividad,
      meta: {
        pagina: paginaValidada,
        limite: limiteValidado,
        total,
        totalPaginas
      },
      filtros: {
        usuarios: usuarios.map(u => u.user).filter(Boolean),
        entidades: entidades.map(e => e.entidadTipo),
        acciones: acciones.map(a => a.accion)
      }
    })

  } catch (error: any) {
    console.error('❌ Error en GET /api/audit/actividad-reciente:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
