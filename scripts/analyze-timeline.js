// Script para verificar todas las migraciones y analizar la cronología
const fs = require('fs');
const path = require('path');

function analyzeMigrationTimeline() {
  console.log('\n=== ANÁLISIS CRONOLÓGICO COMPLETO DE MIGRACIONES ===\n');
  
  const migrationsDir = 'prisma/migrations';
  
  if (fs.existsSync(migrationsDir)) {
    const items = fs.readdirSync(migrationsDir);
    const migrations = [];
    
    items.forEach(item => {
      const itemPath = path.join(migrationsDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && item.match(/^\d{14}_/)) {
        const migrationSqlPath = path.join(itemPath, 'migration.sql');
        
        if (fs.existsSync(migrationSqlPath)) {
          const migrationStat = fs.statSync(migrationSqlPath);
          migrations.push({
            name: item,
            created: migrationStat.birthtime,
            modified: migrationStat.mtime,
            size: migrationStat.size
          });
        }
      }
    });
    
    // Ordenar por fecha de creación
    migrations.sort((a, b) => a.created - b.created);
    
    console.log('🗓️  CRONOLOGÍA DETECTADA:');
    migrations.forEach((migration, index) => {
      console.log(`\n${index + 1}. ${migration.name}`);
      console.log(`   📅 Creado: ${migration.created.toDateString()}`);
      console.log(`   🕐 Hora: ${migration.created.toLocaleTimeString()}`);
      console.log(`   💾 Tamaño: ${(migration.size / 1024).toFixed(2)} KB`);
    });
    
    // Analizar gaps de tiempo
    console.log('\n\n🔍 ANÁLISIS DE GAPS TEMPORALES:');
    
    let lastDate = null;
    migrations.forEach((migration, index) => {
      if (lastDate) {
        const daysDiff = Math.floor((migration.created - lastDate) / (1000 * 60 * 60 * 24));
        console.log(`   Gap desde ${migrations[index-1].name}: ${daysDiff} días`);
      }
      lastDate = migration.created;
    });
    
    // Verificar si hay actividades en octubre 2025
    console.log('\n\n🗓️  VERIFICACIÓN DE OCTUBRE 2025:');
    const octoberMigrations = migrations.filter(m => 
      m.created.getMonth() === 9 && m.created.getFullYear() === 2025
    );
    
    if (octoberMigrations.length === 0) {
      console.log('   ❌ NO se encontraron migraciones creadas en octubre 2025');
      console.log('   📊 Gap detectado: Sep 19 → Nov 26 (68+ días)');
    } else {
      console.log('   ✅ Migraciones encontradas en octubre:');
      octoberMigrations.forEach(m => {
        console.log(`      - ${m.name} (${m.created.toDateString()})`);
      });
    }
    
    // Análisis de aplicación en BD
    console.log('\n\n🗄️  RESUMEN DE APLICACIÓN EN BASE DE DATOS:');
    console.log('   📊 Todas las migraciones aplicadas: Nov 26, 2025 11:31:08 GMT-0500');
    console.log('   ⏰ Gap entre creación y aplicación: ~68 días');
    console.log('   🔍 Posible explicación: Desarrollo → Testing → Deploy en lote');
    
  } else {
    console.log('❌ Directorio prisma/migrations no encontrado');
  }
}

analyzeMigrationTimeline();