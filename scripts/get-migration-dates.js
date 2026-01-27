// Script to get file dates for migrations
const fs = require('fs');
const path = require('path');

function getMigrationFileDates() {
  const migrationsDir = 'prisma/migrations';
  console.log('\n=== FECHAS DE ARCHIVOS DE MIGRACIÓN ===\n');
  
  if (fs.existsSync(migrationsDir)) {
    const items = fs.readdirSync(migrationsDir);
    
    items.forEach(item => {
      const itemPath = path.join(migrationsDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && item.match(/^\d{14}_/)) {
        const migrationSqlPath = path.join(itemPath, 'migration.sql');
        
        if (fs.existsSync(migrationSqlPath)) {
          const migrationStat = fs.statSync(migrationSqlPath);
          console.log(`📁 ${item}`);
          console.log(`   📄 migration.sql`);
          console.log(`   🕐 Creado: ${migrationStat.birthtime}`);
          console.log(`   🕐 Modificado: ${migrationStat.mtime}`);
          console.log(`   💾 Tamaño: ${(migrationStat.size / 1024).toFixed(2)} KB`);
          console.log('   ---');
        }
      }
    });
    
    // Also check migration_lock.toml
    const lockPath = path.join(migrationsDir, 'migration_lock.toml');
    if (fs.existsSync(lockPath)) {
      const lockStat = fs.statSync(lockPath);
      console.log('📄 migration_lock.toml');
      console.log(`   🕐 Creado: ${lockStat.birthtime}`);
      console.log(`   🕐 Modificado: ${lockStat.mtime}`);
    }
  } else {
    console.log('❌ Directorio prisma/migrations no encontrado');
  }
}

getMigrationFileDates();