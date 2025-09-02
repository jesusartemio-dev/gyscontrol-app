// ===================================================
// 📁 Archivo: fix-negative-cantidades.js
// 📌 Descripción: Script para corregir valores negativos en cantidadPedida
// 📌 Características: Identifica y corrige inconsistencias en la DB
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixNegativeCantidades() {
  try {
    console.log('🔍 Buscando registros con cantidadPedida negativa...')
    
    // ✅ Find all records with negative cantidadPedida
    const negativeRecords = await prisma.listaEquipoItem.findMany({
      where: {
        cantidadPedida: {
          lt: 0
        }
      },
      include: {
        catalogoEquipo: {
          select: {
            codigo: true,
            descripcion: true
          }
        },
        lista: {
          select: {
            nombre: true
          }
        }
      }
    })

    console.log(`📊 Encontrados ${negativeRecords.length} registros con cantidadPedida negativa`)

    if (negativeRecords.length === 0) {
      console.log('✅ No se encontraron registros con cantidadPedida negativa')
      return
    }

    // 📡 Show details of negative records
    console.log('\n📋 Detalles de registros con cantidadPedida negativa:')
    negativeRecords.forEach((record, index) => {
      console.log(`${index + 1}. Lista: ${record.lista?.nombre || 'N/A'}`)
      console.log(`   Equipo: ${record.catalogoEquipo?.codigo || record.codigo || 'N/A'} - ${record.catalogoEquipo?.descripcion || record.descripcion || 'N/A'}`)
      console.log(`   cantidadPedida: ${record.cantidadPedida}`)
      console.log(`   cantidadEntregada: ${record.cantidadEntregada}`)
      console.log('   ---')
    })

    // 🔁 Ask for confirmation before fixing
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise((resolve) => {
      rl.question('\n¿Deseas corregir estos registros estableciendo cantidadPedida = 0? (y/N): ', resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operación cancelada')
      return
    }

    // ✅ Fix negative values by setting them to 0
    const updateResult = await prisma.listaEquipoItem.updateMany({
      where: {
        cantidadPedida: {
          lt: 0
        }
      },
      data: {
        cantidadPedida: 0
      }
    })

    console.log(`\n✅ Se corrigieron ${updateResult.count} registros`)
    console.log('🎉 Proceso completado exitosamente')

    // 📡 Verify the fix
    const remainingNegative = await prisma.listaEquipoItem.count({
      where: {
        cantidadPedida: {
          lt: 0
        }
      }
    })

    console.log(`\n🔍 Verificación: ${remainingNegative} registros con cantidadPedida negativa restantes`)

  } catch (error) {
    console.error('❌ Error al corregir cantidades negativas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 🚀 Execute the fix
fixNegativeCantidades()
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })