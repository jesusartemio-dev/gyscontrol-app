const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreateCronograma() {
  try {
    console.log('🧪 Testing creation of ProyectoCronograma...');

    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        proyectoId: 'cmfwlrnp30001l8j0ioz97ka6',
        tipo: 'planificacion',
        nombre: 'Test Cronograma Planificación',
        esBaseline: false,
        version: 1
      }
    });

    console.log('✅ Cronograma creado exitosamente:', cronograma);

  } catch (error) {
    console.error('❌ Error creando cronograma:', error);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateCronograma();