// ===============================
// 📁 fillClienteCodes.js
// 🔧 Script para llenar códigos automáticos de clientes existentes
// ===============================

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fillClienteCodes() {
  try {
    console.log('🔄 Iniciando llenado de códigos de clientes...')
    
    // 📡 Obtener clientes sin código
    const clientesSinCodigo = await prisma.cliente.findMany({
      where: {
        codigo: null
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log(`📊 Encontrados ${clientesSinCodigo.length} clientes sin código`)
    
    let secuencia = 1
    const year = new Date().getFullYear().toString().slice(-2)
    
    for (const cliente of clientesSinCodigo) {
      const codigo = `CLI-${secuencia.toString().padStart(4, '0')}-${year}`
      
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          codigo,
          numeroSecuencia: secuencia
        }
      })
      
      console.log(`✅ Cliente ${cliente.nombre} actualizado con código: ${codigo}`)
      secuencia++
    }
    
    console.log('🎉 Proceso completado exitosamente')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fillClienteCodes()