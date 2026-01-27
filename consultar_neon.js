const { Client } = require('pg');

// Configuración de conexión para NEON
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_uXZTGCwQy9W1@ep-cool-pine-ad9tij4p-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function consultarTablasNEON() {
  try {
    console.log('🔌 Conectando a NEON...');
    await client.connect();
    
    console.log('✅ Conexión exitosa a NEON\n');
    
    // Consulta 1: Lista de tablas
    console.log('📋 OBTENIENDO LISTA DE TABLAS...\n');
    const tablasQuery = `
      SELECT 
        table_name,
        table_type,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablasResult = await client.query(tablasQuery);
    console.log(`📊 Total de tablas encontradas: ${tablasResult.rows.length}`);
    
    // Guardar resultado en archivo temporal
    const fs = require('fs');
    const contenido = tablasResult.rows.map(row => 
      `${row.table_name} | ${row.table_type} | ${row.table_schema}`
    ).join('\n');
    
    fs.writeFileSync('neon_tablas_resultado.txt', 
      `TABLAS EN NEON (${new Date().toISOString()})\n` +
      `========================================\n\n` +
      contenido + '\n\n' +
      `Total: ${tablasResult.rows.length} tablas\n`
    );
    
    console.log('📄 Resultados guardados en: neon_tablas_resultado.txt');
    
    // Consulta 2: Estructura de columnas para verificar convenciones
    console.log('\n🔍 VERIFICANDO ESTRUCTURA DE COLUMNAS...\n');
    
    const columnasQuery = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
      LIMIT 100; -- Limitar para evitar sobrecarga
    `;
    
    const columnasResult = await client.query(columnasQuery);
    
    // Analizar convenciones de nomenclatura
    const convenciones = {
      camelCase: [],
      snake_case: [],
      PascalCase: [],
      inconsistente: []
    };
    
    columnasResult.rows.forEach(row => {
      const columnName = row.column_name;
      if (columnName.includes('_')) {
        // Contiene guión bajo, probablemente snake_case
        if (columnName === columnName.toLowerCase()) {
          convenciones.snake_case.push(columnName);
        } else {
          convenciones.inconsistente.push(columnName);
        }
      } else {
        // Sin guión bajo, revisar casing
        if (columnName[0] === columnName[0].toLowerCase()) {
          convenciones.camelCase.push(columnName);
        } else {
          convenciones.PascalCase.push(columnName);
        }
      }
    });
    
    // Guardar análisis de convenciones
    const analisis = `
ANÁLISIS DE CONVENCIONES DE NOMENCLATURA
======================================

Total columnas analizadas: ${columnasResult.rows.length}

📋 CLASIFICACIÓN:
- snake_case: ${convenciones.snake_case.length} columnas
- camelCase: ${convenciones.camelCase.length} columnas  
- PascalCase: ${convenciones.PascalCase.length} columnas
- Inconsistente: ${convenciones.inconsistente.length} columnas

EJEMPLOS DE CONVENCIONES:
- snake_case: ${convenciones.snake_case.slice(0, 10).join(', ')}
- camelCase: ${convenciones.camelCase.slice(0, 10).join(', ')}
- PascalCase: ${convenciones.PascalCase.slice(0, 10).join(', ')}
- Inconsistente: ${convenciones.inconsistente.slice(0, 10).join(', ')}

`;
    
    fs.writeFileSync('neon_convenciones_resultado.txt', analisis);
    console.log('📄 Análisis de convenciones guardado en: neon_convenciones_resultado.txt');
    
    // Consulta 3: Contar registros por tabla (solo las principales)
    console.log('\n📊 CONTANDO REGISTROS POR TABLA...\n');
    
    // Obtener solo las tablas más importantes (no las de sistema)
    const tablasPrincipales = tablasResult.rows
      .filter(row => row.table_type === 'BASE TABLE')
      .slice(0, 20) // Limitar a 20 tablas para evitar sobrecarga
      .map(row => row.table_name);
    
    const conteos = [];
    
    for (const tabla of tablasPrincipales) {
      try {
        const countQuery = `SELECT COUNT(*) as total FROM "${tabla}"`;
        const result = await client.query(countQuery);
        conteos.push({
          tabla: tabla,
          registros: parseInt(result.rows[0].total)
        });
        console.log(`  ${tabla}: ${result.rows[0].total} registros`);
      } catch (error) {
        console.log(`  ${tabla}: Error al contar - ${error.message}`);
        conteos.push({
          tabla: tabla,
          registros: 'Error'
        });
      }
    }
    
    // Guardar conteos
    const conteosContenido = conteos.map(item => 
      `${item.tabla}: ${item.registros}`
    ).join('\n');
    
    fs.writeFileSync('neon_conteos_resultado.txt', 
      `CONTEO DE REGISTROS POR TABLA\n` +
      `============================\n\n` +
      conteosContenido + '\n'
    );
    
    console.log('\n📄 Conteo de registros guardado en: neon_conteos_resultado.txt');
    
    console.log('\n✅ ANÁLISIS COMPLETADO');
    console.log('\n📋 ARCHIVOS GENERADOS:');
    console.log('  - neon_tablas_resultado.txt');
    console.log('  - neon_convenciones_resultado.txt'); 
    console.log('  - neon_conteos_resultado.txt');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

consultarTablasNEON();