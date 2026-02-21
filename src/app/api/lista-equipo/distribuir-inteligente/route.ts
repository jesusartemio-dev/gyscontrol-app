// ===================================================
// 📁 Archivo: distribuir-inteligente/route.ts
// 📌 Ubicación: src/app/api/lista-equipo/distribuir-inteligente/route.ts
// 🔧 Descripción: API para distribución inteligente automática basada en categorías
//
// 🧠 Uso: Endpoint que aplica sugerencias inteligentes de distribución
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface SugerenciaInteligentePayload {
  proyectoId: string
  proyectoEquipoId: string
  sugerencias: Array<{
    nombre: string
    descripcion: string
    itemsIds: string[]
    categoriaPrincipal: string
  }>
}

export async function POST(req: Request) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const payload: SugerenciaInteligentePayload = await req.json()
    const { proyectoId, proyectoEquipoId, sugerencias } = payload

    // ✅ Validar parámetros
    if (!proyectoId || !proyectoEquipoId || !sugerencias || sugerencias.length === 0) {
      return NextResponse.json(
        { error: 'Parámetros incompletos: proyectoId, proyectoEquipoId y sugerencias son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el ProyectoEquipo existe y pertenece al proyecto
    const proyectoEquipo = await prisma.proyectoEquipoCotizado.findFirst({
      where: {
        id: proyectoEquipoId,
        proyectoId: proyectoId
      },
      include: {
        proyecto: true,
        proyectoEquipoCotizadoItem: true
      }
    })

    if (!proyectoEquipo) {
      return NextResponse.json(
        { error: 'ProyectoEquipo no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Validar que todas las sugerencias tengan items válidos
    const todosLosItemsIds = sugerencias.flatMap(s => s.itemsIds)
    const itemsUnicos = new Set(todosLosItemsIds)

    if (itemsUnicos.size !== todosLosItemsIds.length) {
      return NextResponse.json(
        { error: 'Hay items duplicados en las sugerencias' },
        { status: 400 }
      )
    }

    // Verificar que todos los items existen y pertenecen al ProyectoEquipo
    const proyectoEquipoItems = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: {
        id: { in: Array.from(itemsUnicos) },
        proyectoEquipoId: proyectoEquipoId
      }
    })

    if (proyectoEquipoItems.length !== itemsUnicos.size) {
      return NextResponse.json(
        { error: 'Algunos items no existen o no pertenecen al ProyectoEquipo' },
        { status: 400 }
      )
    }

    // ✅ Verificar que los items NO estén ya en listas activas (evitar duplicados)
    const itemsYaEnListas = proyectoEquipoItems.filter(item =>
      item.estado === 'en_lista' && item.listaId !== null
    )
    if (itemsYaEnListas.length > 0) {
      return NextResponse.json(
        {
          error: `Los siguientes items ya están asignados a listas activas: ${itemsYaEnListas.map(item => item.descripcion || 'Sin descripción').join(', ')}`
        },
        { status: 400 }
      )
    }

    // ✅ Verificar que los items no estén asignados a otras listas (pero permitir múltiples listas)
    const itemsEnOtrasListas = proyectoEquipoItems.filter(item =>
      item.estado === 'pendiente' && item.listaId !== null
    )
    if (itemsEnOtrasListas.length > 0) {
      // Esto es válido - los items pueden estar en múltiples listas
      console.log(`Items en múltiples listas: ${itemsEnOtrasListas.length}`)
    }

    // ✅ Crear mapa de items para acceso rápido
    const itemsMap = new Map(proyectoEquipoItems.map(item => [item.id, item]))

    // ✅ Procesar todas las sugerencias en una transacción
    const listasCreadas: any[] = []

    await prisma.$transaction(async (tx) => {
      for (const [index, sugerencia] of sugerencias.entries()) {
        // Obtener el número de secuencia para este proyecto
        const ultimoNumero = await tx.listaEquipo.findFirst({
          where: { proyectoId },
          orderBy: { numeroSecuencia: 'desc' },
          select: { numeroSecuencia: true }
        })

        const numeroSecuencia = (ultimoNumero?.numeroSecuencia || 0) + 1

        // Generar código siguiendo el patrón estándar: {codigoProyecto}-LST-{correlativo}
        const codigo = `${proyectoEquipo.proyecto.codigo}-LST-${String(numeroSecuencia).padStart(3, '0')}`

        // Crear la ListaEquipo
        const lista = await tx.listaEquipo.create({
          data: {
            id: `lista-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            codigo,
            nombre: sugerencia.nombre,
            estado: 'borrador',
            numeroSecuencia,
            proyectoId,
            responsableId: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Crear los ListaEquipoItem desde los ProyectoEquipoItem seleccionados
        for (const [itemIndex, itemId] of sugerencia.itemsIds.entries()) {
          const proyectoItem = itemsMap.get(itemId)
          if (!proyectoItem) continue

          await tx.listaEquipoItem.create({
            data: {
              id: `lista-item-${Date.now()}-${itemIndex}-${Math.random().toString(36).substr(2, 9)}`,
              listaId: lista.id,
              proyectoEquipoItemId: proyectoItem.id,
              codigo: proyectoItem.codigo, // ✅ Usar código original del catálogo
              descripcion: proyectoItem.descripcion,
              marca: proyectoItem.marca || '', // ✅ Copiar marca
              categoria: proyectoItem.categoria || '', // ✅ Copiar categoria
              unidad: proyectoItem.unidad || 'UND',
              cantidad: proyectoItem.cantidad,
              cantidadPedida: 0,
              presupuesto: proyectoItem.precioCliente || 0, // ✅ Copiar presupuesto
              catalogoEquipoId: proyectoItem.catalogoEquipoId ?? null,
              estado: 'borrador',
              origen: 'cotizado' as const,
              responsableId: session.user.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }

        // Asociar los ProyectoEquipoItem a la lista
        await tx.proyectoEquipoCotizadoItem.updateMany({
          where: {
            id: { in: sugerencia.itemsIds }
          },
          data: {
            listaId: lista.id
          }
        })

        listasCreadas.push({
          ...lista,
          itemsCount: sugerencia.itemsIds.length,
          categoriaPrincipal: sugerencia.categoriaPrincipal
        })
      }
    })

    // ✅ Retornar las listas creadas con estadísticas
    const estadisticas = {
      totalListas: listasCreadas.length,
      totalItems: todosLosItemsIds.length,
      categoriasProcesadas: [...new Set(sugerencias.map(s => s.categoriaPrincipal))],
      listasCreadas: listasCreadas.map(lista => ({
        id: lista.id,
        nombre: lista.nombre,
        codigo: lista.codigo,
        itemsCount: lista.itemsCount,
        categoriaPrincipal: lista.categoriaPrincipal
      }))
    }

    return NextResponse.json({
      ...estadisticas,
      message: `✅ Distribución inteligente completada: ${listasCreadas.length} lista(s) creada(s) con ${todosLosItemsIds.length} items`
    })

  } catch (error) {
    console.error('Error en distribución inteligente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la distribución inteligente' },
      { status: 500 }
    )
  }
}

// 📊 Endpoint GET para obtener análisis inteligente de un ProyectoEquipo
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const proyectoEquipoId = searchParams.get('proyectoEquipoId')
    const proyectoId = searchParams.get('proyectoId')

    if (!proyectoEquipoId || !proyectoId) {
      return NextResponse.json(
        { error: 'Parámetros proyectoEquipoId y proyectoId son requeridos' },
        { status: 400 }
      )
    }

    // Obtener el ProyectoEquipo con sus items
    const proyectoEquipo = await prisma.proyectoEquipoCotizado.findFirst({
      where: {
        id: proyectoEquipoId,
        proyectoId: proyectoId
      },
      include: {
        proyectoEquipoCotizadoItem: {
          where: {
            OR: [
              { estado: 'pendiente' },
              { listaId: null }
            ]
          }
        },
        proyecto: true,
        user: true
      }
    })

    if (!proyectoEquipo) {
      return NextResponse.json(
        { error: 'ProyectoEquipo no encontrado' },
        { status: 404 }
      )
    }

    // Usar el servicio de análisis inteligente
    const { analizarProyectoEquipo } = await import('@/lib/services/analisisInteligente')

    // Convertir tipos para compatibilidad (null -> undefined)
    const proyectoEquipoCompatible = {
      ...proyectoEquipo,
      items: proyectoEquipo.proyectoEquipoCotizadoItem,
      descripcion: proyectoEquipo.descripcion || undefined,
      proyecto: {
        ...proyectoEquipo.proyecto,
        fechaFin: (proyectoEquipo.proyecto as any).fechaFin || undefined
      }
    }

    const analisis = await analizarProyectoEquipo(proyectoEquipoCompatible as any)

    return NextResponse.json({
      proyectoEquipo: {
        id: proyectoEquipo.id,
        nombre: proyectoEquipo.nombre,
        totalItems: proyectoEquipo.proyectoEquipoCotizadoItem.length
      },
      analisis
    })

  } catch (error) {
    console.error('Error obteniendo análisis inteligente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
