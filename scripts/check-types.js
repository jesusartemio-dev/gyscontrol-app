const { PrismaClient } = require('@prisma/client');

async function checkTypes() {
  const prisma = new PrismaClient();

  try {
    console.log('Verificando tipos y tablas...');

    // Verificar tipos
    const typesResult = await prisma.$queryRaw`
      SELECT
        n.nspname as schema,
        t.typname as type_name,
        t.typtype as type_type
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      AND t.typname IN ('DiaSemana', 'TipoExcepcion')
      ORDER BY t.typname
    `;

    console.log('Tipos encontrados:');
    typesResult.forEach(row => {
      console.log(`- ${row.type_name} (${row.type_type})`);
    });

    // Verificar tablas
    const tablesResult = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename LIKE '%Calendario%'
      ORDER BY tablename
    `;

    console.log('Tablas encontradas:');
    tablesResult.forEach(row => {
      console.log(`- ${row.tablename} (owner: ${row.tableowner})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTypes();