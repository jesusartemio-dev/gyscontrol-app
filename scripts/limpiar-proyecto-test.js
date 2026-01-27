const { PrismaClient } = require('@prisma/client');

async function limpiarProyectoTest() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧹 Iniciando limpieza del proyecto de prueba...\n');
    
    // Buscar el proyecto de prueba
    const proyecto = await prisma.proyecto.findFirst({
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
    
    if (!proyecto) {
      console.log('❌ Proyecto PROJ-HORAS-TEST-001 no encontrado');
      return;
    }
    
    console.log(`✅ Proyecto encontrado: ${proyecto.nombre}`);
    console.log(`   ID: ${proyecto.id}\n`);
    
    // Eliminar en orden correcto (debido a foreign keys)
    console.log('🗑️ Eliminando dependencias...');
    
    // 1. Eliminar registros de horas
    const registrosEliminados = await prisma.registroHoras.deleteMany({
      where: { proyectoId: proyecto.id }
    });
    console.log(`   ✅ Registros de horas eliminados: ${registrosEliminados.count}`);
    
    // 2. Eliminar servicios del proyecto
    const serviciosEliminados = await prisma.proyectoServicioCotizado.deleteMany({
      where: { proyectoId: proyecto.id }
    });
    console.log(`   ✅ Servicios eliminados: ${serviciosEliminados.count}`);
    
    // 3. Eliminar equipos del proyecto
    const equiposEliminados = await prisma.proyectoEquipoCotizado.deleteMany({
      where: { proyectoId: proyecto.id }
    });
    console.log(`   ✅ Equipos eliminados: ${equiposEliminados.count}`);
    
    // 4. Eliminar pedidos
    const pedidosEliminados = await prisma.pedidoEquipo.deleteMany({
      where: { proyectoId: proyecto.id }
    });
    console.log(`   ✅ Pedidos eliminados: ${pedidosEliminados.count}`);
    
    // 5. Eliminar tareas del proyecto
    const tareasEliminadas = await prisma.proyectoTarea.deleteMany({
      where: {
        proyectoEdt: {
          proyectoId: proyecto.id
        }
      }
    });
    console.log(`   ✅ Tareas eliminadas: ${tareasEliminadas.count}`);
    
    // 6. Eliminar EDTs (que incluyen sus actividades y tareas)
    const edtsEliminados = await prisma.proyectoEdt.deleteMany({
      where: { proyectoId: proyecto.id }
    });
    console.log(`   ✅ EDTs eliminados: ${edtsEliminados.count}`);
    
    // 7. Eliminar cronograma
    const cronogramasEliminados = await prisma.proyectoCronograma.deleteMany({
      where: { proyectoId: proyecto.id }
    });
    console.log(`   ✅ Cronogramas eliminados: ${cronogramasEliminados.count}`);
    
    // 9. Finalmente, eliminar el proyecto
    await prisma.proyecto.delete({
      where: { id: proyecto.id }
    });
    console.log(`   ✅ Proyecto eliminado: ${proyecto.codigo}`);
    
    console.log('\n🎉 Limpieza completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - Proyecto: ${proyecto.codigo}`);
    console.log(`   - Dependencias eliminadas: ${registrosEliminados.count + serviciosEliminados.count + equiposEliminados.count + pedidosEliminados.count + tareasEliminadas.count + edtsEliminados.count + cronogramasEliminados.count}`);
    console.log('\n✅ Ahora solo debería aparecer tu proyecto MOL40 en http://localhost:3000/proyectos');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

limpiarProyectoTest();