const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPedidos() {
  try {
    console.log('🔍 Verificando pedidos en la base de datos...');
    
    // Contar pedidos totales
    const totalPedidos = await prisma.pedidoEquipo.count();
    console.log(`📊 Total de pedidos: ${totalPedidos}`);
    
    if (totalPedidos > 0) {
      // Obtener algunos pedidos de ejemplo
      const pedidos = await prisma.pedidoEquipo.findMany({
        take: 5,
        include: {
          proyecto: {
            select: {
              codigo: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              name: true,
              email: true
            }
          },
          items: {
            take: 2,
            select: {
              cantidadPedida: true,
              precioUnitario: true,
              listaEquipoItem: {
                select: {
                  codigo: true,
                  descripcion: true
                }
              }
            }
          }
        }
      });
      
      console.log('\n📋 Pedidos encontrados:');
      pedidos.forEach((pedido, index) => {
        console.log(`\n${index + 1}. Pedido: ${pedido.codigo}`);
        console.log(`   Estado: ${pedido.estado}`);
        console.log(`   Proyecto: ${pedido.proyecto?.codigo} - ${pedido.proyecto?.nombre}`);
        console.log(`   Responsable: ${pedido.responsable?.name}`);
        console.log(`   Items: ${pedido.items.length}`);
        if (pedido.items.length > 0) {
          pedido.items.forEach((item, i) => {
            console.log(`     ${i + 1}. ${item.listaEquipoItem?.codigo} - ${item.listaEquipoItem?.descripcion}`);
            console.log(`        Cantidad: ${item.cantidadPedida}, Precio: ${item.precioUnitario}`);
          });
        }
      });
    } else {
      console.log('❌ No se encontraron pedidos en la base de datos.');
      console.log('\n💡 Posibles causas:');
      console.log('   1. No se han creado pedidos aún');
      console.log('   2. El seed no incluye datos de pedidos');
      console.log('   3. Hay un problema con la consulta');
      
      // Verificar si hay listas de equipos
      const totalListas = await prisma.listaEquipo.count();
      console.log(`\n📋 Total de listas de equipos: ${totalListas}`);
      
      if (totalListas > 0) {
        console.log('✅ Hay listas disponibles para crear pedidos');
      } else {
        console.log('❌ No hay listas de equipos disponibles');
      }
    }
    
  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPedidos();