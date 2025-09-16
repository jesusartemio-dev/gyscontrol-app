// scripts/cleanClienteData.js
// Script para limpiar datos de clientes con códigos automáticos

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanClienteData() {
  try {
    console.log('🧹 Iniciando limpieza de datos de clientes...')
    
    // Primero obtener IDs de clientes con códigos automáticos
    const clientsToDelete = await prisma.cliente.findMany({
      where: {
        codigo: {
          startsWith: 'CLI-'
        }
      },
      select: { id: true, codigo: true, nombre: true }
    })
    
    console.log(`📋 Encontrados ${clientsToDelete.length} clientes con códigos automáticos`)
    
    if (clientsToDelete.length > 0) {
      const clientIds = clientsToDelete.map(c => c.id)
      
      // Eliminar cotizaciones relacionadas
      const deletedCotizaciones = await prisma.cotizacion.deleteMany({
        where: {
          clienteId: {
            in: clientIds
          }
        }
      })
      console.log(`🗑️ Eliminadas ${deletedCotizaciones.count} cotizaciones`)
      
      // Eliminar proyectos relacionados
      const deletedProyectos = await prisma.proyecto.deleteMany({
        where: {
          clienteId: {
            in: clientIds
          }
        }
      })
      console.log(`🗑️ Eliminados ${deletedProyectos.count} proyectos`)
      
      // Ahora eliminar los clientes
      const deletedClients = await prisma.cliente.deleteMany({
        where: {
          id: {
            in: clientIds
          }
        }
      })
      
      console.log(`✅ Eliminados ${deletedClients.count} clientes con códigos automáticos`)
    }
    
    // Mostrar clientes restantes
    const remainingClients = await prisma.cliente.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        numeroSecuencia: true
      }
    })
    
    console.log('📋 Clientes restantes:')
    remainingClients.forEach(client => {
      console.log(`  - ${client.codigo}: ${client.nombre} (seq: ${client.numeroSecuencia})`)
    })
    
    console.log('✅ Limpieza completada')
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanClienteData()