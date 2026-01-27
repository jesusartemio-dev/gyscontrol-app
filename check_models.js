const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModels() {
  try {
    console.log('Modelos disponibles que empiezan con "cotizacion":');
    const models = Object.keys(prisma).filter(k => k.toLowerCase().startsWith('cotizacion'));
    console.log(models.join(', '));

    console.log('\nVerificando si existe cotizacionEdt:');
    console.log('cotizacionEdt existe:', typeof prisma.cotizacionEdt !== 'undefined');

    if (prisma.cotizacionEdt) {
      console.log('Métodos disponibles en cotizacionEdt:', Object.keys(prisma.cotizacionEdt));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkModels();