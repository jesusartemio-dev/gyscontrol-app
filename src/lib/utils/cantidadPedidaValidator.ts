// ===================================================
// 📁 Archivo: cantidadPedidaValidator.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Utilidades para validar y sincronizar cantidadPedida
// 📌 Características: Previene valores negativos y mantiene consistencia
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { prisma } from '@/lib/prisma'

/**
 * ✅ Recalcula cantidadPedida para un ListaEquipoItem específico
 * basándose en la suma real de sus pedidos asociados
 */
export async function recalcularCantidadPedida(listaEquipoItemId: string): Promise<number> {
  try {
    // 📡 Obtener todos los pedidos asociados al item
    const pedidos = await prisma.pedidoEquipoItem.findMany({
      where: {
        listaEquipoItemId: listaEquipoItemId
      },
      select: {
        cantidadPedida: true
      }
    })

    // ✅ Calcular la suma real
    const cantidadPedidaReal = pedidos.reduce((total, pedido) => {
      return total + (pedido.cantidadPedida || 0)
    }, 0)

    // 🔄 Actualizar el valor en la base de datos
    await prisma.listaEquipoItem.update({
      where: { id: listaEquipoItemId },
      data: {
        cantidadPedida: cantidadPedidaReal
      }
    })

    return cantidadPedidaReal
  } catch (error) {
    console.error('❌ Error al recalcular cantidadPedida:', error)
    throw new Error(`Error al recalcular cantidadPedida para item ${listaEquipoItemId}: ${error}`)
  }
}

/**
 * 🔍 Valida que la cantidadPedida no sea negativa antes de una operación
 */
export async function validarCantidadPedidaNoNegativa(
  listaEquipoItemId: string,
  cantidadADecrementar: number
): Promise<{ esValida: boolean; cantidadActual: number; cantidadResultante: number }> {
  try {
    // 📡 Obtener el item actual
    const item = await prisma.listaEquipoItem.findUnique({
      where: { id: listaEquipoItemId },
      select: {
        cantidadPedida: true,
        cantidad: true
      }
    })

    if (!item) {
      throw new Error(`ListaEquipoItem con ID ${listaEquipoItemId} no encontrado`)
    }

    const cantidadActual = item.cantidadPedida || 0
    const cantidadResultante = cantidadActual - cantidadADecrementar
    const esValida = cantidadResultante >= 0

    return {
      esValida,
      cantidadActual,
      cantidadResultante
    }
  } catch (error) {
    console.error('❌ Error al validar cantidadPedida:', error)
    throw error
  }
}

/**
 * 🔄 Sincroniza cantidadPedida de forma segura con validación
 */
export async function sincronizarCantidadPedida(
  listaEquipoItemId: string,
  operacion: 'increment' | 'decrement',
  cantidad: number
): Promise<{ exito: boolean; cantidadFinal: number; mensaje?: string }> {
  try {
    if (cantidad <= 0) {
      return {
        exito: false,
        cantidadFinal: 0,
        mensaje: 'La cantidad debe ser mayor a 0'
      }
    }

    // 🔍 Si es decremento, validar que no resulte en negativo
    if (operacion === 'decrement') {
      const validacion = await validarCantidadPedidaNoNegativa(listaEquipoItemId, cantidad)
      
      if (!validacion.esValida) {
        return {
          exito: false,
          cantidadFinal: validacion.cantidadActual,
          mensaje: `La operación resultaría en cantidad negativa. Actual: ${validacion.cantidadActual}, Intentando decrementar: ${cantidad}`
        }
      }
    }

    // ✅ Realizar la operación
    const itemActualizado = await prisma.listaEquipoItem.update({
      where: { id: listaEquipoItemId },
      data: {
        cantidadPedida: {
          [operacion]: cantidad
        }
      },
      select: {
        cantidadPedida: true
      }
    })

    return {
      exito: true,
      cantidadFinal: itemActualizado.cantidadPedida || 0
    }
  } catch (error) {
    console.error('❌ Error al sincronizar cantidadPedida:', error)
    return {
      exito: false,
      cantidadFinal: 0,
      mensaje: `Error interno: ${error}`
    }
  }
}

/**
 * 📊 Obtiene estadísticas de consistencia de cantidadPedida
 */
export async function obtenerEstadisticasConsistencia(): Promise<{
  totalItems: number
  itemsConsistentes: number
  itemsInconsistentes: number
  itemsNegativos: number
  porcentajeConsistencia: number
}> {
  try {
    // 📡 Obtener todos los items con sus pedidos
    const items = await prisma.listaEquipoItem.findMany({
      include: {
        pedidos: {
          select: {
            cantidadPedida: true
          }
        }
      }
    })

    let itemsConsistentes = 0
    let itemsNegativos = 0

    // 🔁 Verificar consistencia de cada item
    for (const item of items) {
      const cantidadPedidaReal = item.pedidos.reduce((total, pedido) => {
        return total + (pedido.cantidadPedida || 0)
      }, 0)

      if (item.cantidadPedida === cantidadPedidaReal) {
        itemsConsistentes++
      }

      if ((item.cantidadPedida || 0) < 0) {
        itemsNegativos++
      }
    }

    const totalItems = items.length
    const itemsInconsistentes = totalItems - itemsConsistentes
    const porcentajeConsistencia = totalItems > 0 ? (itemsConsistentes / totalItems) * 100 : 100

    return {
      totalItems,
      itemsConsistentes,
      itemsInconsistentes,
      itemsNegativos,
      porcentajeConsistencia
    }
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error)
    throw error
  }
}

/**
 * 🔧 Función de reparación automática para items con inconsistencias
 */
export async function repararInconsistencias(): Promise<{
  itemsReparados: number
  errores: string[]
}> {
  try {
    const items = await prisma.listaEquipoItem.findMany({
      include: {
        pedidos: {
          select: {
            cantidadPedida: true
          }
        }
      }
    })

    let itemsReparados = 0
    const errores: string[] = []

    for (const item of items) {
      try {
        const cantidadPedidaReal = item.pedidos.reduce((total, pedido) => {
          return total + (pedido.cantidadPedida || 0)
        }, 0)

        if (item.cantidadPedida !== cantidadPedidaReal) {
          await prisma.listaEquipoItem.update({
            where: { id: item.id },
            data: {
              cantidadPedida: cantidadPedidaReal
            }
          })
          itemsReparados++
        }
      } catch (error) {
        errores.push(`Error reparando item ${item.id}: ${error}`)
      }
    }

    return {
      itemsReparados,
      errores
    }
  } catch (error) {
    console.error('❌ Error durante reparación:', error)
    throw error
  }
}