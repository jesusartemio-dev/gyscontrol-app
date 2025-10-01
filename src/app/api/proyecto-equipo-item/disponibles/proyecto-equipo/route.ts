// ===================================================
// 📁 Archivo: [proyectoEquipoId]/route.ts
// 📌 Ubicación: src/app/api/proyecto-equipo-item/disponibles/[proyectoEquipoId]/route.ts
// 🔧 Descripción: API para obtener items disponibles de un ProyectoEquipo
//
// 🧠 Uso: Endpoint para obtener TODOS los items de un ProyectoEquipo para análisis inteligente (permite múltiples listas)
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, context: { params: Promise<{ proyectoEquipoId: string }> }) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { proyectoEquipoId } = await context.params

    console.log('🔍 Endpoint items disponibles llamado para ProyectoEquipoId:', proyectoEquipoId)

    // ✅ Validar parámetros
    if (!proyectoEquipoId) {
      return NextResponse.json(
        { error: 'ProyectoEquipoId es requerido' },
        { status: 400 }
      )
    }

    // ✅ Verificar que el ProyectoEquipo existe
    const proyectoEquipo = await prisma.proyectoEquipoCotizado.findUnique({
      where: { id: proyectoEquipoId },
      select: { id: true, proyectoId: true }
    })

    if (!proyectoEquipo) {
      return NextResponse.json(
        { error: 'ProyectoEquipo no encontrado' },
        { status: 404 }
      )
    }

    // 🔍 Debug: Primero obtener TODOS los items para ver qué estados tienen
    console.log('🔍 Ejecutando consulta Prisma para TODOS los items...')

    const todosLosItems = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: {
        proyectoEquipoId: proyectoEquipoId
      },
      select: {
        id: true,
        descripcion: true,
        estado: true,
        listaId: true,
        cantidad: true,
        proyectoEquipoId: true,
        createdAt: true
      }
    })

    console.log('🔍 Resultado de consulta Prisma - TODOS los items:', {
      consultaWhere: { proyectoEquipoId },
      resultadoLength: todosLosItems.length,
      rawResult: todosLosItems
    })

    console.log('🔍 TODOS los items del ProyectoEquipo:', {
      proyectoEquipoId,
      totalItems: todosLosItems.length,
      estados: todosLosItems.reduce((acc, item) => {
        acc[item.estado || 'sin-estado'] = (acc[item.estado || 'sin-estado'] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      listaIds: todosLosItems.reduce((acc, item) => {
        const listaId = item.listaId || 'sin-lista'
        acc[listaId] = (acc[listaId] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      primerosItems: todosLosItems.slice(0, 5).map(item => ({
        id: item.id,
        descripcion: item.descripcion?.substring(0, 30),
        estado: item.estado,
        listaId: item.listaId
      }))
    })

    // 🎯 NUEVA LÓGICA: Permitir TODOS los items del ProyectoEquipo para múltiples listas
    // Esto permite crear tantas listas como sea necesario con los mismos items
    console.log('🎯 Ejecutando consulta Prisma para items DISPONIBLES...')
    console.log('🎯 Parámetros de consulta:', { proyectoEquipoId, type: typeof proyectoEquipoId })

    const itemsDisponibles = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: {
        proyectoEquipoId: proyectoEquipoId
        // ✅ Sin filtro de estado - permitir todos los items para múltiples listas
      },
      include: {
        catalogoEquipo: {
          select: {
            categoria: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log('🎯 Resultado de consulta Prisma - Items DISPONIBLES:', {
      consultaWhere: { proyectoEquipoId },
      resultadoLength: itemsDisponibles.length,
      rawResult: itemsDisponibles,
      sqlQuery: `SELECT * FROM ProyectoEquipoItem WHERE proyectoEquipoId = '${proyectoEquipoId}'`
    })

    // 🔍 Debug adicional: Verificar si hay algún problema con la consulta
    if (itemsDisponibles.length === 0) {
      console.log('⚠️ ADVERTENCIA: La consulta no encontró items. Verificando existencia del ProyectoEquipo...')

      // Verificar si el ProyectoEquipo existe y tiene items
      const proyectoEquipoConItems = await prisma.proyectoEquipoCotizado.findUnique({
        where: { id: proyectoEquipoId },
        include: {
          items: {
            select: {
              id: true,
              descripcion: true,
              estado: true,
              proyectoEquipoId: true
            }
          }
        }
      })

      console.log('🔍 Verificación del ProyectoEquipo:', {
        proyectoEquipoEncontrado: !!proyectoEquipoConItems,
        itemsEnProyectoEquipo: proyectoEquipoConItems?.items?.length || 0,
        itemsDetalle: proyectoEquipoConItems?.items || []
      })
    }

    console.log('🎯 Usando TODOS los items del ProyectoEquipo para análisis inteligente:', {
      totalItemsDisponibles: itemsDisponibles.length,
      mensaje: 'Ahora se permiten múltiples listas con los mismos items'
    })

    // 🔍 Debug: Mostrar información detallada de items disponibles
    console.log('📊 Endpoint items disponibles - Resultado:', {
      proyectoEquipoId,
      totalItems: itemsDisponibles.length,
      estados: itemsDisponibles.reduce((acc, item) => {
        acc[item.estado || 'sin-estado'] = (acc[item.estado || 'sin-estado'] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      listaIds: itemsDisponibles.reduce((acc, item) => {
        const listaId = item.listaId || 'sin-lista'
        acc[listaId] = (acc[listaId] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      primerosItems: itemsDisponibles.slice(0, 3).map(item => ({
        id: item.id,
        descripcion: item.descripcion?.substring(0, 50),
        estado: item.estado,
        listaId: item.listaId
      }))
    })

    // ✅ Si no hay items pendientes, devolver array vacío (no fallback)
    // Esto asegura que el análisis inteligente sepa que no hay items disponibles

    return NextResponse.json(itemsDisponibles)

  } catch (error) {
    console.error('Error obteniendo items disponibles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
