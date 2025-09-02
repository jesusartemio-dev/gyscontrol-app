const fs = require('fs');
const path = require('path');

// Archivos que pueden ser eliminados de forma segura
const safeToDelete = {
  // Componentes UI duplicados o no utilizados
  'components/ui': [
    'ConfirmModal.tsx', // Duplicado de ConfirmDialog.tsx
    'alert-dialog.tsx', // Si no se usa en ningún lado
    'dropdown-menu.tsx', // Si no se usa
    'table.tsx', // Si no se usa
    'tabs.tsx' // Si no se usa
  ],
  
  // Servicios no implementados o duplicados
  'lib/services': [
    'nivelServicio.ts', // Parece no implementado
    'paqueteCompra.ts', // Si no se usa
    'paqueteCompraItem.ts', // Si no se usa
    'registroHoras.ts', // Si no se usa en la funcionalidad actual
    'valorizacion.ts' // Si no se usa en la funcionalidad actual
  ],
  
  // Utilidades de importación no utilizadas
  'lib/utils': [
    'categoriaEquipoImportUtils.ts',
    'categoriaServicioImportUtils.ts', 
    'recursoImportUtils.ts',
    'serviciosImportUtils.ts',
    'unidadServicioImportUtils.ts'
  ],
  
  // Validadores no utilizados
  'lib/validators': [
    'plantillaEquipo.ts',
    'plantillaServicio.ts'
  ],
  
  // Tipos que pueden estar duplicados
  'types': [
    'pdf-parse.d.ts' // Si no se usa PDF parsing
  ]
};

// Archivos que requieren revisión manual
const needsReview = {
  'components/catalogo': [
    'CatalogoEquipoSelect.tsx',
    'CatalogoServicioSelect.tsx',
    'RecursoSelect.tsx',
    'UnidadServicioSelect.tsx'
  ],
  
  'components/plantillas': [
    'PlantillaEquipoList.tsx',
    'PlantillaGastoList.tsx', 
    'PlantillaServicioList.tsx',
    'ResumenTotales.tsx'
  ],
  
  'components/logistica': [
    'CotizacionProveedorModalProcesarPdf.tsx',
    'GenerarPedidoDesdeCotizacion.tsx',
    'ProveedorSelect.tsx',
    'ProyectoSelect.tsx'
  ]
};

function createCleanupReport() {
  const srcDir = path.join(__dirname, 'src');
  
  console.log('🧹 REPORTE DE LIMPIEZA DE ARCHIVOS\n');
  console.log('='.repeat(60));
  
  let totalSafeToDelete = 0;
  let totalNeedsReview = 0;
  
  console.log('\n✅ ARCHIVOS SEGUROS PARA ELIMINAR:\n');
  
  Object.keys(safeToDelete).forEach(dir => {
    const fullDir = path.join(srcDir, dir);
    console.log(`📂 ${dir}/`);
    
    safeToDelete[dir].forEach(file => {
      const filePath = path.join(fullDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file} - EXISTE`);
        totalSafeToDelete++;
      } else {
        console.log(`   ⚪ ${file} - NO EXISTE`);
      }
    });
    console.log('');
  });
  
  console.log('\n⚠️  ARCHIVOS QUE REQUIEREN REVISIÓN MANUAL:\n');
  
  Object.keys(needsReview).forEach(dir => {
    const fullDir = path.join(srcDir, dir);
    console.log(`📂 ${dir}/`);
    
    needsReview[dir].forEach(file => {
      const filePath = path.join(fullDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ⚠️  ${file} - REVISAR`);
        totalNeedsReview++;
      } else {
        console.log(`   ⚪ ${file} - NO EXISTE`);
      }
    });
    console.log('');
  });
  
  console.log('\n📋 COMANDOS PARA ELIMINAR ARCHIVOS SEGUROS:\n');
  
  Object.keys(safeToDelete).forEach(dir => {
    const fullDir = path.join(srcDir, dir);
    
    safeToDelete[dir].forEach(file => {
      const filePath = path.join(fullDir, file);
      if (fs.existsSync(filePath)) {
        const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
        console.log(`rm "${relativePath}"`);
      }
    });
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESUMEN:`);
  console.log(`   ✅ Seguros para eliminar: ${totalSafeToDelete} archivos`);
  console.log(`   ⚠️  Requieren revisión: ${totalNeedsReview} archivos`);
  console.log(`   💾 Espacio potencial liberado: ~${(totalSafeToDelete * 2).toFixed(1)}KB`);
  
  console.log('\n🔧 PRÓXIMOS PASOS:');
  console.log('1. Ejecuta los comandos rm mostrados arriba para eliminar archivos seguros');
  console.log('2. Revisa manualmente los archivos marcados con ⚠️');
  console.log('3. Ejecuta las pruebas para asegurar que todo funciona');
  console.log('4. Haz commit de los cambios');
}

// Función para eliminar archivos seguros automáticamente
function deleteSafeFiles() {
  const srcDir = path.join(__dirname, 'src');
  let deletedCount = 0;
  
  console.log('🗑️  ELIMINANDO ARCHIVOS SEGUROS...\n');
  
  Object.keys(safeToDelete).forEach(dir => {
    const fullDir = path.join(srcDir, dir);
    
    safeToDelete[dir].forEach(file => {
      const filePath = path.join(fullDir, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Eliminado: ${path.relative(__dirname, filePath)}`);
          deletedCount++;
        } catch (error) {
          console.log(`❌ Error eliminando: ${path.relative(__dirname, filePath)} - ${error.message}`);
        }
      }
    });
  });
  
  console.log(`\n🎉 Eliminados ${deletedCount} archivos exitosamente!`);
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--delete')) {
  deleteSafeFiles();
} else {
  createCleanupReport();
  console.log('\n💡 Para eliminar automáticamente los archivos seguros, ejecuta:');
  console.log('   node safe-cleanup.js --delete');
}