const { PrismaClient } = require('@prisma/client');

async function checkTablesSimple() {
  const prisma = new PrismaClient();

  try {
    console.log('Verificando tablas con consulta SQL directa...');

    // Consulta SQL directa para verificar tablas
    const result = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('CalendarioLaboral', 'DiaCalendario', 'ExcepcionCalendario', 'ConfiguracionCalendario')
      ORDER BY tablename
    `;

    console.log('Tablas encontradas:');
    result.forEach(row => {
      console.log(`- ${row.tablename} (owner: ${row.tableowner})`);
    });

    if (result.length === 0) {
      console.log('❌ Ninguna tabla de calendario encontrada');
    } else {
      console.log(`✅ ${result.length} tablas de calendario encontradas`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTablesSimple();