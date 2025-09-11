// ===================================================
// 📁 Archivo: test-api-session.js
// 🔧 Descripción: Script para probar la sesión en la API
// ✍️ Autor: GYS AI Assistant
// 📅 Fecha: 2025-01-27
// ===================================================

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testApiSession() {
  try {
    console.log('🔍 Verificando integridad de datos...')
    
    console.log('\n1️⃣ Verificando restricciones de clave foránea:')
    
    // Verificar usuarios en la base de datos
    console.log('\n2️⃣ Verificando usuarios existentes:')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
    
    console.log(`Total usuarios: ${users.length}`)
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`)
    })
    
    // Verificar proyecto específico del error
    console.log('\n3️⃣ Verificando proyecto específico:')
    const proyectoId = 'cmfee7bqv00byl86kred5oc8o'
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        comercialId: true,
        gestorId: true
      }
    })
    
    if (proyecto) {
      console.log('Proyecto encontrado:', proyecto)
      
      // Verificar si los usuarios del proyecto existen
      const comercial = await prisma.user.findUnique({
        where: { id: proyecto.comercialId },
        select: { id: true, name: true, email: true }
      })
      
      const gestor = await prisma.user.findUnique({
        where: { id: proyecto.gestorId },
        select: { id: true, name: true, email: true }
      })
      
      console.log('Comercial:', comercial)
      console.log('Gestor:', gestor)
    } else {
      console.log('❌ Proyecto no encontrado')
    }
    
    // Simular creación con diferentes usuarios
    console.log('\n4️⃣ Simulando creación con diferentes usuarios:')
    
    for (const user of users.slice(0, 2)) {
      try {
        console.log(`\n   Probando con usuario: ${user.name} (${user.id})`)
        
        // Verificar que el usuario existe antes de crear
        const userExists = await prisma.user.findUnique({
          where: { id: user.id }
        })
        
        if (!userExists) {
          console.log('   ❌ Usuario no existe en la base de datos')
          continue
        }
        
        const ultimaLista = await prisma.listaEquipo.findFirst({
          where: { proyectoId: proyectoId },
          orderBy: { numeroSecuencia: 'desc' },
        })
        
        const nuevoNumero = ultimaLista ? ultimaLista.numeroSecuencia + 1 : 1
        const codigoGenerado = `CJM01-LST-${String(nuevoNumero).padStart(3, '0')}`
        
        const nuevaLista = await prisma.listaEquipo.create({
          data: {
            proyectoId: proyectoId,
            responsableId: user.id,
            codigo: codigoGenerado,
            numeroSecuencia: nuevoNumero,
            nombre: `Lista de Prueba - ${user.name}`,
            fechaNecesaria: new Date('2025-02-20')
          }
        })
        
        console.log('   ✅ Lista creada exitosamente:', {
          id: nuevaLista.id,
          codigo: nuevaLista.codigo,
          responsableId: nuevaLista.responsableId
        })
        
      } catch (error) {
        console.log('   ❌ Error al crear lista:', error.message)
        if (error.code === 'P2003') {
          console.log('   🔍 Error de clave foránea - verificando restricciones...')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
testApiSession()
  .then(() => {
    console.log('\n✅ Prueba de sesión completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en la prueba:', error)
    process.exit(1)
  })