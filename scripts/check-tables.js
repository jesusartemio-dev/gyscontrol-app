const { PrismaClient } = require('@prisma/client');

async function checkTables() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando tablas existentes...');

    // Verificar si podemos hacer una consulta básica
    const result = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'Proyecto%' ORDER BY tablename`;

    console.log('📋 Tablas encontradas:', result);

    // Intentar una consulta simple a Proyecto
    try {
      const proyectos = await prisma.proyecto.findMany({ take: 1 });
      console.log('✅ Tabla Proyecto existe, registros encontrados:', proyectos.length);
    } catch (error) {
      console.log('❌ Error consultando tabla Proyecto:', error.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();