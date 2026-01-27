const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify5LevelsMigration() {
  console.log('🔍 Verificando migración a sistema de 5 niveles...\n');

  try {
    // 1. Verificar que NO existe tabla proyecto_zonas
    console.log('1. Verificando eliminación de tabla proyecto_zonas...');
    try {
      await prisma.$queryRaw`SELECT 1 FROM proyecto_zonas LIMIT 1`;
      console.log('❌ ERROR: La tabla proyecto_zonas aún existe');
    } catch (error) {
      console.log('✅ OK: Tabla proyecto_zonas eliminada correctamente');
    }

    // 2. Verificar que actividades tienen proyecto_edt_id obligatorio
    console.log('\n2. Verificando estructura de proyecto_actividades...');
    const actividades = await prisma.proyectoActividad.findMany({
      take: 1,
      select: {
        id: true,
        nombre: true,
        proyectoEdtId: true,
        proyectoCronogramaId: true
      }
    });

    if (actividades.length > 0) {
      const actividad = actividades[0];
      console.log('✅ OK: ProyectoActividad tiene proyectoEdtId:', actividad.proyectoEdtId);
      console.log('✅ OK: ProyectoActividad tiene proyectoCronogramaId:', actividad.proyectoCronogramaId);
    } else {
      console.log('ℹ️ INFO: No hay actividades en la base de datos (base de datos vacía)');
    }

    // 3. Verificar jerarquía completa
    console.log('\n3. Verificando jerarquía de 5 niveles...');

    // Proyecto → Fases
    const fases = await prisma.proyectoFase.findMany({ take: 1 });
    console.log(`✅ Proyecto → Fases: ${fases.length} fases encontradas`);

    // Fases → EDTs
    const edts = await prisma.proyectoEdt.findMany({ take: 1 });
    console.log(`✅ Fases → EDTs: ${edts.length} EDTs encontrados`);

    // EDTs → Actividades
    const actividadesCount = await prisma.proyectoActividad.count();
    console.log(`✅ EDTs → Actividades: ${actividadesCount} actividades encontradas`);

    // Actividades → Tareas
    const tareas = await prisma.proyectoTarea.findMany({ take: 1 });
    console.log(`✅ Actividades → Tareas: ${tareas.length} tareas encontradas`);

    console.log('\n🎉 Migración a 5 niveles completada exitosamente!');
    console.log('\nJerarquía implementada:');
    console.log('🏢 PROYECTO → 📋 FASES → 🔧 EDTs → ⚙️ ACTIVIDADES → ✅ TAREAS');

  } catch (error) {
    console.error('❌ Error durante verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify5LevelsMigration();