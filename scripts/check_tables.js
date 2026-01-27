const { PrismaClient } = require('@prisma/client');

async function checkTables() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando tablas existentes en la base de datos...\n');

    // Listar todas las tablas
    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('📋 Tablas encontradas:');
    tables.forEach(table => {
      console.log(`   - ${table.tablename}`);
    });

    console.log('\n🔍 Buscando tablas relacionadas con zonas...\n');

    // Buscar tablas con "zona" en el nombre
    const zonaTables = tables.filter(table =>
      table.tablename.toLowerCase().includes('zona')
    );

    if (zonaTables.length > 0) {
      console.log('📍 Tablas con "zona" en el nombre:');
      zonaTables.forEach(table => {
        console.log(`   - ${table.tablename}`);
      });
    } else {
      console.log('✅ No se encontraron tablas con "zona" en el nombre');
    }

    // Verificar si existe proyecto_zonas específicamente
    const proyectoZonasExists = tables.some(table => table.tablename === 'proyecto_zonas');
    console.log(`\n📊 proyecto_zonas existe: ${proyectoZonasExists ? 'SÍ' : 'NO'}`);

    // Verificar estructura de proyecto_actividades
    console.log('\n🔍 Verificando estructura de proyecto_actividades...');
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'proyecto_actividades'
        ORDER BY ordinal_position
      `;

      console.log('📋 Columnas de proyecto_actividades:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      });

      const hasZonaId = columns.some(col => col.column_name === 'proyecto_zona_id');
      console.log(`\n📊 proyecto_zona_id existe: ${hasZonaId ? 'SÍ' : 'NO'}`);

    } catch (error) {
      console.log('❌ Error obteniendo estructura de proyecto_actividades:', error.message);
    }

  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();