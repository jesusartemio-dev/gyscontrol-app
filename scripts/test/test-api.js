const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPedidosQuery() {
  try {
    console.log('🔍 Probando consulta directa de pedidos...');
    
    // Consulta similar a la de la API
    const pedidos = await prisma.pedidoEquipo.findMany({
      include: {
        lista: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true,
            fechaNecesaria: true,
            proyecto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                comercial: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                gestor: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            items: {
              select: {
                id: true,
                cantidad: true,
                precioElegido: true
              }
            }
          }
        },
        items: {
          select: {
            id: true,
            cantidadPedida: true,
            precioUnitario: true,
            listaEquipoItemId: true
          }
        }
      }
    });
    
    console.log(`📊 Total de pedidos encontrados: ${pedidos.length}`);
    
    if (pedidos.length > 0) {
      console.log('\n📋 Pedidos encontrados:');
      pedidos.forEach((pedido, index) => {
        console.log(`\n${index + 1}. Pedido: ${pedido.codigo}`);
        console.log(`   Estado: ${pedido.estado}`);
        console.log(`   Lista: ${pedido.lista?.codigo} - ${pedido.lista?.nombre}`);
        console.log(`   Proyecto: ${pedido.lista?.proyecto?.codigo} - ${pedido.lista?.proyecto?.nombre}`);
        console.log(`   Items: ${pedido.items?.length || 0}`);
        
        if (pedido.items && pedido.items.length > 0) {
          console.log('   Detalles de items:');
          pedido.items.forEach((item, i) => {
            console.log(`     ${i + 1}. Cantidad: ${item.cantidadPedida}, Precio: ${item.precioUnitario}`);
          });
        }
      });
    } else {
      console.log('❌ No se encontraron pedidos.');
      
      // Verificar si hay listas
      const totalListas = await prisma.listaEquipo.count();
      console.log(`📋 Total de listas: ${totalListas}`);
      
      if (totalListas > 0) {
        const listas = await prisma.listaEquipo.findMany({
          take: 3,
          include: {
            proyecto: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        });
        
        console.log('\n📋 Listas disponibles:');
        listas.forEach((lista, index) => {
          console.log(`${index + 1}. ${lista.codigo} - ${lista.nombre} (Proyecto: ${lista.proyecto?.codigo})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error en la consulta:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPedidosQuery();