// ===================================================
// 📁 Archivo: test-lista-creation.js
// 🔧 Descripción: Script para probar la creación de listas de equipos
// ✍️ Autor: GYS AI Assistant
// 📅 Fecha: 2025-01-27
// ===================================================

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testListaCreation() {
  try {
    console.log('🔍 Probando creación de lista de equipos...')
    
    // Obtener un proyecto existente
    const proyecto = await prisma.proyecto.findFirst({
      select: {
        id: true,
        codigo: true,
        nombre: true
      }
    })
    
    if (!proyecto) {
      console.log('❌ No hay proyectos en la base de datos')
      return
    }
    
    console.log('📋 Proyecto encontrado:', proyecto)
    
    // Obtener un usuario existente
    const usuario = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
    
    if (!usuario) {
      console.log('❌ No hay usuarios en la base de datos')
      return
    }
    
    console.log('👤 Usuario encontrado:', usuario)
    
    // Obtener el siguiente número de secuencia
    const ultimaLista = await prisma.listaEquipo.findFirst({
      where: { proyectoId: proyecto.id },
      orderBy: { numeroSecuencia: 'desc' },
      select: { numeroSecuencia: true }
    })
    
    const numeroSecuencia = (ultimaLista?.numeroSecuencia || 0) + 1
    const codigoGenerado = `${proyecto.codigo}-LE${numeroSecuencia.toString().padStart(3, '0')}`
    
    console.log('🔢 Número de secuencia:', numeroSecuencia)
    console.log('🏷️ Código generado:', codigoGenerado)
    
    // Intentar crear la lista
    const nuevaLista = await prisma.listaEquipo.create({
      data: {
        proyectoId: proyecto.id,
        responsableId: usuario.id,
        codigo: codigoGenerado,
        numeroSecuencia: numeroSecuencia,
        nombre: 'Lista de Prueba - Script',
        fechaNecesaria: new Date('2025-02-15')
      },
      include: {
        proyecto: {
          select: {
            codigo: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    console.log('✅ Lista creada exitosamente:')
    console.log('  - ID:', nuevaLista.id)
    console.log('  - Código:', nuevaLista.codigo)
    console.log('  - Nombre:', nuevaLista.nombre)
    console.log('  - Proyecto:', nuevaLista.proyecto.nombre)
    console.log('  - Responsable:', nuevaLista.responsable.name)
    console.log('  - Fecha necesaria:', nuevaLista.fechaNecesaria)
    
  } catch (error) {
    console.error('❌ Error al crear la lista:', error)
    
    if (error.code === 'P2003') {
      console.error('🔍 Error de clave foránea detectado:')
      console.error('   - Verifica que el proyectoId existe')
      console.error('   - Verifica que el responsableId existe')
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
testListaCreation()
  .then(() => {
    console.log('\n✅ Prueba completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en la prueba:', error)
    process.exit(1)
  })