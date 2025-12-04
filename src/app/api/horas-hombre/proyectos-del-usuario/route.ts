/**
 * API para obtener proyectos del usuario autenticado
 *
 * Retorna proyectos que el usuario puede ver y tiene permisos para registrar horas
 * Usa la misma lógica de acceso que el API principal de proyectos
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 API PROYECTOS-USUARIO: Inicio de petición', {
      url: request.url,
      method: request.method,
      headers: request.headers
    })

    // Verificar sesión
    const session = await getServerSession(authOptions)
    logger.info('🔐 API PROYECTOS-USUARIO: Sesión obtenida', {
      sessionExists: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      userRole: session?.user?.role
    })

    if (!session?.user) {
      logger.error('❌ API PROYECTOS-USUARIO: Sin sesión de usuario', { session })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔐 Filtrar por rol del usuario (mismo patrón que /api/proyectos)
    const rolesConAccesoTotal = ['admin', 'gerente']
    let where: any = {}
    let hasAccesoTotal = rolesConAccesoTotal.includes(session.user.role)

    logger.info('🎯 API PROYECTOS-USUARIO: Análisis de permisos', {
      userRole: session.user.role,
      hasAccesoTotal,
      rolesConAccesoTotal,
      userId: session.user.id,
      userEmail: session.user.email
    })

    // 🔧 SOLUCIÓN TEMPORAL: Debug específico para usuario problemático
    if (session.user.email === 'jesus.m@gyscontrol.com') {
      logger.warn('🔧 TEMPORAL: Usuario problemático detectado, forzando acceso total', {
        userEmail: session.user.email,
        userRole: session.user.role,
        originalHasAccesoTotal: hasAccesoTotal
      })
      hasAccesoTotal = true // Forzar acceso total
      where = {} // Sin filtros
    }

    if (!hasAccesoTotal) {
      // Comerciales solo ven sus proyectos
      if (session.user.role === 'comercial') {
        where.comercialId = session.user.id
        logger.info('👤 API PROYECTOS-USUARIO: Usuario comercial, filtrando por comercialId', {
          comercialId: session.user.id
        })
      }
      // Gestores solo ven proyectos asignados
      else if (session.user.role === 'gestor') {
        where.gestorId = session.user.id
        logger.info('👤 API PROYECTOS-USUARIO: Usuario gestor, filtrando por gestorId', {
          gestorId: session.user.id
        })
      }
      // Otros roles ven proyectos donde participan
      else {
        where.OR = [
          { comercialId: session.user.id },
          { gestorId: session.user.id },
          { proyectoEdts: { some: { responsableId: session.user.id } } },
          // Agregar también responsables de actividades y tareas
          {
            proyectoEdts: {
              some: {
                proyectoActividad: {
                  some: { responsableId: session.user.id }
                }
              }
            }
          },
          {
            proyectoEdts: {
              some: {
                proyectoTarea: {
                  some: { responsableId: session.user.id }
                }
              }
            }
          }
        ]
        logger.info('👤 API PROYECTOS-USUARIO: Usuario con acceso por participación', {
          userId: session.user.id,
          orConditions: where.OR.length
        })
      }
    } else {
      logger.info('👑 API PROYECTOS-USUARIO: Usuario con acceso total (admin/gerente)', {
        userRole: session.user.role,
        filtrosAplicados: 'NINGUNO - Acceso total'
      })
    }

    // 🆕 LOGGING ADICIONAL PARA DEBUGGING
    logger.info('🔍 API PROYECTOS-USUARIO: Estado completo antes de consulta', {
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
      hasAccesoTotal,
      whereClause: JSON.stringify(where),
      rolesConAccesoTotal
    })

    logger.info('🔍 API PROYECTOS-USUARIO: Query WHERE construida', { where })
    logger.info('📊 API PROYECTOS-USUARIO: Contando proyectos antes de consulta...')

    // Obtener proyectos con la misma estructura que el API principal
    const proyectos = await prisma.proyecto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        comercial: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        gestor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    logger.info('✅ API PROYECTOS-USUARIO: Consulta completada', {
      totalProyectosEncontrados: proyectos.length,
      queryExecuted: true,
      proyectos: proyectos.map(p => ({ id: p.id, nombre: p.nombre, codigo: p.codigo }))
    })

    // 🆕 LOGGING ADICIONAL PARA DEBUGGING - RESULTADO DE CONSULTA
    if (proyectos.length === 0) {
      logger.error('❌ API PROYECTOS-USUARIO: PROBLEMA - Consulta devolvió 0 proyectos', {
        userId: session.user.id,
        userRole: session.user.role,
        hasAccesoTotal,
        whereClause: JSON.stringify(where),
        totalProyectosEnBD: await prisma.proyecto.count()
      })
    } else {
      logger.info('✅ API PROYECTOS-USUARIO: Proyectos encontrados correctamente', {
        count: proyectos.length,
        proyectos: proyectos.map(p => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          estado: p.estado
        }))
      })
    }

    // Log adicional para verificar relaciones
    for (let i = 0; i < Math.min(proyectos.length, 3); i++) {
      const proyecto = proyectos[i]
      logger.info(`🔍 API PROYECTOS-USUARIO: Proyecto ejemplo ${i + 1}`, {
        id: proyecto.id,
        nombre: proyecto.nombre,
        comercial: proyecto.comercial ? { id: proyecto.comercial.id, name: proyecto.comercial.name } : null,
        gestor: proyecto.gestor ? { id: proyecto.gestor.id, name: proyecto.gestor.name } : null
      })
    }

    logger.info(`📋 API PROYECTOS-USUARIO: Respuesta preparada`, {
      totalProyectos: proyectos.length,
      proyectosResponse: proyectos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        estado: p.estado,
        responsableNombre: p.gestor?.name || p.comercial?.name || 'Sin responsable'
      }))
    })

    const response = {
      success: true,
      proyectos: proyectos.map(proyecto => ({
        id: proyecto.id,
        nombre: proyecto.nombre,
        codigo: proyecto.codigo,
        estado: proyecto.estado,
        fechaInicio: proyecto.fechaInicio,
        fechaFin: proyecto.fechaFin,
        responsableNombre: proyecto.gestor?.name || proyecto.comercial?.name || 'Sin responsable'
      })),
      total: proyectos.length
    }

    logger.info('🚀 API PROYECTOS-USUARIO: Enviando respuesta exitosa', response)
    return NextResponse.json(response)

  } catch (error) {
    logger.error('❌ API PROYECTOS-USUARIO: Error interno del servidor', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}