const { PrismaClient } = require('@prisma/client');

async function checkTables() {
  const prisma = new PrismaClient();

  try {
    console.log('Verificando tablas de calendario...');

    // Verificar CalendarioLaboral
    try {
      const calendarioCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "CalendarioLaboral"`;
      console.log('CalendarioLaboral:', calendarioCount[0].count, 'registros');
    } catch (error) {
      console.log('CalendarioLaboral: Tabla no existe o error:', error.message);
    }

    // Verificar DiaCalendario
    try {
      const diaCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "DiaCalendario"`;
      console.log('DiaCalendario:', diaCount[0].count, 'registros');
    } catch (error) {
      console.log('DiaCalendario: Tabla no existe o error:', error.message);
    }

    // Verificar ExcepcionCalendario
    try {
      const excepcionCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ExcepcionCalendario"`;
      console.log('ExcepcionCalendario:', excepcionCount[0].count, 'registros');
    } catch (error) {
      console.log('ExcepcionCalendario: Tabla no existe o error:', error.message);
    }

    // Verificar ConfiguracionCalendario
    try {
      const configCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ConfiguracionCalendario"`;
      console.log('ConfiguracionCalendario:', configCount[0].count, 'registros');
    } catch (error) {
      console.log('ConfiguracionCalendario: Tabla no existe o error:', error.message);
    }

  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();