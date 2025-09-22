const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateClientCodes() {
  try {
    console.log('🔄 Iniciando población de códigos de cliente...');

    // Obtener todos los clientes sin código
    const clientesSinCodigo = await prisma.cliente.findMany({
      where: {
        codigo: null
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Encontrados ${clientesSinCodigo.length} clientes sin código`);

    let updatedCount = 0;

    for (const cliente of clientesSinCodigo) {
      // Generar código basado en el nombre
      const baseName = cliente.nombre
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') // Solo letras y números
        .substring(0, 3); // Primeros 3 caracteres

      let codigo = baseName;
      let counter = 1;

      // Verificar si el código ya existe
      while (await prisma.cliente.findUnique({ where: { codigo } })) {
        codigo = `${baseName}${counter}`;
        counter++;
      }

      // Actualizar el cliente
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          codigo: codigo,
          numeroSecuencia: 1 // Inicializar en 1
        }
      });

      updatedCount++;
      console.log(`✅ Cliente ${cliente.nombre} -> Código: ${codigo}`);
    }

    console.log(`🎉 Proceso completado. ${updatedCount} clientes actualizados.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateClientCodes();