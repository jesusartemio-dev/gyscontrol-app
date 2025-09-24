const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCronogramas() {
  try {
    console.log('🔍 Buscando cronogramas para proyecto: cmfwlrnp30001l8j0ioz97ka6');

    const cronogramas = await prisma.proyectoCronograma.findMany({
      where: { proyectoId: 'cmfwlrnp30001l8j0ioz97ka6' }
    });

    console.log('📊 Cronogramas encontrados:', cronogramas.length);
    cronogramas.forEach(c => {
      console.log('  - ID:', c.id, 'Tipo:', c.tipo, 'Nombre:', c.nombre);
    });

    // También verificar si el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: 'cmfwlrnp30001l8j0ioz97ka6' },
      select: { id: true, nombre: true, cotizacionId: true }
    });

    console.log('🏗️ Proyecto encontrado:', proyecto);

    if (proyecto?.cotizacionId) {
      console.log('🔗 Cotización ID:', proyecto.cotizacionId);

      // Verificar si la cotización tiene cronograma
      const cotizacionCronograma = await prisma.cotizacionEdt.findMany({
        where: { cotizacionId: proyecto.cotizacionId }
      });

      console.log('📅 EDTs en cotización:', cotizacionCronograma.length);
      if (cotizacionCronograma.length > 0) {
        console.log('Primeros EDTs:');
        cotizacionCronograma.slice(0, 3).forEach(edt => {
          console.log('  -', edt.nombre, '(Servicio:', edt.cotizacionServicioId, ')');
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCronogramas();