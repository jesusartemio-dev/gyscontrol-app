/**
 * Script para crear datos de prueba de órdenes de compra
 * Ejecutar con: npx tsx scripts/create-orden-compra-test.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Verificando proveedores existentes...');
    
    // Verificar si existe un proveedor
    let proveedor = await prisma.proveedor.findFirst();
    
    if (!proveedor) {
      console.log('📦 Creando proveedor de prueba...');
      proveedor = await prisma.proveedor.create({
        data: {
          nombre: 'Proveedor Test S.A.C.',
          ruc: '20123456789'
        }
      });
      console.log('✅ Proveedor creado:', proveedor.nombre);
    } else {
      console.log('✅ Proveedor encontrado:', proveedor.nombre);
    }

    // Buscar usuario admin existente
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.log('❌ No se encontró usuario admin. Ejecuta primero create-test-user.ts');
      return;
    }
    
    console.log('✅ Usuario admin encontrado:', adminUser.email);

    // Crear órdenes de compra de prueba
    console.log('📋 Creando órdenes de compra de prueba...');
    
    const ordenesData = [
      {
        numero: 'OC-2024-001',
        proveedorId: proveedor.id,
        estado: 'BORRADOR' as const,
        prioridad: 'NORMAL' as const,
        fechaRequerida: new Date('2024-02-15'),
        montoTotal: 1500.00,
        moneda: 'PEN',
        terminosEntrega: 'FOB Lima',
        condicionesPago: 'Contado',
        observaciones: 'Orden de compra de prueba 1',
        creadoPorId: adminUser.id
      },
      {
        numero: 'OC-2024-002',
        proveedorId: proveedor.id,
        estado: 'ENVIADA' as const,
        prioridad: 'ALTA' as const,
        fechaRequerida: new Date('2024-02-20'),
        montoTotal: 2800.50,
        moneda: 'PEN',
        terminosEntrega: 'EXW Almacén',
        condicionesPago: 'Crédito 30 días',
        observaciones: 'Orden de compra de prueba 2',
        creadoPorId: adminUser.id
      },
      {
        numero: 'OC-2024-003',
        proveedorId: proveedor.id,
        estado: 'APROBADA' as const,
        prioridad: 'URGENTE' as const,
        fechaRequerida: new Date('2024-02-10'),
        montoTotal: 950.75,
        moneda: 'USD',
        terminosEntrega: 'CIF Callao',
        condicionesPago: 'Transferencia',
        observaciones: 'Orden de compra urgente',
        creadoPorId: adminUser.id
      }
    ];

    for (const ordenData of ordenesData) {
      // Verificar si ya existe
      const existingOrden = await prisma.ordenCompra.findUnique({
        where: { numero: ordenData.numero }
      });

      if (!existingOrden) {
        const orden = await prisma.ordenCompra.create({
          data: ordenData
        });
        console.log(`✅ Orden creada: ${orden.numero} - ${orden.montoTotal} ${orden.moneda}`);
        
        // Crear producto de prueba si no existe
        const producto = await prisma.producto.upsert({
          where: { codigo: 'PROD-TEST-SCRIPT' },
          update: {},
          create: {
            codigo: 'PROD-TEST-SCRIPT',
            nombre: 'Producto Test Script',
            categoria: 'EQUIPOS',
            unidadMedida: 'UNIDAD',
            precioReferencia: 1000.00,
            moneda: 'PEN'
          }
        });

        // Crear algunos items para la orden
        await prisma.ordenCompraItem.createMany({
          data: [
            {
              ordenCompraId: orden.id,
              productoId: producto.id,
              cantidad: 10,
              precioUnitario: Number(orden.montoTotal) / 2,
              subtotal: Number(orden.montoTotal) / 2,
              especificaciones: 'Item de prueba 1'
            },
            {
              ordenCompraId: orden.id,
              productoId: producto.id,
              cantidad: 5,
              precioUnitario: Number(orden.montoTotal) / 2,
              subtotal: Number(orden.montoTotal) / 2,
              especificaciones: 'Item de prueba 2'
            }
          ]
        });
        console.log(`  📦 Items creados para ${orden.numero}`);
      } else {
        console.log(`⚠️  Orden ya existe: ${ordenData.numero}`);
      }
    }

    console.log('\n🎉 Datos de prueba creados exitosamente!');
    console.log('📊 Resumen:');
    
    const totalOrdenes = await prisma.ordenCompra.count();
    const totalItems = await prisma.ordenCompraItem.count();
    
    console.log(`   - Órdenes de compra: ${totalOrdenes}`);
    console.log(`   - Items de órdenes: ${totalItems}`);
    console.log(`   - Proveedores: ${await prisma.proveedor.count()}`);
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });