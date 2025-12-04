// Script to analyze dangerous changes in each migration
const fs = require('fs');
const path = require('path');

const migrationFiles = [
  '20250917162256_init',
  '20250918000731_cotizacion_extensiones', 
  '20250918043028_add_plantillas_cotizacion',
  '20250919171819_add_crm_models',
  '20250919234235_add_cotizacion_versions'
];

function analyzeMigrationContent(migrationName, content) {
  const analysis = {
    name: migrationName,
    dangerous: [],
    warnings: [],
    normal: []
  };

  // Check for NOT NULL additions without defaults
  const notNullMatches = content.match(/ADD COLUMN[^;]*NOT NULL/gi);
  if (notNullMatches) {
    notNullMatches.forEach(match => {
      analysis.dangerous.push(`❌ NOT NULL without default: ${match}`);
    });
  }

  // Check for column type changes
  const typeChanges = content.match(/ALTER TABLE[^;]*ALTER COLUMN[^;]*TYPE/gi);
  if (typeChanges) {
    typeChanges.forEach(match => {
      analysis.dangerous.push(`🔄 Type change: ${match}`);
    });
  }

  // Check for new foreign keys
  const foreignKeys = content.match(/ADD CONSTRAINT[^;]*FOREIGN KEY/gi);
  if (foreignKeys) {
    foreignKeys.forEach(match => {
      analysis.warnings.push(`🔗 New Foreign Key: ${match}`);
    });
  }

  // Check for index additions
  const indexes = content.match(/CREATE (UNIQUE )?INDEX/gi);
  if (indexes) {
    indexes.forEach(match => {
      analysis.normal.push(`📋 Index: ${match}`);
    });
  }

  // Check for column removals
  const columnRemovals = content.match(/DROP COLUMN[^;]*/gi);
  if (columnRemovals) {
    columnRemovals.forEach(match => {
      analysis.dangerous.push(`🗑️ Column removal: ${match}`);
    });
  }

  // Check for constraint additions
  const constraints = content.match(/ADD CONSTRAINT[^;]*/gi);
  if (constraints) {
    constraints.forEach(match => {
      if (!match.includes('FOREIGN KEY')) {
        analysis.warnings.push(`⚠️ New constraint: ${match}`);
      }
    });
  }

  return analysis;
}

function runMigrationAnalysis() {
  console.log('\n=== DANGEROUS MIGRATION ANALYSIS ===\n');
  
  migrationFiles.forEach(migrationName => {
    const migrationPath = path.join('prisma/migrations', migrationName, 'migration.sql');
    
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf8');
      const analysis = analyzeMigrationContent(migrationName, content);
      
      console.log(`\n📁 ${migrationName}`);
      console.log('='.repeat(50));
      
      if (analysis.dangerous.length > 0) {
        console.log('\n🔴 DANGEROUS CHANGES:');
        analysis.dangerous.forEach(item => console.log(`   ${item}`));
      }
      
      if (analysis.warnings.length > 0) {
        console.log('\n🟡 WARNINGS:');
        analysis.warnings.forEach(item => console.log(`   ${item}`));
      }
      
      if (analysis.normal.length > 0) {
        console.log('\n✅ NORMAL CHANGES:');
        analysis.normal.forEach(item => console.log(`   ${item}`));
      }
      
      if (analysis.dangerous.length === 0 && analysis.warnings.length === 0) {
        console.log('\n✅ NO PROBLEMATIC CHANGES DETECTED');
      }
    } else {
      console.log(`\n❌ Migration file not found: ${migrationPath}`);
    }
  });
}

runMigrationAnalysis();