const { PrismaClient } = require('@prisma/client');

async function debugProyectos() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando proyectos en la base de datos...\n');
    
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        clienteId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📋 Total de proyectos encontrados: ${proyectos.length}`);
    console.log('\n📋 Lista de proyectos:');
    
    proyectos.forEach((proj, index) => {
      console.log(`${index + 1}. ${proj.codigo}`);
      console.log(`   Nombre: ${proj.nombre}`);
      console.log(`   Estado: ${proj.estado}`);
      console.log(`   Cliente ID: ${proj.clienteId}`);
      console.log(`   Creado: ${proj.createdAt}`);
      console.log('');
    });
    
    // Buscar específicamente PROJ-HORAS-TEST-001
    const projTest = await prisma.proyecto.findFirst({
      where: { codigo: 'PROJ-HORAS-TEST-001' },
      include: {
        proyectoEdts: true,
        registrosHoras: true,
        servicios: true,
        equipos: true,
        pedidos: true,
        cronogramas: true
      }
    });
    
    if (projTest) {
      console.log('✅ PROJ-HORAS-TEST-001 ENCONTRADO:');
      console.log(`   ID: ${projTest.id}`);
      console.log(`   Nombre: ${projTest.nombre}`);
      console.log(`   Estado: ${projTest.estado}`);
      console.log('\n🔗 Dependencias que impiden eliminación:');
      console.log(`   - EDTs: ${projTest.proyectoEdts.length}`);
      console.log(`   - Registros de horas: ${projTest.registrosHoras.length}`);
      console.log(`   - Servicios: ${projTest.servicios.length}`);
      console.log(`   - Equipos: ${projTest.equipos.length}`);
      console.log(`   - Pedidos: ${projTest.pedidos.length}`);
      console.log(`   - Cronogramas: ${projTest.cronogramas.length}`);
      
      if (projTest.proyectoEdts.length > 0) {
        console.log('\n📋 EDTs del proyecto:');
        projTest.proyectoEdts.forEach((edt, i) => {
          console.log(`   ${i + 1}. ${edt.nombre} (Horas plan: ${edt.horasPlan})`);
        });
      }
      
    } else {
      console.log('❌ PROJ-HORAS-TEST-001 NO ENCONTRADO');
      console.log('   Esto significa que puede haber sido eliminado ya');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugProyectos();