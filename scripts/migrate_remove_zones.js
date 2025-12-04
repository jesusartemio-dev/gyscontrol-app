const { PrismaClient } = require('@prisma/client');

async function migrateRemoveZones() {
  const prisma = new PrismaClient();

  console.log('🚀 Iniciando migración: Eliminación completa de zonas del sistema de cronograma');
  console.log('📅 Fecha:', new Date().toISOString());
  console.log('🎯 Objetivo: Convertir de 6 niveles a 5 niveles (Proyecto → Fases → EDTs → Actividades → Tareas)');
  console.log('');

  try {
    console.log('🔄 PASO 1: Creando backups de seguridad...');

    // Crear backup de proyecto_zonas
    console.log('   📦 Creando backup de proyecto_zonas...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS proyecto_zonas_backup AS
      SELECT * FROM proyecto_zonas;
    `;
    console.log('   ✅ Backup de proyecto_zonas creado');

    // Crear backup de proyecto_actividades
    console.log('   📦 Creando backup de proyecto_actividades...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS proyecto_actividades_backup AS
      SELECT * FROM proyecto_actividades;
    `;
    console.log('   ✅ Backup de proyecto_actividades creado');

    console.log('🔄 PASO 2: Reasignando actividades de zonas a EDTs padre...');

    // Contar actividades que necesitan reasignación
    const actividadesConZona = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM proyecto_actividades WHERE proyecto_zona_id IS NOT NULL;
    `;
    console.log(`   📊 Encontradas ${actividadesConZona[0].count} actividades con zona asignada`);

    // Reasignar actividades a sus EDTs padre
    await prisma.$executeRaw`
      UPDATE proyecto_actividades
      SET proyecto_edt_id = (
        SELECT pz.proyecto_edt_id
        FROM proyecto_zonas pz
        WHERE pz.id = proyecto_actividades.proyecto_zona_id
      )
      WHERE proyecto_zona_id IS NOT NULL;
    `;
    console.log('   ✅ Actividades reasignadas a EDTs padre');

    console.log('🔄 PASO 3: Verificando integridad de datos...');

    // Verificar que no hay actividades sin EDT
    const actividadesSinEdt = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM proyecto_actividades WHERE proyecto_edt_id IS NULL;
    `;
    console.log(`   📊 Actividades sin EDT asignado: ${actividadesSinEdt[0].count}`);

    if (actividadesSinEdt[0].count > 0) {
      throw new Error(`Hay ${actividadesSinEdt[0].count} actividades sin EDT asignado. No se puede continuar.`);
    }

    console.log('🔄 PASO 4: Hacer proyecto_edt_id obligatorio...');

    // Hacer proyecto_edt_id NOT NULL
    await prisma.$executeRaw`
      ALTER TABLE proyecto_actividades
      ALTER COLUMN proyecto_edt_id SET NOT NULL;
    `;
    console.log('   ✅ proyecto_edt_id ahora es obligatorio');

    console.log('🔄 PASO 5: Eliminando restricciones de zona...');

    // Eliminar foreign key constraint
    await prisma.$executeRaw`
      ALTER TABLE proyecto_actividades
      DROP CONSTRAINT IF EXISTS proyecto_actividades_proyecto_zona_id_fkey;
    `;
    console.log('   ✅ Foreign key constraint eliminada');

    console.log('🔄 PASO 6: Eliminando columna proyecto_zona_id...');

    // Eliminar columna proyecto_zona_id
    await prisma.$executeRaw`
      ALTER TABLE proyecto_actividades
      DROP COLUMN IF EXISTS proyecto_zona_id;
    `;
    console.log('   ✅ Columna proyecto_zona_id eliminada');

    console.log('🔄 PASO 7: Eliminando tabla proyecto_zonas...');

    // Eliminar tabla proyecto_zonas
    await prisma.$executeRaw`
      DROP TABLE IF EXISTS proyecto_zonas;
    `;
    console.log('   ✅ Tabla proyecto_zonas eliminada');

    console.log('');
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('');
    console.log('📊 RESUMEN DE CAMBIOS:');
    console.log('   ✅ Tabla proyecto_zonas eliminada');
    console.log('   ✅ Columna proyecto_zona_id eliminada de proyecto_actividades');
    console.log('   ✅ Actividades reasignadas directamente a EDTs');
    console.log('   ✅ proyecto_edt_id ahora obligatorio');
    console.log('   ✅ Backups creados para rollback si es necesario');
    console.log('');
    console.log('🏗️  NUEVA JERARQUÍA: Proyecto → Fases → EDTs → Actividades → Tareas');
    console.log('');
    console.log('⚠️  PRÓXIMOS PASOS RECOMENDADOS:');
    console.log('   1. Actualizar schema de Prisma (eliminar ProyectoZona)');
    console.log('   2. Regenerar cliente Prisma');
    console.log('   3. Eliminar componentes y APIs de zonas');
    console.log('   4. Actualizar tests');
    console.log('   5. Ejecutar verify_5_levels.js para confirmar');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR DURANTE LA MIGRACIÓN:');
    console.error(error.message);
    console.error('');
    console.error('🔄 Para hacer rollback, ejecutar:');
    console.error('   - Restaurar desde backups');
    console.error('   - Recrear tabla proyecto_zonas');
    console.error('   - Restaurar columna proyecto_zona_id');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateRemoveZones()
  .then(() => {
    console.log('');
    console.log('✅ Migración finalizada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Migración fallida');
    process.exit(1);
  });