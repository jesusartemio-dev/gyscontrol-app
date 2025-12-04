const { PrismaClient } = require('@prisma/client');

async function obtenerTablasLocal() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔌 Conectando a BD local...');
    
    // Obtener información sobre las tablas
    const tablas = await prisma.$queryRaw`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log(`📊 Total de tablas locales encontradas: ${tablas.length}`);
    
    // Guardar resultado
    const fs = require('fs');
    const contenido = tablas.map(tabla => 
      `${tabla.table_name} | ${tabla.table_type}`
    ).join('\n');
    
    fs.writeFileSync('local_tablas_resultado.txt', 
      `TABLAS EN BD LOCAL (${new Date().toISOString()})\n` +
      `=======================================\n\n` +
      contenido + '\n\n' +
      `Total: ${tablas.length} tablas\n`
    );
    
    console.log('📄 Resultados guardados en: local_tablas_resultado.txt');
    console.log('\n✅ ANÁLISIS LOCAL COMPLETADO');
    
    return tablas;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

obtenerTablasLocal();