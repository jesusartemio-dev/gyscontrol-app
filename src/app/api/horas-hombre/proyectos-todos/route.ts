/**
 * API para obtener TODOS los proyectos para registro de horas-hombre
 * 
 * SOLUCIÓN DEFINITIVA para el problema del dropdown vacío
 * - Devuelve TODOS los proyectos sin filtrar por rol de usuario
 * - Permite que cualquier usuario registre horas en cualquier proyecto
 * - Autenticación completa con authOptions (igual que la API general)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // ✅ Autenticación completa con authOptions (igual que API general)
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('🚀 API HORAS-HOMBRE: Cargando TODOS los proyectos para usuario:', session.user.id)

    // 🚀 OBTENER TODOS LOS PROYECTOS SIN RESTRICCIONES DE ROL
    const todosLosProyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        createdAt: true,
        cliente: {
          select: {
            nombre: true
          }
        },
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
        createdAt: 'desc'
      }
    })

    console.log('📊 API HORAS-HOMBRE: Proyectos encontrados:', todosLosProyectos.length)

    // ✅ FORMATEAR PARA EL COMPONENTE
    const proyectosFormateados = todosLosProyectos.map(proyecto => ({
      id: proyecto.id,
      nombre: proyecto.nombre,
      codigo: proyecto.codigo,
      estado: proyecto.estado,
      clienteNombre: proyecto.cliente?.nombre || 'Sin cliente',
      responsableNombre: proyecto.comercial?.name || proyecto.gestor?.name || 'Sin responsable',
      responsableId: proyecto.comercial?.id || proyecto.gestor?.id || null,
      fechaInicio: proyecto.fechaInicio,
      fechaFin: proyecto.fechaFin,
      createdAt: proyecto.createdAt
    }))

    console.log('✅ API HORAS-HOMBRE: Proyectos formateados:', proyectosFormateados.length)

    // 🎯 RESPUESTA EXITOSA
    return NextResponse.json({
      success: true,
      message: 'Proyectos obtenidos para registro de horas-hombre',
      proyectos: proyectosFormateados,
      total: proyectosFormateados.length,
      timestamp: new Date().toISOString(),
      nota: 'API para registro de horas - Acceso a todos los proyectos'
    })

  } catch (error) {
    console.error('❌ API HORAS-HOMBRE: Error cargando proyectos:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        detalle: 'No se pudieron cargar los proyectos',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}