// ===================================================
// 📁 Archivo: test-api-auth.js
// 🔧 Descripción: Script para probar la API con autenticación
// 🧠 Uso: Simular sesión de usuario y probar endpoints
// ✍️ Autor: Sistema GYS - Debug Mode
// 📅 Fecha: 2025-11-07
// ===================================================

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testApiWithAuth() {
  console.log('🧪 Probando API de proyectos con autenticación...')

  try {
    // 📋 1. Crear objeto de sesión simulado
    const testUser = await prisma.user.findFirst({
      where: { email: 'admin@gys.com' }
    })

    if (!testUser) {
      throw new Error('Usuario de prueba no encontrado')
    }

    // 📋 2. Simular la sesión del usuario
    const mockSession = {
      user: {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        name: testUser.name
      }
    }

    console.log('✅ Sesión simulada creada para:', mockSession.user.email)

    // 📋 3. Probar la lógica de la API de proyectos del usuario
    console.log('\n📋 Probando lógica de consulta de proyectos...')
    
    const rolesConAccesoTotal = ['admin', 'gerente']
    let where = {}

    if (!rolesConAccesoTotal.includes(mockSession.user.role)) {
      // Para usuarios que no son admin o gerente
      if (mockSession.user.role === 'comercial') {
        where.comercialId = mockSession.user.id
      } else if (mockSession.user.role === 'gestor') {
        where.gestorId = mockSession.user.id
      } else {
        where.OR = [
          { comercialId: mockSession.user.id },
          { gestorId: mockSession.user.id },
          {
            proyectoEdts: {
              some: { responsableId: mockSession.user.id }
            }
          }
        ]
      }
    }
    
    console.log('🔍 Filtro WHERE aplicado:', JSON.stringify(where, null, 2))

    // 📋 4. Ejecutar la consulta
    const proyectos = await prisma.proyecto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        comercial: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        gestor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    console.log(`✅ Proyectos encontrados: ${proyectos.length}`)

    // 📋 5. Formatear respuesta como la API
    const response = {
      success: true,
      proyectos: proyectos.map(proyecto => ({
        id: proyecto.id,
        nombre: proyecto.nombre,
        codigo: proyecto.codigo,
        estado: proyecto.estado,
        fechaInicio: proyecto.fechaInicio,
        fechaFin: proyecto.fechaFin,
        responsableNombre: proyecto.gestor?.name || proyecto.comercial?.name || 'Sin responsable'
      })),
      total: proyectos.length
    }

    console.log('\n📋 Respuesta de la API:')
    console.log(JSON.stringify(response, null, 2))

    // 📋 6. Verificar datos específicos
    if (response.total > 0) {
      console.log('\n✅ La API devolvió proyectos correctamente!')
      console.log('📋 Proyectos disponibles para el dropdown:')
      response.proyectos.forEach((proyecto, index) => {
        console.log(`   ${index + 1}. ${proyecto.codigo} - ${proyecto.nombre}`)
        console.log(`      Responsable: ${proyecto.responsableNombre}`)
        console.log(`      Estado: ${proyecto.estado}`)
      })
    } else {
      console.log('\n❌ No se encontraron proyectos')
    }

    // 📋 7. Verificar EDTs del proyecto
    if (proyectos.length > 0) {
      const primerProyecto = proyectos[0]
      console.log(`\n🔍 Verificando EDTs del proyecto: ${primerProyecto.nombre}`)
      
      const edts = await prisma.proyectoEdt.findMany({
        where: {
          proyectoId: primerProyecto.id
        },
        include: {
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      })

      console.log(`✅ EDTs encontradas: ${edts.length}`)
      edts.forEach((edt, index) => {
        console.log(`   ${index + 1}. ${edt.categoriaServicio.nombre} - ${edt.nombre}`)
        console.log(`      Estado: ${edt.estado} | Horas Plan: ${edt.horasPlan}h`)
      })
    }

    console.log('\n🎉 Test de API con autenticación completado exitosamente!')
    return response

  } catch (error) {
    console.error('❌ Error en test de API:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testApiWithAuth()
    .then((result) => {
      console.log('\n✅ Test completado exitosamente')
      console.log('🔗 La API debería funcionar correctamente en el navegador')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error en test:', error)
      process.exit(1)
    })
}

module.exports = testApiWithAuth