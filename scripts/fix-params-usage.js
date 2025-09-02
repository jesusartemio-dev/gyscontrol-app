const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Función para corregir el uso de params en archivos API
function fixParamsUsage(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updatedContent = content;
  let hasChanges = false;

  // Buscar funciones que usan params.id y agregar destructuring
  const functionRegex = /(export async function \w+\([^)]*\{\s*params\s*\}:\s*\{\s*params:\s*Promise<\{[^}]+\}>\s*\}[^)]*\)\s*\{\s*try\s*\{)([\s\S]*?)(?=\s*const\s+[\w\s,{}]+\s*=\s*await\s+|\s*const\s+[\w\s,{}]+\s*=\s*req\.json\(\)|\s*const\s+\w+\s*=\s*await\s+prisma)/g;
  
  updatedContent = updatedContent.replace(functionRegex, (match, funcStart, middle) => {
    if (!middle.includes('const { id } = await params') && !middle.includes('await params')) {
      hasChanges = true;
      return funcStart + '\n    const { id } = await params' + middle;
    }
    return match;
  });

  // Reemplazar params.id con id
  const paramsIdRegex = /params\.id/g;
  if (paramsIdRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(paramsIdRegex, 'id');
    hasChanges = true;
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Fixed params usage: ${filePath}`);
    return true;
  }
  
  return false;
}

// Buscar todos los archivos de API routes
const apiFiles = glob.sync('src/app/api/**/[id]/route.ts', { cwd: process.cwd() });

console.log(`🔍 Found ${apiFiles.length} API route files to check...`);

let fixedCount = 0;
apiFiles.forEach(file => {
  const fullPath = path.resolve(file);
  if (fixParamsUsage(fullPath)) {
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} files with params usage issues.`);
console.log('🎉 Params usage fix completed!');