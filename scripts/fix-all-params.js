const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Buscar todos los archivos TypeScript en la carpeta API
const findApiFiles = () => {
  try {
    const result = execSync('dir /s /b src\\app\\api\\*.ts', { encoding: 'utf8', cwd: process.cwd() });
    return result.split('\n').filter(line => line.trim() && line.includes('route.ts'));
  } catch (error) {
    console.error('Error finding files:', error.message);
    return [];
  }
};

// Función para corregir un archivo
function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    // Patrón 1: params: { id: string } -> params: Promise<{ id: string }>
    const pattern1 = /params: \{ ([^}]+) \}/g;
    if (pattern1.test(content)) {
      updatedContent = updatedContent.replace(pattern1, 'params: Promise<{ $1 }>');
      hasChanges = true;
    }

    // Patrón 2: context: { params: { id: string } } -> context: { params: Promise<{ id: string }> }
    const pattern2 = /context: \{ params: \{ ([^}]+) \}/g;
    if (pattern2.test(updatedContent)) {
      updatedContent = updatedContent.replace(pattern2, 'context: { params: Promise<{ $1 }>');
      hasChanges = true;
    }

    // Patrón 3: Agregar await params donde sea necesario
    // Buscar funciones que usan params.id o params.listaId directamente
    const paramsUsagePattern = /(const \{ \w+ \} = params|params\.(\w+))/g;
    const matches = [...updatedContent.matchAll(paramsUsagePattern)];
    
    if (matches.length > 0) {
      // Reemplazar const { id } = params con const { id } = await params
      updatedContent = updatedContent.replace(/const \{ (\w+) \} = params(?!\s*=\s*await)/g, 'const { $1 } = await params');
      
      // Reemplazar params.id con id (después de agregar destructuring)
      updatedContent = updatedContent.replace(/params\.(\w+)/g, '$1');
      
      // Agregar destructuring si no existe
      const functionPattern = /(export async function \w+\([^)]*\{\s*params\s*\}[^)]*\)\s*\{\s*try\s*\{)([\s\S]*?)(?=\s*const|\s*if|\s*const|\s*await|\s*return|\s*const)/g;
      updatedContent = updatedContent.replace(functionPattern, (match, funcStart, middle) => {
        if (!middle.includes('const {') && !middle.includes('await params')) {
          // Determinar qué parámetro se está usando
          const paramMatch = match.match(/params: Promise<\{ (\w+): string \}>/)
          if (paramMatch) {
            const paramName = paramMatch[1];
            return funcStart + `\n    const { ${paramName} } = await params` + middle;
          }
        }
        return match;
      });
      
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Ejecutar el script
const apiFiles = findApiFiles();
console.log(`🔍 Found ${apiFiles.length} API route files to check...`);

let fixedCount = 0;
apiFiles.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} files.`);
console.log('🎉 All params fixes completed!');