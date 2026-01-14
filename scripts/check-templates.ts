import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    console.log('🔍 Verificando plantillas en la base de datos...\n');

    // Check independent equipment templates
    const equipmentTemplates = await prisma.plantilla_equipo_independiente.findMany({
      select: { id: true, nombre: true, createdAt: true }
    });

    console.log('📦 Plantillas de Equipos Independientes:');
    if (equipmentTemplates.length === 0) {
      console.log('   No hay plantillas de equipos');
    } else {
      equipmentTemplates.forEach(template => {
        console.log(`   - ${template.id}: ${template.nombre} (${template.createdAt})`);
      });
    }

    // Check independent service templates
    const serviceTemplates = await prisma.plantilla_servicio_independiente.findMany({
      select: { id: true, nombre: true, createdAt: true }
    });

    console.log('\n🔧 Plantillas de Servicios Independientes:');
    if (serviceTemplates.length === 0) {
      console.log('   No hay plantillas de servicios');
    } else {
      serviceTemplates.forEach(template => {
        console.log(`   - ${template.id}: ${template.nombre} (${template.createdAt})`);
      });
    }

    // Check independent expense templates
    const expenseTemplates = await prisma.plantilla_gasto_independiente.findMany({
      select: { id: true, nombre: true, createdAt: true }
    });

    console.log('\n💰 Plantillas de Gastos Independientes:');
    if (expenseTemplates.length === 0) {
      console.log('   No hay plantillas de gastos');
    } else {
      expenseTemplates.forEach(template => {
        console.log(`   - ${template.id}: ${template.nombre} (${template.createdAt})`);
      });
    }

    // Check complete templates
    // NOTE: 'plantilla' model does not exist in current schema
    // const completeTemplates = await prisma.plantilla.findMany({
    //   select: { id: true, nombre: true, tipo: true, createdAt: true }
    // });

    console.log('\n📋 Plantillas Completas:');
    console.log('   Model "plantilla" no existe en el schema actual - omitiendo verificación');
    // if (completeTemplates.length === 0) {
    //   console.log('   No hay plantillas completas');
    // } else {
    //   completeTemplates.forEach(template => {
    //     console.log(`   - ${template.id}: ${template.nombre} (${template.tipo}) (${template.createdAt})`);
    //   });
    // }

  } catch (error) {
    console.error('❌ Error al verificar plantillas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();