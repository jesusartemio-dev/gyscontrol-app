// Script to compare schema.prisma with migration expectations
const fs = require('fs');

function analyzeSchemaVsMigrations() {
  console.log('\n=== SCHEMA VS MIGRATIONS COMPARISON ===\n');
  
  // Read current schema
  const schemaPath = 'prisma/schema.prisma';
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Key fields that should exist based on migrations but might be missing
  const expectedFields = {
    'User': {
      expected: ['metaMensual', 'metaTrimestral'],
      evidence: 'Fields referenced in diagnostic report'
    },
    'Cliente': {
      expected: ['calificacion', 'estadoRelacion', 'frecuenciaCompra', 'linkedin', 'potencialAnual', 'sector', 'sitioWeb', 'tamanoEmpresa', 'ultimoProyecto'],
      evidence: 'Migration 20250919171819_add_crm_models'
    },
    'Cotizacion': {
      expected: ['fechaValidezHasta', 'formaPago', 'incluyeIGV', 'moneda', 'referencia', 'revision', 'validezOferta', 'competencia', 'etapaCrm', 'fechaProximaAccion', 'fechaUltimoContacto', 'posicionVsCompetencia', 'prioridadCrm', 'probabilidadCierre', 'proximaAccion', 'razonCierre', 'retroalimentacionCliente'],
      evidence: 'Migrations 20250918000731_cotizacion_extensiones and 20250919171819_add_crm_models'
    },
    'CotizacionServicioItem': {
      expected: ['orden'],
      evidence: 'Migration 20250918000731_cotizacion_extensiones'
    },
    'CatalogoServicio': {
      expected: ['orden'],
      evidence: 'Migration 20250918000731_cotizacion_extensiones'
    },
    'CotizacionTarea': {
      expected: ['cotizacionServicioItemId'],
      evidence: 'Migration 20250918000731_cotizacion_extensiones'
    }
  };
  
  console.log('Checking expected fields in current schema:\n');
  
  Object.entries(expectedFields).forEach(([modelName, config]) => {
    const { expected, evidence } = config;
    const modelRegex = new RegExp(`model ${modelName} \\{[^}]*\\}`, 's');
    const modelMatch = schemaContent.match(modelRegex);
    
    if (modelMatch) {
      const modelContent = modelMatch[0];
      console.log(`\n📋 MODEL: ${modelName}`);
      console.log(`   Evidence: ${evidence}`);
      console.log(`   Expected fields: ${expected.join(', ')}`);
      
      expected.forEach(field => {
        const fieldRegex = new RegExp(`${field}\\s+`, 'i');
        if (fieldRegex.test(modelContent)) {
          console.log(`   ✅ Found: ${field}`);
        } else {
          console.log(`   ❌ MISSING: ${field}`);
        }
      });
    } else {
      console.log(`\n❌ MODEL NOT FOUND: ${modelName}`);
    }
  });
  
  // Check for tables that should exist from migrations
  const expectedTables = [
    'cotizacion_exclusion',
    'cotizacion_condicion', 
    'plantilla_exclusion',
    'plantilla_exclusion_item',
    'plantilla_condicion',
    'plantilla_condicion_item',
    'crm_oportunidad',
    'crm_actividad',
    'crm_competidor_licitacion',
    'crm_contacto_cliente',
    'crm_historial_proyecto',
    'crm_metrica_comercial',
    'cotizacion_version'
  ];
  
  console.log('\n\n📊 EXPECTED TABLES FROM MIGRATIONS:');
  expectedTables.forEach(table => {
    const tableRegex = new RegExp(`"public"\\."${table}"`, 'g');
    if (tableRegex.test(schemaContent)) {
      console.log(`   ✅ Table exists: ${table}`);
    } else {
      console.log(`   ❌ MISSING TABLE: ${table}`);
    }
  });
}

analyzeSchemaVsMigrations();