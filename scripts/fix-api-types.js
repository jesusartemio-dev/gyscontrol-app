const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Función para corregir los tipos en un archivo
function fixApiTypes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  let updatedContent = content;
  
  // Reemplazar el patrón de tipos
  updatedContent = updatedContent.replace(
    /context: \{ params: \{ ([^}]+) \} \}/g,
    'context: { params: Promise<{ $1 }> }'
  );
  
  // Reemplazar params: { id: string } con params: Promise<{ id: string }>
  updatedContent = updatedContent.replace(
    /params: \{ ([^}]+) \}/g,
    'params: Promise<{ $1 }>'
  );
  
  // Reemplazar params.id con await params y destructuring
  updatedContent = updatedContent.replace(
    /(export async function \w+\([^)]+\) \{\s*try \{)([^}]*?)(where: \{ id: params\.id \})/gs,
    (match, funcStart, middle, whereClause) => {
      if (!middle.includes('const { id } = await params')) {
        return funcStart + '\n    const { id } = await params' + middle + 'where: { id }';
      }
      return match.replace('params.id', 'id');
    }
  );
  
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Lista de archivos a corregir
const filesToFix = [
  'src/app/api/proyecto/[id]/route.ts',
  'src/app/api/plantilla-servicio-item/[id]/route.ts',
  'src/app/api/proyecto-equipo-item/from-proyecto/[id]/route.ts',
  'src/app/api/plantilla-gasto-item/[id]/route.ts',
  'src/app/api/categoria-servicio/[id]/route.ts',
  'src/app/api/cotizacion/[id]/recalcular/route.ts',
  'src/app/api/cotizacion-equipo-item/[id]/route.ts',
  'src/app/api/plantilla-equipo/[id]/route.ts',
  'src/app/api/plantilla-gasto/[id]/route.ts',
  'src/app/api/lista-requerimiento/[id]/route.ts',
  'src/app/api/lista-equipo-item/[id]/seleccionar-cotizacion/route.ts',
  'src/app/api/lista-equipo/from-proyecto/[id]/route.ts',
  'src/app/api/pedido-equipo/[id]/route.ts',
  'src/app/api/cotizacion-equipo/[id]/route.ts',
  'src/app/api/lista-equipo/enviar/[id]/route.ts',
  'src/app/api/lista-equipo-item/[id]/reemplazar/route.ts',
  'src/app/api/cotizacion-proveedor-item/[id]/route.ts',
  'src/app/api/lista-equipo/sync-reales/[id]/route.ts',
  'src/app/api/cotizacion-servicio/[id]/route.ts',
  'src/app/api/lista-equipo/[id]/route.ts',
  'src/app/api/plantilla-servicio/[id]/route.ts',
  'src/app/api/paquete-compra-item/[id]/route.ts',
  'src/app/api/cotizacion-servicio-item/[id]/route.ts',
  'src/app/api/pedido-equipo-item/[id]/route.ts',
  'src/app/api/cotizacion-gasto-item/[id]/route.ts',
  'src/app/api/cotizacion-proveedor/[id]/route.ts',
  'src/app/api/plantilla/[id]/route.ts',
  'src/app/api/logistica-catalogo-equipo/[id]/route.ts',
  'src/app/api/cotizacion-gasto/[id]/route.ts',
  'src/app/api/cotizacion/[id]/route.ts',
  'src/app/api/proveedor/[id]/route.ts',
  'src/app/api/plantilla-equipo-item/[id]/route.ts',
  'src/app/api/proyecto-equipo-item/[id]/route.ts',
  'src/app/api/lista-equipo-item/[id]/route.ts',
  'src/app/api/proyecto-equipo/from-proyecto/[id]/route.ts',
  'src/app/api/logistica/listas/[id]/route.ts',
  'src/app/api/proyecto-equipo-item/disponibles/[proyectoId]/route.ts',
  'src/app/api/lista-requerimiento-item/[id]/route.ts'
];

console.log('🔧 Iniciando corrección de tipos en archivos de API...');

let fixedCount = 0;
filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    if (fixApiTypes(fullPath)) {
      fixedCount++;
    }
  } else {
    console.log(`⚠️  Archivo no encontrado: ${file}`);
  }
});

console.log(`\n✨ Proceso completado. ${fixedCount} archivos corregidos.`);