// Script para probar la API directamente sin autenticación
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDirectImport() {
  try {
    console.log('🧪 Testing direct client creation...')
    
    // Datos de prueba
    const testClientes = [
      {
        codigo: "TEST001",
        nombre: "Cliente de Prueba 1",
        ruc: "12345678901",
        direccion: "Av. Test 123",
        telefono: "987654321",
        correo: "test1@example.com"
      },
      {
        codigo: "TEST002",
        nombre: "Cliente de Prueba 2",
        ruc: "10987654321",
        direccion: "Jr. Prueba 456",
        telefono: "123456789",
        correo: "test2@example.com"
      }
    ]
    
    // Verificar códigos existentes
    const existingClients = await prisma.cliente.findMany({
      select: { codigo: true }
    })
    const codigosExistentes = new Set(existingClients.map(c => c.codigo))
    
    console.log('Existing client codes:', Array.from(codigosExistentes))
    
    // Crear clientes
    const creados = []
    const errores = []
    
    for (const clienteData of testClientes) {
      try {
        if (codigosExistentes.has(clienteData.codigo)) {
          console.log(`⚠️ Client ${clienteData.codigo} already exists, skipping...`)
          continue
        }
        
        console.log(`🔢 Creating client with code: ${clienteData.codigo}`)
        
        const nuevoCliente = await prisma.cliente.create({
          data: {
            codigo: clienteData.codigo,
            numeroSecuencia: 1,
            nombre: clienteData.nombre,
            ruc: clienteData.ruc || null,
            direccion: clienteData.direccion || null,
            telefono: clienteData.telefono || null,
            correo: clienteData.correo || null
          }
        })
        
        console.log('✅ Client created:', nuevoCliente.codigo)
        creados.push(nuevoCliente)
        
      } catch (error) {
        console.error(`❌ Error creating client ${clienteData.codigo}:`, error.message)
        errores.push(`Error al crear cliente ${clienteData.codigo}: ${error.message}`)
      }
    }
    
    console.log('\n📊 Results:')
    console.log(`Created: ${creados.length}`)
    console.log(`Errors: ${errores.length}`)
    
    if (errores.length > 0) {
      console.log('\n❌ Errors:')
      errores.forEach(error => console.log(`  - ${error}`))
    }
    
  } catch (error) {
    console.error('🚨 Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDirectImport()