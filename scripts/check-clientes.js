// Script para verificar clientes en la base de datos
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkClientes() {
  try {
    console.log('🔍 Verificando clientes en la base de datos...')

    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        nombre: true,
        ruc: true,
        sector: true
      }
    })

    console.log(`📊 Clientes encontrados: ${clientes.length}`)

    if (clientes.length > 0) {
      console.log('📋 Lista de clientes:')
      clientes.forEach((cliente, index) => {
        console.log(`${index + 1}. ${cliente.nombre} (ID: ${cliente.id})`)
      })
    } else {
      console.log('⚠️  No hay clientes en la base de datos')
    }

  } catch (error) {
    console.error('❌ Error al verificar clientes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkClientes()