const { PrismaClient } = require('@prisma/client');

async function checkCantidad() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'CatalogoServicio'
      AND column_name = 'cantidad';
    `;

    console.log('Resultado de la consulta:');
    console.log(result);

    if (result.length > 0) {
      console.log('✅ La columna "cantidad" existe en la tabla CatalogoServicio');
    } else {
      console.log('❌ La columna "cantidad" NO existe en la tabla CatalogoServicio');
    }

  } catch (error) {
    console.error('Error ejecutando la consulta:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCantidad();