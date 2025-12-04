// ===================================================
// 📁 Archivo: create-horas-hombre-test-data.ts
// 🔧 Descripción: Script para crear datos de prueba específicos del sistema de horas-hombre
// 🧠 Uso: Genera proyectos con EDTs, actividades y tareas para el wizard de registro
// ✍️ Autor: Sistema GYS - Debug Mode
// 📅 Fecha: 2025-11-07
// ===================================================

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createHorasHombreTestData() {
  console.log('🌱 Creando datos de prueba para sistema de horas-hombre...')

  try {
    // 👤 1. Crear/verificar usuario admin de prueba
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

    // 🏢 2. Crear/verificar cliente de prueba
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

    // 🏗️ 3. Crear/verificar proyecto de prueba
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

    // 📋 4. Crear/verificar categorías de servicios (EDTs)
    const categoriasServicios = [
      { nombre: 'Ingeniería Mecánica', descripcion: 'Diseño y desarrollo mecánico' },
      { nombre: 'Ingeniería Eléctrica', descripcion: 'Diseño y desarrollo eléctrico' },
      { nombre: 'Montaje e Instalación', descripcion: 'Montaje e instalación de equipos' },
      { nombre: 'Pruebas y Comisionamiento', descripcion: 'Pruebas de funcionamiento y comisionamiento' },
      { nombre: 'Supervisión Técnica', descripcion: 'Supervisión y control de calidad' }
    ]

    const categoriasCreadas = []
    for (const cat of categoriasServicios) {
      const categoria = await prisma.categoriaServicio.upsert({
        where: { nombre: cat.nombre },
        update: {},
        create: {
          nombre: cat.nombre,
          descripcion: cat.descripcion
        }
      })
      categoriasCreadas.push(categoria)
    }
    console.log('✅ Categorías de servicios procesadas:', categoriasCreadas.length)

    // 🏗️ 5. Crear/verificar cronograma del proyecto
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

    // 📊 6. Crear EDTs (Estructura de Descomposición del Trabajo)
    const edtsData = [
      {
        nombre: 'EDT-001: Diseño Mecánico',
        categoriaServicio: categoriasCreadas[0],
        horasPlan: 80,
        responsableId: testUser.id,
        orden: 1
      },
      {
        nombre: 'EDT-002: Diseño Eléctrico',
        categoriaServicio: categoriasCreadas[1],
        horasPlan: 60,
        responsableId: testUser.id,
        orden: 2
      },
      {
        nombre: 'EDT-003: Montaje de Equipos',
        categoriaServicio: categoriasCreadas[2],
        horasPlan: 120,
        responsableId: testUser.id,
        orden: 3
      },
      {
        nombre: 'EDT-004: Pruebas y Comisionamiento',
        categoriaServicio: categoriasCreadas[3],
        horasPlan: 40,
        responsableId: testUser.id,
        orden: 4
      },
      {
        nombre: 'EDT-005: Supervisión General',
        categoriaServicio: categoriasCreadas[4],
        horasPlan: 30,
        responsableId: testUser.id,
        orden: 5
      }
    ]

    const edtsCreados = []
    for (const edtData of edtsData) {
      let edt = await prisma.proyectoEdt.findFirst({
        where: {
          proyectoId: proyecto.id,
          nombre: edtData.nombre
        }
      })
      
      if (!edt) {
        edt = await prisma.proyectoEdt.create({
          data: {
            proyectoId: proyecto.id,
            nombre: edtData.nombre,
            categoriaServicioId: edtData.categoriaServicio.id,
            horasPlan: edtData.horasPlan,
            horasReales: 0,
            estado: 'planificado',
            responsableId: edtData.responsableId,
            porcentajeAvance: 0,
            prioridad: 'media',
            orden: edtData.orden,
            fechaInicio: new Date('2025-01-15'),
            fechaFin: new Date('2025-06-15')
          }
        })
        edtsCreados.push(edt)
        console.log(`✅ EDT creado: ${edt.nombre}`)
      } else {
        console.log(`✅ EDT ya existe: ${edt.nombre}`)
        edtsCreados.push(edt)
      }
    }

    // 🔧 7. Crear actividades para cada EDT
    for (const edt of edtsCreados) {
      const actividadesPorEdt = {
        'EDT-001: Diseño Mecánico': [
          { nombre: 'Análisis de Requerimientos Mecánicos', horasPlan: 20, orden: 1 },
          { nombre: 'Diseño de Componentes', horasPlan: 35, orden: 2 },
          { nombre: 'Revisión y Validación', horasPlan: 25, orden: 3 }
        ],
        'EDT-002: Diseño Eléctrico': [
          { nombre: 'Diseño de Circuitos', horasPlan: 25, orden: 1 },
          { nombre: 'Selección de Componentes', horasPlan: 20, orden: 2 },
          { nombre: 'Documentación Eléctrica', horasPlan: 15, orden: 3 }
        ],
        'EDT-003: Montaje de Equipos': [
          { nombre: 'Preparación de Área', horasPlan: 15, orden: 1 },
          { nombre: 'Instalación Mecánica', horasPlan: 60, orden: 2 },
          { nombre: 'Instalación Eléctrica', horasPlan: 45, orden: 3 }
        ],
        'EDT-004: Pruebas y Comisionamiento': [
          { nombre: 'Pruebas Individuales', horasPlan: 15, orden: 1 },
          { nombre: 'Pruebas Integrales', horasPlan: 20, orden: 2 },
          { nombre: 'Entrega y Documentación', horasPlan: 5, orden: 3 }
        ],
        'EDT-005: Supervisión General': [
          { nombre: 'Supervisión de Diseño', horasPlan: 10, orden: 1 },
          { nombre: 'Supervisión de Montaje', horasPlan: 15, orden: 2 },
          { nombre: 'Coordinación General', horasPlan: 5, orden: 3 }
        ]
      }

      const actividades = actividadesPorEdt[edt.nombre] || []
      for (const actData of actividades) {
        let actividad = await prisma.proyectoActividad.findFirst({
          where: {
            proyectoEdtId: edt.id,
            nombre: actData.nombre
          }
        })
        
        if (!actividad) {
          actividad = await prisma.proyectoActividad.create({
            data: {
              proyectoEdtId: edt.id,
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
              orden: actData.orden
            }
          })
          console.log(`✅ Actividad creada: ${actData.nombre}`)

          // 🎯 8. Crear tareas para cada actividad
          const tareasPorActividad = {
            'Análisis de Requerimientos Mecánicos': [
              { nombre: 'Revisión de documentación', horasEstimadas: 8, orden: 1 },
              { nombre: 'Definición de especificaciones', horasEstimadas: 12, orden: 2 }
            ],
            'Diseño de Componentes': [
              { nombre: 'Modelado 3D', horasEstimadas: 20, orden: 1 },
              { nombre: 'Cálculos de resistencia', horasEstimadas: 15, orden: 2 }
            ],
            'Revisión y Validación': [
              { nombre: 'Revisión técnica', horasEstimadas: 15, orden: 1 },
              { nombre: 'Ajustes finales', horasEstimadas: 10, orden: 2 }
            ],
            'Diseño de Circuitos': [
              { nombre: 'Esquemas eléctricos', horasEstimadas: 15, orden: 1 },
              { nombre: 'Layout PCB', horasEstimadas: 10, orden: 2 }
            ],
            'Selección de Componentes': [
              { nombre: 'Análisis de proveedores', horasEstimadas: 12, orden: 1 },
              { nombre: 'Cotización de componentes', horasEstimadas: 8, orden: 2 }
            ],
            'Documentación Eléctrica': [
              { nombre: 'Manuales técnicos', horasEstimadas: 10, orden: 1 },
              { nombre: 'Diagramas as-built', horasEstimadas: 5, orden: 2 }
            ],
            'Preparación de Área': [
              { nombre: 'Limpieza y orden', horasEstimadas: 5, orden: 1 },
              { nombre: 'Verificación de herramientas', horasEstimadas: 10, orden: 2 }
            ],
            'Instalación Mecánica': [
              { nombre: 'Montaje de estructura', horasEstimadas: 30, orden: 1 },
              { nombre: 'Conexiones mecánicas', horasEstimadas: 30, orden: 2 }
            ],
            'Instalación Eléctrica': [
              { nombre: 'Tendido de cables', horasEstimadas: 25, orden: 1 },
              { nombre: 'Conexiones eléctricas', horasEstimadas: 20, orden: 2 }
            ],
            'Pruebas Individuales': [
              { nombre: 'Pruebas de continuidad', horasEstimadas: 8, orden: 1 },
              { nombre: 'Pruebas de aislamiento', horasEstimadas: 7, orden: 2 }
            ],
            'Pruebas Integrales': [
              { nombre: 'Pruebas de funcionamiento', horasEstimadas: 12, orden: 1 },
              { nombre: 'Pruebas de carga', horasEstimadas: 8, orden: 2 }
            ],
            'Entrega y Documentación': [
              { nombre: 'Manuales de usuario', horasEstimadas: 3, orden: 1 },
              { nombre: 'Acta de entrega', horasEstimadas: 2, orden: 2 }
            ],
            'Supervisión de Diseño': [
              { nombre: 'Revisión de planos', horasEstimadas: 5, orden: 1 },
              { nombre: 'Validación técnica', horasEstimadas: 5, orden: 2 }
            ],
            'Supervisión de Montaje': [
              { nombre: 'Control de calidad', horasEstimadas: 8, orden: 1 },
              { nombre: 'Supervisión de seguridad', horasEstimadas: 7, orden: 2 }
            ],
            'Coordinación General': [
              { nombre: 'Reuniones de seguimiento', horasEstimadas: 3, orden: 1 },
              { nombre: 'Reportes de avance', horasEstimadas: 2, orden: 2 }
            ]
          }

          const tareas = tareasPorActividad[actividad.nombre] || []
          for (const tareaData of tareas) {
            await prisma.proyectoTarea.upsert({
              where: {
                proyectoEdtId_proyectoCronogramaId_nombre: {
                  proyectoEdtId: edt.id,
                  proyectoCronogramaId: cronograma.id,
                  nombre: tareaData.nombre
                }
              },
              update: {},
              create: {
                proyectoEdtId: edt.id,
                proyectoCronogramaId: cronograma.id,
                nombre: tareaData.nombre,
                fechaInicio: new Date('2025-01-25'),
                fechaFin: new Date('2025-06-25'),
                horasEstimadas: tareaData.horasEstimadas,
                horasReales: 0,
                estado: 'pendiente',
                prioridad: 'media',
                porcentajeCompletado: 0,
                responsableId: testUser.id,
                orden: tareaData.orden
              }
            })
            console.log(`✅ Tarea creada: ${tareaData.nombre}`)
          }
        }
      }
    }

    // 📝 9. Crear recursos para el sistema de horas-hombre
    const recursos = [
      { nombre: 'Ingeniero Mecánico Senior', costoHora: 45.00 },
      { nombre: 'Ingeniero Mecánico Junior', costoHora: 35.00 },
      { nombre: 'Ingeniero Eléctrico Senior', costoHora: 50.00 },
      { nombre: 'Ingeniero Eléctrico Junior', costoHora: 40.00 },
      { nombre: 'Técnico en Montaje', costoHora: 25.00 },
      { nombre: 'Supervisor de Proyecto', costoHora: 60.00 }
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

    // 📊 10. Resumen final
    console.log('\n🎉 Datos de prueba para horas-hombre creados exitosamente!')
    console.log('\n📋 Resumen:')
    console.log(`- Usuario: ${testUser.email} (contraseña: admin123)`)
    console.log(`- Cliente: ${cliente.nombre}`)
    console.log(`- Proyecto: ${proyecto.nombre} (ID: ${proyecto.id})`)
    console.log(`- EDTs creados: ${edtsCreados.length}`)
    console.log(`- Categorías de servicios: ${categoriasCreadas.length}`)
    console.log(`- Recursos: ${recursos.length}`)

    console.log('\n🔗 Para probar el wizard de horas-hombre:')
    console.log(`1. Ir a: http://localhost:3000/horas-hombre/registro`)
    console.log(`2. Iniciar sesión con: admin@gys.com / admin123`)
    console.log(`3. Verificar que aparezcan proyectos en el dropdown`)

    // 🧪 11. Verificar la API directamente
    console.log('\n🧪 Verificando la API de proyectos...')
    const proyectosVerificacion = await prisma.proyecto.findMany({
      where: {
        OR: [
          { comercialId: testUser.id },
          { gestorId: testUser.id },
          {
            proyectoEdts: {
              some: { responsableId: testUser.id }
            }
          }
        ]
      },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true
      }
    })

    console.log(`✅ Proyectos encontrados para el usuario: ${proyectosVerificacion.length}`)
    proyectosVerificacion.forEach(proj => {
      console.log(`   - ${proj.codigo}: ${proj.nombre}`)
    })

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createHorasHombreTestData()
    .then(() => {
      console.log('✅ Script de datos de prueba completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error en script:', error)
      process.exit(1)
    })
}

export default createHorasHombreTestData