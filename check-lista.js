const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLista() {
  try {
    const listaId = 'cmeuo0cqg00b1l8kg6v81ath4';
    
    console.log(`Buscando lista con ID: ${listaId}`);
    
    const lista = await prisma.listaEquipo.findUnique({
      where: { id: listaId },
      include: {
        proyecto: true,
        responsable: true,
        items: {
          take: 5 // Solo los primeros 5 items para verificar
        }
      }
    });
    
    if (lista) {
      console.log('✅ Lista encontrada:');
      console.log(`- ID: ${lista.id}`);
      console.log(`- Código: ${lista.codigo}`);
      console.log(`- Nombre: ${lista.nombre}`);
      console.log(`- Estado: ${lista.estado}`);
      console.log(`- Proyecto: ${lista.proyecto.nombre}`);
      console.log(`- Responsable: ${lista.responsable.name}`);
      console.log(`- Items: ${lista.items.length}`);
    } else {
      console.log('❌ Lista NO encontrada');
      
      // Buscar listas similares
      const listasProyecto = await prisma.listaEquipo.findMany({
        where: {
          proyectoId: 'cmeunybou00arl8kgusua3est' // El proyecto del URL
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          estado: true
        }
      });
      
      console.log(`\nListas del proyecto (${listasProyecto.length}):`);
      listasProyecto.forEach(l => {
        console.log(`- ${l.id} | ${l.codigo} | ${l.nombre} | ${l.estado}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLista();