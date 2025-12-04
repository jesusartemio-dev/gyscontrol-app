// ===================================================
// 📁 Archivo: create-simple-test-data.ts
// 🔧 Descripción: Script simplificado para crear datos de prueba
// 🧠 Uso: Genera usuario admin y proyecto con datos básicos
// ✍️ Autor: Sistema GYS - Debug Mode
// 📅 Fecha: 2025-11-07
// ===================================================

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createSimpleTestData() {
  console.log('🌱 Creando datos de prueba simplificados...')

  try {
    // 👤 1. Crear/verificar usuario admin
    let testUser = await prisma.user.findFirst({
      where: { email: 'admin@gys.com' }
    })

    if (!testUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      testUser = await prisma.user.create({
        data: {
          name: 'Administrador GYS',
          email: 'admin@gys.com',
          password: hashedPassword,
          role: 'admin'
        }
      })
      console.log('✅ Usuario admin creado:', testUser.email)
    } else {
      console.log('✅ Usuario admin ya existe:', testUser.email)
    }

    // 🏢 2. Crear/verificar cliente
    let cliente = await prisma.cliente.findFirst({
      where: { nombre: 'Empresa Test S.A.C.' }
    })
    
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          codigo: 'CLI-TEST-002',
          nombre: 'Empresa Test S.A.C.',
          correo: 'cliente.test@empresa.com',
          telefono: '+51 999 888 777',
          direccion: 'Av. Test 123, Lima, Perú',
          ruc: '20123456789',
          numeroSecuencia: 1
        }
      })
      console.log('✅ Cliente creado:', cliente.nombre)
    } else {
      console.log('✅ Cliente ya existe:', cliente.nombre)
    }

    // 🏗️ 3. Crear/verificar proyecto
    let proyecto = await prisma.proyecto.findFirst({
      where: { codigo: 'PROJ-HORAS-TEST-001' }
    })
    
    if (!proyecto) {
      proyecto = await prisma.proyecto.create({
        data: {
          codigo: 'PROJ-HORAS-TEST-001',
          nombre: 'Proyecto Test - Registro de Horas-Hombre',
          clienteId: cliente.id,
          comercialId: testUser.id,
          gestorId: testUser.id,
          estado: 'en_ejecucion',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2025-12-31'),
          totalEquiposInterno: 0,
          totalServiciosInterno: 0,
          totalGastosInterno: 0,
          totalInterno: 0,
          totalCliente: 0,
          descuento: 0,
          grandTotal: 0,
          totalRealEquipos: 0,
          totalRealServicios: 0,
          totalRealGastos: 0,
          totalReal: 0
        }
      })
      console.log('✅ Proyecto creado:', proyecto.nombre)
    } else {
      console.log('✅ Proyecto ya existe:', proyecto.nombre)
    }

    // 📋 4. Crear/verificar EDTs básicas
    const edtsData = [
      { nombre: 'Ingeniería Mecánica', descripcion: 'Diseño y desarrollo mecánico' },
      { nombre: 'Ingeniería Eléctrica', descripcion: 'Diseño y desarrollo eléctrico' },
      { nombre: 'Montaje e Instalación', descripcion: 'Montaje e instalación de equipos' }
    ]

    const edtsCreadas = []
    for (const edtData of edtsData) {
      let edt = await prisma.edt.findFirst({
        where: { nombre: edtData.nombre }
      })
      
      if (!edt) {
        edt = await prisma.edt.create({
          data: {
            nombre: edtData.nombre,
            descripcion: edtData.descripcion
          }
        })
        edtsCreadas.push(edt)
        console.log(`✅ EDT creado: ${edt.nombre}`)
      } else {
        console.log(`✅ EDT ya existe: ${edt.nombre}`)
        edtsCreadas.push(edt)
      }
    }

    // 🏗️ 5. Crear/verificar cronograma
    let cronograma = await prisma.proyectoCronograma.findFirst({
      where: { 
        proyectoId: proyecto.id,
        tipo: 'ejecucion'
      }
    })
    
    if (!cronograma) {
      cronograma = await prisma.proyectoCronograma.create({
        data: {
          proyectoId: proyecto.id,
          tipo: 'ejecucion',
          nombre: 'Cronograma de Ejecución - Horas-Hombre Test',
          esBaseline: false,
          version: 1
        }
      })
      console.log('✅ Cronograma creado:', cronograma.nombre)
    } else {
      console.log('✅ Cronograma ya existe:', cronograma.nombre)
    }

    // 📊 6. Crear EDTs del proyecto (ProyectoEdt)
    const proyectoEdtsData = [
      { edt: edtsCreadas[0], horasPlan: 80, orden: 1 },
      { edt: edtsCreadas[1], horasPlan: 60, orden: 2 },
      { edt: edtsCreadas[2], horasPlan: 120, orden: 3 }
    ]

    const proyectoEdtsCreados = []
    for (const data of proyectoEdtsData) {
      let proyectoEdt = await prisma.proyectoEdt.findFirst({
        where: {
          proyectoId: proyecto.id,
          proyectoCronogramaId: cronograma.id,
          categoriaServicioId: data.edt.id
        }
      })
      
      if (!proyectoEdt) {
        proyectoEdt = await prisma.proyectoEdt.create({
          data: {
            proyectoId: proyecto.id,
            proyectoCronogramaId: cronograma.id,
            nombre: `${data.edt.nombre} - EDT`,
            categoriaServicioId: data.edt.id,
            horasPlan: data.horasPlan,
            horasReales: 0,
            estado: 'planificado',
            responsableId: testUser.id,
            porcentajeAvance: 0,
            prioridad: 'media',
            orden: data.orden,
            fechaInicioPlan: new Date('2025-01-15'),
            fechaFinPlan: new Date('2025-06-15')
          }
        })
        proyectoEdtsCreados.push(proyectoEdt)
        console.log(`✅ ProyectoEdt creado: ${proyectoEdt.nombre}`)
      } else {
        console.log(`✅ ProyectoEdt ya existe: ${proyectoEdt.nombre}`)
        proyectoEdtsCreados.push(proyectoEdt)
      }
    }

    // 🔧 7. Crear actividades para el primer EDT
    if (proyectoEdtsCreados.length > 0) {
      const actividades = [
        { nombre: 'Análisis de Requerimientos', horasPlan: 20, orden: 1 },
        { nombre: 'Diseño Técnico', horasPlan: 35, orden: 2 },
        { nombre: 'Revisión y Validación', horasPlan: 25, orden: 3 }
      ]

      const primerEdt = proyectoEdtsCreados[0]
      
      for (const actData of actividades) {
        let actividad = await prisma.proyectoActividad.findFirst({
          where: {
            proyectoEdtId: primerEdt.id,
            nombre: actData.nombre
          }
        })
        
        if (!actividad) {
          actividad = await prisma.proyectoActividad.create({
            data: {
              id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              proyectoEdtId: primerEdt.id,
              proyectoCronogramaId: cronograma.id,
              nombre: actData.nombre,
              responsableId: testUser.id,
              fechaInicioPlan: new Date('2025-01-20'),
              fechaFinPlan: new Date('2025-06-20'),
              estado: 'pendiente',
              porcentajeAvance: 0,
              horasPlan: actData.horasPlan,
              horasReales: 0,
              prioridad: 'media',
              orden: actData.orden,
              updatedAt: new Date()
            }
          })
          console.log(`✅ Actividad creada: ${actividad.nombre}`)
        } else {
          console.log(`✅ Actividad ya existe: ${actividad.nombre}`)
        }
      }
    }

    // 📝 8. Crear recursos
    const recursos = [
      { nombre: 'Ingeniero Senior', costoHora: 45.00 },
      { nombre: 'Ingeniero Junior', costoHora: 35.00 },
      { nombre: 'Técnico', costoHora: 25.00 }
    ]

    for (const recursoData of recursos) {
      await prisma.recurso.upsert({
        where: { nombre: recursoData.nombre },
        update: {},
        create: {
          nombre: recursoData.nombre,
          costoHora: recursoData.costoHora
        }
      })
    }
    console.log('✅ Recursos creados:', recursos.length)

    // 📊 9. Resumen final
    console.log('\n🎉 Datos de prueba simplificados creados exitosamente!')
    console.log('\n📋 Resumen:')
    console.log(`- Usuario: ${testUser.email} (contraseña: admin123)`)
    console.log(`- Cliente: ${cliente.nombre}`)
    console.log(`- Proyecto: ${proyecto.nombre} (ID: ${proyecto.id})`)
    console.log(`- EDTs del proyecto: ${proyectoEdtsCreados.length}`)
    console.log(`- EDTs base: ${edtsCreadas.length}`)

    console.log('\n🔗 Para probar el wizard de horas-hombre:')
    console.log(`1. Ir a: http://localhost:3000/horas-hombre/registro`)
    console.log(`2. Iniciar sesión con: admin@gys.com / admin123`)
    console.log(`3. Verificar que aparezcan proyectos en el dropdown`)

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createSimpleTestData()
    .then(() => {
      console.log('✅ Script completado exitosamente')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error en script:', error)
      process.exit(1)
    })
}

export default createSimpleTestData