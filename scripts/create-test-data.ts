// ===================================================
// 📁 Archivo: create-test-data.ts
// 🔧 Descripción: Script para crear datos de prueba completos
// 🧠 Uso: Genera proyectos, listas de equipos y datos relacionados
// ✍️ Autor: Asistente IA GYS
// 📅 Fecha: 2025-01-27
// ===================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestData() {
  console.log('🌱 Creando datos de prueba...')

  try {
    // 🏢 Crear cliente de prueba
    let cliente = await prisma.cliente.findFirst({
      where: { correo: 'cliente.test@empresa.com' }
    })
    
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          codigo: 'CLI-TEST-001',
          nombre: 'Empresa Test S.A.C.',
          correo: 'cliente.test@empresa.com',
          telefono: '+51 999 888 777',
          direccion: 'Av. Test 123, Lima, Perú',
          ruc: '20123456789'
        }
      })
    }
    console.log('✅ Cliente creado:', cliente.nombre)

    // 👤 Obtener usuario admin para asignar como responsable
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (!adminUser) {
      throw new Error('No se encontró usuario admin. Ejecuta primero: npx prisma db seed')
    }

    // 🏗️ Crear proyecto de prueba
    let proyecto = await prisma.proyecto.findFirst({
      where: { codigo: 'PROJ-TEST-001' }
    })
    
    if (!proyecto) {
      proyecto = await prisma.proyecto.create({
        data: {
          codigo: 'PROJ-TEST-001',
          nombre: 'Proyecto de Prueba - Sistema GYS',
          clienteId: cliente.id,
          comercialId: adminUser.id,
          gestorId: adminUser.id,
          estado: 'en_ejecucion',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2025-12-31')
        }
      })
    }
    console.log('✅ Proyecto creado:', proyecto.nombre)

    // 📋 Crear categorías de equipo
    const categoriaElectrica = await prisma.categoriaEquipo.upsert({
      where: { nombre: 'Equipos Eléctricos' },
      update: {},
      create: {
        nombre: 'Equipos Eléctricos'
      }
    })

    const categoriaMecanica = await prisma.categoriaEquipo.upsert({
      where: { nombre: 'Equipos Mecánicos' },
      update: {},
      create: {
        nombre: 'Equipos Mecánicos'
      }
    })

    // 📏 Crear unidades
    const unidadPieza = await prisma.unidad.upsert({
      where: { nombre: 'Pieza' },
      update: {},
      create: {
        nombre: 'Pieza'
      }
    })

    const unidadMetro = await prisma.unidad.upsert({
      where: { nombre: 'Metro' },
      update: {},
      create: {
        nombre: 'Metro'
      }
    })

    // 📦 Crear equipos de catálogo
    const equipos = await Promise.all([
      prisma.catalogoEquipo.upsert({
        where: { codigo: 'MOTOR-001' },
        update: {},
        create: {
          codigo: 'MOTOR-001',
          descripcion: 'Motor Eléctrico 5HP 220V',
          marca: 'ABB',
          precioInterno: 1200.00,
          margen: 0.25,
          precioVenta: 1500.00,
          categoriaId: categoriaElectrica.id,
          unidadId: unidadPieza.id,
          estado: 'activo'
        }
      }),
      prisma.catalogoEquipo.upsert({
        where: { codigo: 'CABLE-001' },
        update: {},
        create: {
          codigo: 'CABLE-001',
          descripcion: 'Cable Eléctrico 12 AWG',
          marca: 'Indeco',
          precioInterno: 8.50,
          margen: 0.30,
          precioVenta: 11.05,
          categoriaId: categoriaElectrica.id,
          unidadId: unidadMetro.id,
          estado: 'activo'
        }
      }),
      prisma.catalogoEquipo.upsert({
        where: { codigo: 'BOMBA-001' },
        update: {},
        create: {
          codigo: 'BOMBA-001',
          descripcion: 'Bomba Centrífuga 2"',
          marca: 'Grundfos',
          precioInterno: 850.00,
          margen: 0.28,
          precioVenta: 1088.00,
          categoriaId: categoriaMecanica.id,
          unidadId: unidadPieza.id,
          estado: 'activo'
        }
      })
    ])
    console.log('✅ Equipos de catálogo creados:', equipos.length)

    // 📋 Crear lista de equipos
    let listaEquipo = await prisma.listaEquipo.findFirst({
      where: { codigo: 'LISTA-TEST-001' }
    })
    
    if (!listaEquipo) {
      listaEquipo = await prisma.listaEquipo.create({
        data: {
          codigo: 'LISTA-TEST-001',
          nombre: 'Lista de Equipos Eléctricos - Proyecto Test',
          proyectoId: proyecto.id,
          responsableId: adminUser.id,
          estado: 'borrador',
          numeroSecuencia: 1
        }
      })
    }
    console.log('✅ Lista de equipos creada:', listaEquipo.nombre)

    // 📝 Crear items de la lista
    const items = await Promise.all([
      prisma.listaEquipoItem.create({
        data: {
          listaId: listaEquipo.id,
          responsableId: adminUser.id,
          codigo: equipos[0].codigo,
          descripcion: equipos[0].descripcion,
          unidad: 'Pieza',
          cantidad: 2,
          presupuesto: 1500.00
        }
      }),
      prisma.listaEquipoItem.create({
        data: {
          listaId: listaEquipo.id,
          responsableId: adminUser.id,
          codigo: equipos[1].codigo,
          descripcion: equipos[1].descripcion,
          unidad: 'Metro',
          cantidad: 50,
          presupuesto: 11.05
        }
      }),
      prisma.listaEquipoItem.create({
        data: {
          listaId: listaEquipo.id,
          responsableId: adminUser.id,
          codigo: equipos[2].codigo,
          descripcion: equipos[2].descripcion,
          unidad: 'Pieza',
          cantidad: 1,
          presupuesto: 1088.00
        }
      })
    ])
    console.log('✅ Items de lista creados:', items.length)

    // 📋 Crear segunda lista para tener más datos
    let listaEquipo2 = await prisma.listaEquipo.findFirst({
      where: { codigo: 'LISTA-TEST-002' }
    })
    
    if (!listaEquipo2) {
      listaEquipo2 = await prisma.listaEquipo.create({
        data: {
          codigo: 'LISTA-TEST-002',
          nombre: 'Lista de Equipos Mecánicos - Proyecto Test',
          proyectoId: proyecto.id,
          responsableId: adminUser.id,
          estado: 'por_revisar',
          numeroSecuencia: 2
        }
      })
    }
    console.log('✅ Segunda lista de equipos creada:', listaEquipo2.nombre)

    // 📝 Crear items para la segunda lista
    await prisma.listaEquipoItem.create({
      data: {
        listaId: listaEquipo2.id,
        responsableId: adminUser.id,
        codigo: equipos[2].codigo,
        descripcion: equipos[2].descripcion,
        unidad: 'Pieza',
        cantidad: 3,
        presupuesto: 1088.00
      }
    })

    console.log('\n🎉 Datos de prueba creados exitosamente!')
    console.log('\n📋 Resumen:')
    console.log(`- Cliente: ${cliente.nombre}`)
    console.log(`- Proyecto: ${proyecto.nombre} (ID: ${proyecto.id})`)
    console.log(`- Lista 1: ${listaEquipo.nombre} (ID: ${listaEquipo.id})`)
    console.log(`- Lista 2: ${listaEquipo2.nombre} (ID: ${listaEquipo2.id})`)
    console.log(`- Equipos de catálogo: ${equipos.length}`)
    console.log(`- Items de lista: ${items.length + 1}`)

    console.log('\n🔗 URLs de prueba:')
    console.log(`- Proyecto: http://localhost:3001/proyectos/${proyecto.id}`)
    console.log(`- Lista 1: http://localhost:3001/proyectos/${proyecto.id}/equipos/${listaEquipo.id}/detalle`)
    console.log(`- Lista 2: http://localhost:3001/proyectos/${proyecto.id}/equipos/${listaEquipo2.id}/detalle`)

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log('✅ Script completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error en script:', error)
      process.exit(1)
    })
}

export default createTestData