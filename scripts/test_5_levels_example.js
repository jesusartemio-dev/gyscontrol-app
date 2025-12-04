const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function create5LevelsExample() {
  console.log('🚀 Creando proyecto de ejemplo con jerarquía de 5 niveles...\n');

  try {
    // 1. Crear cliente de ejemplo
    console.log('1. Creando cliente de ejemplo...');
    const cliente = await prisma.cliente.upsert({
      where: { codigo: 'TEST-001' },
      update: {},
      create: {
        codigo: 'TEST-001',
        nombre: 'Cliente de Prueba 5 Niveles',
        ruc: '901234567',
        correo: 'test@example.com',
        telefono: '3001234567',
        direccion: 'Calle 123 #45-67'
      }
    });
    console.log('✅ Cliente creado:', cliente.nombre);

    // 2. Crear comercial de ejemplo
    console.log('\n2. Creando comercial de ejemplo...');
    const comercial = await prisma.user.upsert({
      where: { email: 'comercial@test.com' },
      update: {},
      create: {
        name: 'Comercial Test',
        email: 'comercial@test.com',
        password: '$2a$10$hashedpasswordfortestuser', // Password hasheado para test
        role: 'comercial'
      }
    });
    console.log('✅ Comercial creado:', comercial.name);

    // 3. Crear cotización de ejemplo
    console.log('\n3. Creando cotización de ejemplo...');
    const cotizacion = await prisma.cotizacion.create({
      data: {
        cliente: { connect: { id: cliente.id } },
        comercial: { connect: { id: comercial.id } },
        codigo: `GYS-TEST-${Date.now()}`,
        numeroSecuencia: 1,
        nombre: 'Proyecto de Prueba 5 Niveles',
        notas: 'Cotización para validar jerarquía simplificada',
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-12-31'),
        estado: 'aprobada'
      }
    });
    console.log('✅ Cotización creada:', cotizacion.nombre);

    // 4. Crear proyecto desde cotización
    console.log('\n4. Creando proyecto desde cotización...');
    const proyecto = await prisma.proyecto.create({
      data: {
        cotizacion: { connect: { id: cotizacion.id } },
        cliente: { connect: { id: cliente.id } },
        comercial: { connect: { id: comercial.id } },
        gestor: { connect: { id: comercial.id } },
        codigo: `PRJ-TEST-${Date.now()}`,
        nombre: 'Proyecto de Prueba 5 Niveles',
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-12-31'),
        estado: 'en_planificacion'
      }
    });
    console.log('✅ Proyecto creado:', proyecto.nombre);

    // 5. Crear cronograma de planificación
    console.log('\n5. Creando cronograma de planificación...');
    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        proyectoId: proyecto.id,
        nombre: 'Cronograma de Planificación v1',
        tipo: 'planificacion'
      }
    });
    console.log('✅ Cronograma creado:', cronograma.nombre);

    // 6. Crear fases por defecto
    console.log('\n6. Creando fases por defecto...');
    const fases = await Promise.all([
      prisma.proyectoFase.create({
        data: {
          proyectoId: proyecto.id,
          proyectoCronogramaId: cronograma.id,
          nombre: 'Planificación',
          descripcion: 'Fase de planificación del proyecto',
          orden: 1,
          fechaInicioPlan: new Date('2025-01-01'),
          fechaFinPlan: new Date('2025-02-28'),
          estado: 'planificado'
        }
      }),
      prisma.proyectoFase.create({
        data: {
          proyectoId: proyecto.id,
          proyectoCronogramaId: cronograma.id,
          nombre: 'Ejecución',
          descripcion: 'Fase de ejecución del proyecto',
          orden: 2,
          fechaInicioPlan: new Date('2025-03-01'),
          fechaFinPlan: new Date('2025-11-30'),
          estado: 'planificado'
        }
      }),
      prisma.proyectoFase.create({
        data: {
          proyectoId: proyecto.id,
          proyectoCronogramaId: cronograma.id,
          nombre: 'Cierre',
          descripcion: 'Fase de cierre del proyecto',
          orden: 3,
          fechaInicioPlan: new Date('2025-12-01'),
          fechaFinPlan: new Date('2025-12-31'),
          estado: 'planificado'
        }
      })
    ]);
    console.log('✅ Fases creadas:', fases.map(f => f.nombre).join(', '));

    // 7. Crear EDTs en la fase de ejecución
    console.log('\n7. Creando EDTs en fase de ejecución...');
    const faseEjecucion = fases.find(f => f.nombre === 'Ejecución');
    const edts = await Promise.all([
      prisma.proyectoEdt.create({
        data: {
          proyectoId: proyecto.id,
          proyectoCronogramaId: cronograma.id,
          proyectoFaseId: faseEjecucion.id,
          nombre: 'Instalación Eléctrica',
          descripcion: 'EDT para instalación eléctrica completa',
          categoriaServicio: 'Eléctrica',
          fechaInicioPlan: new Date('2025-03-01'),
          fechaFinPlan: new Date('2025-06-30'),
          horasEstimadas: 500,
          estado: 'planificado',
          prioridad: 'alta'
        }
      }),
      prisma.proyectoEdt.create({
        data: {
          proyectoId: proyecto.id,
          proyectoCronogramaId: cronograma.id,
          proyectoFaseId: faseEjecucion.id,
          nombre: 'Montaje Estructural',
          descripcion: 'EDT para montaje de estructuras',
          categoriaServicio: 'Civil',
          fechaInicioPlan: new Date('2025-03-15'),
          fechaFinPlan: new Date('2025-08-15'),
          horasEstimadas: 300,
          estado: 'planificado',
          prioridad: 'media'
        }
      })
    ]);
    console.log('✅ EDTs creados:', edts.map(e => e.nombre).join(', '));

    // 8. Crear actividades directamente bajo EDTs (SIN ZONAS)
    console.log('\n8. Creando actividades directamente bajo EDTs...');
    const edtElectrica = edts.find(e => e.nombre === 'Instalación Eléctrica');
    const actividadesElectricas = await Promise.all([
      prisma.proyectoActividad.create({
        data: {
          proyectoEdtId: edtElectrica.id,
          proyectoCronogramaId: cronograma.id,
          nombre: 'Cableado Principal',
          descripcion: 'Instalación de cableado principal trifásico',
          fechaInicioPlan: new Date('2025-03-01'),
          fechaFinPlan: new Date('2025-04-15'),
          horasPlan: 200,
          estado: 'planificado',
          prioridad: 'alta'
        }
      }),
      prisma.proyectoActividad.create({
        data: {
          proyectoEdtId: edtElectrica.id,
          proyectoCronogramaId: cronograma.id,
          nombre: 'Iluminación Industrial',
          descripcion: 'Instalación de sistema de iluminación LED',
          fechaInicioPlan: new Date('2025-04-16'),
          fechaFinPlan: new Date('2025-05-30'),
          horasPlan: 150,
          estado: 'planificado',
          prioridad: 'media'
        }
      })
    ]);
    console.log('✅ Actividades eléctricas creadas:', actividadesElectricas.map(a => a.nombre).join(', '));

    // 9. Crear tareas bajo actividades
    console.log('\n9. Creando tareas bajo actividades...');
    const actividadCableado = actividadesElectricas.find(a => a.nombre === 'Cableado Principal');
    const tareasCableado = await Promise.all([
      prisma.proyectoTarea.create({
        data: {
          proyectoEdtId: edtElectrica.id,
          proyectoCronogramaId: cronograma.id,
          proyectoActividadId: actividadCableado.id,
          nombre: 'Tender cableado trifásico 200m',
          descripcion: 'Tendido de cable trifásico de 200 metros',
          fechaInicio: new Date('2025-03-01'),
          fechaFin: new Date('2025-03-10'),
          horasEstimadas: 80,
          estado: 'pendiente',
          prioridad: 'alta'
        }
      }),
      prisma.proyectoTarea.create({
        data: {
          proyectoEdtId: edtElectrica.id,
          proyectoCronogramaId: cronograma.id,
          proyectoActividadId: actividadCableado.id,
          nombre: 'Instalar cajas de distribución',
          descripcion: 'Instalación de 15 cajas de distribución',
          fechaInicio: new Date('2025-03-11'),
          fechaFin: new Date('2025-03-20'),
          horasEstimadas: 60,
          estado: 'pendiente',
          prioridad: 'media'
        }
      })
    ]);
    console.log('✅ Tareas de cableado creadas:', tareasCableado.map(t => t.nombre).join(', '));

    // 10. Verificar jerarquía completa
    console.log('\n10. Verificando jerarquía completa...');
    const proyectoCompleto = await prisma.proyecto.findUnique({
      where: { id: proyecto.id },
      include: {
        proyectoFases: {
          include: {
            proyectoEdts: {
              include: {
                proyectoActividades: {
                  include: {
                    proyectoTareas: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('\n📊 JERARQUÍA CREADA EXITOSAMENTE:');
    proyectoCompleto.proyectoFases.forEach(fase => {
      console.log(`📋 ${fase.nombre}`);
      fase.proyectoEdts.forEach(edt => {
        console.log(`  🔧 ${edt.nombre}`);
        edt.proyectoActividades.forEach(actividad => {
          console.log(`    ⚙️ ${actividad.nombre}`);
          actividad.proyectoTareas.forEach(tarea => {
            console.log(`      ✅ ${tarea.nombre}`);
          });
        });
      });
    });

    console.log('\n🎉 Proyecto de ejemplo creado exitosamente!');
    console.log('🏢 Proyecto → 📋 Fases → 🔧 EDTs → ⚙️ Actividades → ✅ Tareas');
    console.log('\n📈 Resumen:');
    console.log(`- ${proyectoCompleto.proyectoFases.length} fases`);
    console.log(`- ${proyectoCompleto.proyectoFases.reduce((acc, f) => acc + f.proyectoEdts.length, 0)} EDTs`);
    console.log(`- ${proyectoCompleto.proyectoFases.reduce((acc, f) => acc + f.proyectoEdts.reduce((acc2, e) => acc2 + e.proyectoActividades.length, 0), 0)} actividades`);
    console.log(`- ${proyectoCompleto.proyectoFases.reduce((acc, f) => acc + f.proyectoEdts.reduce((acc2, e) => acc2 + e.proyectoActividades.reduce((acc3, a) => acc3 + a.proyectoTareas.length, 0), 0), 0)} tareas`);

  } catch (error) {
    console.error('❌ Error creando proyecto de ejemplo:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

create5LevelsExample();