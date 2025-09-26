import { PrismaClient } from '@prisma/client';
import { logger } from '../src/lib/logger';

const prisma = new PrismaClient();

async function migrateToEdt() {
  logger.info('🚀 Iniciando migración a sistema EDT...');
  
  try {
    // ✅ 1. Actualizar estados de proyectos existentes
    logger.info('📝 Actualizando estados de proyectos...');
    await prisma.proyecto.updateMany({
      where: { estado: 'en_planificacion' },
      data: { estado: 'en_planificacion' }
    });
    
    await prisma.proyecto.updateMany({
      where: { estado: 'en_ejecucion' },
      data: { estado: 'en_ejecucion' }
    });
    
    await prisma.proyecto.updateMany({
      where: { estado: 'completado' },
      data: { estado: 'completado' }
    });
    
    // ✅ 2. Crear EDT básicos para proyectos existentes
    logger.info('🏗️ Creando EDT básicos...');
    const proyectos = await prisma.proyecto.findMany();

    const edtCreados = new Map<string, string>();

    // Obtener primera categoría disponible
    const primeraCategoria = await prisma.categoriaServicio.findFirst();

    if (!primeraCategoria) {
      logger.info('⚠️ No hay categorías de servicio disponibles, creando una por defecto...');
      const categoriaDefault = await prisma.categoriaServicio.create({
        data: {
          nombre: "General",
        }
      });

      for (const proyecto of proyectos) {
        // Crear ProyectoCronograma primero
        const cronograma = await prisma.proyectoCronograma.create({
          data: {
            proyectoId: proyecto.id,
            tipo: 'ejecucion',
            nombre: 'Cronograma de Ejecución',
          }
        });

        const edt = await prisma.proyectoEdt.create({
          data: {
            proyectoId: proyecto.id,
            proyectoCronogramaId: cronograma.id,
            nombre: `EDT ${categoriaDefault.nombre}`,
            categoriaServicioId: categoriaDefault.id,
            zona: null,
            estado: 'en_progreso',
            horasReales: 0,
            descripcion: `EDT generado para proyecto ${proyecto.nombre}`,
            prioridad: 'media'
          }
        });

        edtCreados.set(`${proyecto.id}-${categoriaDefault.id}`, edt.id);
        logger.info(`✅ EDT creado: ${edt.id} para proyecto ${proyecto.nombre}`);
      }
    } else {
      for (const proyecto of proyectos) {
        // Crear ProyectoCronograma primero
        const cronograma = await prisma.proyectoCronograma.create({
          data: {
            proyectoId: proyecto.id,
            tipo: 'ejecucion',
            nombre: 'Cronograma de Ejecución',
          }
        });

        const edt = await prisma.proyectoEdt.create({
          data: {
            proyectoId: proyecto.id,
            proyectoCronogramaId: cronograma.id,
            nombre: `EDT ${primeraCategoria.nombre}`,
            categoriaServicioId: primeraCategoria.id,
            zona: null,
            estado: 'en_progreso',
            horasReales: 0,
            descripcion: `EDT generado para proyecto ${proyecto.nombre}`,
            prioridad: 'media'
          }
        });

        edtCreados.set(`${proyecto.id}-${primeraCategoria.id}`, edt.id);
        logger.info(`✅ EDT creado: ${edt.id} para proyecto ${proyecto.nombre}`);
      }
    }
    
    // ✅ 3. Vincular RegistroHoras existentes a EDT
    logger.info('🔗 Vinculando RegistroHoras a EDT...');
    const registros = await prisma.registroHoras.findMany();
    
    let registrosActualizados = 0;
    
    for (const registro of registros) {
      // Buscar EDT correspondiente al proyecto
      const edt = await prisma.proyectoEdt.findFirst({
        where: {
          proyectoId: registro.proyectoId
        }
      });
      
      if (edt) {
        await prisma.registroHoras.update({
          where: { id: registro.id },
          data: { 
            proyectoEdtId: edt.id,
            categoriaServicioId: edt.categoriaServicioId,
            origen: 'oficina' // valor por defecto
          }
        });
        registrosActualizados++;
      }
    }
    
    logger.info(`✅ ${registrosActualizados} registros de horas vinculados`);
    
    // ✅ 4. Actualizar horasReales en EDT
    logger.info('🔄 Calculando horas reales por EDT...');
    await prisma.$executeRaw`
      UPDATE "proyecto_edt" 
      SET "horasReales" = (
        SELECT COALESCE(SUM("horasTrabajadas"), 0)
        FROM "RegistroHoras" 
        WHERE "proyectoEdtId" = "proyecto_edt"."id"
      )
    `;
    
    // ✅ 5. Actualizar porcentajes de avance básicos
    logger.info('📊 Calculando porcentajes de avance...');
    const edts = await prisma.proyectoEdt.findMany();
    
    for (const edt of edts) {
      let porcentaje = 0;
      
      if (edt.horasPlan && Number(edt.horasPlan) > 0) {
        porcentaje = Math.min(100, Math.round((Number(edt.horasReales) / Number(edt.horasPlan)) * 100));
      } else if (edt.horasReales && Number(edt.horasReales) > 0) {
        porcentaje = 25; // Si hay horas reales pero no plan, asumir 25%
      }
      
      await prisma.proyectoEdt.update({
        where: { id: edt.id },
        data: { porcentajeAvance: porcentaje }
      });
    }
    
    logger.info('🎉 Migración completada exitosamente');
    
  } catch (error) {
    logger.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  migrateToEdt()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

export { migrateToEdt };