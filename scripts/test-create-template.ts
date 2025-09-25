import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCreateTemplate() {
  try {
    console.log('🧪 Creando plantilla de equipos independiente...');

    const nueva = await prisma.plantillaEquipoIndependiente.create({
      data: {
        nombre: 'Plantilla de Equipos de Prueba',
        estado: 'borrador',
        totalInterno: 0,
        totalCliente: 0,
      },
    });

    console.log('✅ Plantilla creada:', nueva);

    // Verificar que se creó
    const plantillas = await prisma.plantillaEquipoIndependiente.findMany({
      select: { id: true, nombre: true, createdAt: true }
    });

    console.log('📦 Plantillas de equipos existentes:');
    plantillas.forEach(template => {
      console.log(`   - ${template.id}: ${template.nombre} (${template.createdAt})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateTemplate();