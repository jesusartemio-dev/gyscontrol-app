// ===================================================
// 📁 Archivo: recalcular-cantidades-pedidas.js
// 📌 Descripción: Script para recalcular cantidadPedida basado en pedidos reales
// 📌 Características: Sincroniza cantidadPedida con la suma real de pedidos
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * ✅ Recalcula cantidadPedida para todos los ListaEquipoItem
 * basándose en la suma real de pedidos asociados
 */
async function recalcularCantidadesPedidas() {
  try {
    console.log('🔄 Iniciando recálculo de cantidades pedidas...')
    
    // 📡 Obtener todos los ListaEquipoItem con sus pedidos
    const items = await prisma.listaEquipoItem.findMany({
      include: {
        pedidos: {
          select: {
            cantidadPedida: true
          }
        },
        lista: {
          select: {
            nombre: true
          }
        },
        catalogoEquipo: {
          select: {
            codigo: true,
            descripcion: true
          }
        }
      }
    })

    console.log(`📊 Procesando ${items.length} items de listas de equipos...`)

    let itemsCorregidos = 0
    let inconsistenciasEncontradas = []

    // 🔁 Procesar cada item
    for (const item of items) {
      // ✅ Calcular cantidadPedida real basada en pedidos
      const cantidadPedidaReal = item.pedidos.reduce((total, pedido) => {
        return total + (pedido.cantidadPedida || 0)
      }, 0)

      // 🔍 Verificar si hay inconsistencia
      if (item.cantidadPedida !== cantidadPedidaReal) {
        inconsistenciasEncontradas.push({
          id: item.id,
          lista: item.lista?.nombre || 'N/A',
          equipo: `${item.catalogoEquipo?.codigo || item.codigo || 'N/A'} - ${item.catalogoEquipo?.descripcion || item.descripcion || 'N/A'}`,
          cantidadActual: item.cantidadPedida,
          cantidadReal: cantidadPedidaReal,
          diferencia: item.cantidadPedida - cantidadPedidaReal
        })

        // ✅ Actualizar con el valor correcto
        await prisma.listaEquipoItem.update({
          where: { id: item.id },
          data: {
            cantidadPedida: cantidadPedidaReal
          }
        })

        itemsCorregidos++
      }
    }

    // 📋 Mostrar resultados
    console.log(`\n📊 Resumen del recálculo:`)
    console.log(`   • Items procesados: ${items.length}`)
    console.log(`   • Items corregidos: ${itemsCorregidos}`)
    console.log(`   • Inconsistencias encontradas: ${inconsistenciasEncontradas.length}`)

    if (inconsistenciasEncontradas.length > 0) {
      console.log(`\n📋 Detalles de inconsistencias corregidas:`)
      inconsistenciasEncontradas.forEach((item, index) => {
        console.log(`${index + 1}. Lista: ${item.lista}`)
        console.log(`   Equipo: ${item.equipo}`)
        console.log(`   Cantidad anterior: ${item.cantidadActual}`)
        console.log(`   Cantidad corregida: ${item.cantidadReal}`)
        console.log(`   Diferencia: ${item.diferencia}`)
        console.log('   ---')
      })
    }

    // ✅ Verificación final
    const itemsNegativos = await prisma.listaEquipoItem.count({
      where: {
        cantidadPedida: {
          lt: 0
        }
      }
    })

    console.log(`\n🔍 Verificación final: ${itemsNegativos} items con cantidadPedida negativa`)
    
    if (itemsNegativos === 0) {
      console.log('✅ ¡Todas las cantidades están correctas!')
    } else {
      console.log('⚠️  Aún hay valores negativos que requieren investigación adicional')
    }

    console.log('🎉 Recálculo completado exitosamente')

  } catch (error) {
    console.error('❌ Error durante el recálculo:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 🔍 Función para auditar inconsistencias sin corregir
 */
async function auditarInconsistencias() {
  try {
    console.log('🔍 Auditando inconsistencias en cantidadPedida...')
    
    const items = await prisma.listaEquipoItem.findMany({
      include: {
        pedidos: {
          select: {
            cantidadPedida: true
          }
        },
        lista: {
          select: {
            nombre: true
          }
        },
        catalogoEquipo: {
          select: {
            codigo: true,
            descripcion: true
          }
        }
      }
    })

    const inconsistencias = items.filter(item => {
      const cantidadPedidaReal = item.pedidos.reduce((total, pedido) => {
        return total + (pedido.cantidadPedida || 0)
      }, 0)
      return item.cantidadPedida !== cantidadPedidaReal
    })

    console.log(`📊 Encontradas ${inconsistencias.length} inconsistencias de ${items.length} items`)
    
    if (inconsistencias.length > 0) {
      console.log('\n📋 Inconsistencias encontradas:')
      inconsistencias.forEach((item, index) => {
        const cantidadPedidaReal = item.pedidos.reduce((total, pedido) => {
          return total + (pedido.cantidadPedida || 0)
        }, 0)
        
        console.log(`${index + 1}. Lista: ${item.lista?.nombre || 'N/A'}`)
        console.log(`   Equipo: ${item.catalogoEquipo?.codigo || item.codigo || 'N/A'} - ${item.catalogoEquipo?.descripcion || item.descripcion || 'N/A'}`)
        console.log(`   Cantidad almacenada: ${item.cantidadPedida}`)
        console.log(`   Cantidad real: ${cantidadPedidaReal}`)
        console.log(`   Diferencia: ${item.cantidadPedida - cantidadPedidaReal}`)
        console.log('   ---')
      })
    }

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 🚀 Ejecutar según argumentos de línea de comandos
const args = process.argv.slice(2)
const comando = args[0] || 'recalcular'

if (comando === 'auditar') {
  auditarInconsistencias()
    .catch((error) => {
      console.error('❌ Error fatal en auditoría:', error)
      process.exit(1)
    })
} else {
  recalcularCantidadesPedidas()
    .catch((error) => {
      console.error('❌ Error fatal en recálculo:', error)
      process.exit(1)
    })
}