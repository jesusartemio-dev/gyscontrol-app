#!/usr/bin/env tsx
/**
 * 🔧 Script de Generación Automática de Types desde Prisma
 * 
 * Este script genera automáticamente:
 * - Interfaces TypeScript desde modelos Prisma
 * - Payloads para APIs
 * - Validadores Zod base
 * 
 * Uso:
 * npm run generate:types
 * npm run generate:types -- --watch
 * npm run generate:types -- --entity=AprovisionamientoFinanciero
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ✅ Configuración
const CONFIG = {
  prismaSchemaPath: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  outputDir: {
    types: path.join(process.cwd(), 'src', 'types'),
    validators: path.join(process.cwd(), 'src', 'lib', 'validators')
  },
  entities: [
    // 'AprovisionamientoFinanciero', // Removed - deprecated
    'OrdenCompra', 
    'Recepcion',
    'Pago',
    // 'HistorialAprovisionamiento', // Removed - deprecated
    'Cliente',
    'Proveedor',
    'Producto',
    'User'
  ]
};

// 📡 Interfaces
interface PrismaField {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  relation?: string;
}

interface PrismaModel {
  name: string;
  fields: PrismaField[];
}

// 🔍 Funciones de Extracción
function extractPrismaModels(): PrismaModel[] {
  const schemaContent = fs.readFileSync(CONFIG.prismaSchemaPath, 'utf-8');
  const models: PrismaModel[] = [];
  
  // Regex para extraer modelos
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let modelMatch;
  
  while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
    const [, modelName, modelBody] = modelMatch;
    
    if (!CONFIG.entities.includes(modelName)) continue;
    
    const fields: PrismaField[] = [];
    
    // Regex para extraer campos
    const fieldRegex = /^\s*(\w+)\s+([\w\[\]?]+)\s*(@.*)?$/gm;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const [, fieldName, fieldType, attributes] = fieldMatch;
      
      // Skip relations y campos especiales
      if (attributes?.includes('@relation') || 
          fieldName.startsWith('@@') || 
          fieldName.startsWith('@')) continue;
      
      fields.push({
        name: fieldName,
        type: mapPrismaTypeToTS(fieldType),
        isOptional: fieldType.includes('?'),
        isArray: fieldType.includes('[]'),
        relation: attributes?.includes('@relation') ? 'relation' : undefined
      });
    }
    
    models.push({ name: modelName, fields });
  }
  
  return models;
}

// 🔄 Mapeo de tipos Prisma a TypeScript
function mapPrismaTypeToTS(prismaType: string): string {
  const baseType = prismaType.replace(/[\[\]?]/g, '');
  
  const typeMap: Record<string, string> = {
    'String': 'string',
    'Int': 'number',
    'Float': 'number',
    'Decimal': 'number',
    'Boolean': 'boolean',
    'DateTime': 'Date',
    'Json': 'any',
    'Bytes': 'Buffer'
  };
  
  return typeMap[baseType] || baseType;
}

// 📝 Generadores
function generateModelTypes(models: PrismaModel[]): string {
  let content = `/**
 * 🏗️ Tipos de Modelos - Generado automáticamente desde Prisma
 * 
 * ⚠️  NO EDITAR MANUALMENTE - Se regenera automáticamente
 * 
 * Generado: ${new Date().toISOString()}
 */

`;
  
  models.forEach(model => {
    content += `// ✅ ${model.name}\n`;
    content += `export interface ${model.name} {\n`;
    
    model.fields.forEach(field => {
      const optional = field.isOptional ? '?' : '';
      const array = field.isArray ? '[]' : '';
      content += `  ${field.name}${optional}: ${field.type}${array};\n`;
    });
    
    content += `}\n\n`;
  });
  
  return content;
}

function generatePayloadTypes(models: PrismaModel[]): string {
  let content = `/**
 * 📡 Tipos de Payloads - Generado automáticamente desde Prisma
 * 
 * ⚠️  NO EDITAR MANUALMENTE - Se regenera automáticamente
 * 
 * Generado: ${new Date().toISOString()}
 */

import type { ${models.map(m => m.name).join(', ')} } from './modelos';

`;
  
  models.forEach(model => {
    // Create payload
    content += `// ✅ ${model.name} Payloads\n`;
    content += `export interface Create${model.name}Payload extends Omit<${model.name}, 'id' | 'createdAt' | 'updatedAt'> {}\n`;
    content += `export interface Update${model.name}Payload extends Partial<Omit<${model.name}, 'id' | 'createdAt' | 'updatedAt'>> {}\n`;
    content += `export interface ${model.name}Response extends ${model.name} {}\n\n`;
  });
  
  return content;
}

function generateZodValidators(models: PrismaModel[]): string {
  let content = `/**
 * 🔍 Validadores Zod Base - Generado automáticamente desde Prisma
 * 
 * ⚠️  NO EDITAR MANUALMENTE - Se regenera automáticamente
 * ⚠️  Personaliza en archivos específicos (ej: aprovisionamiento.ts)
 * 
 * Generado: ${new Date().toISOString()}
 */

import { z } from 'zod';

`;
  
  models.forEach(model => {
    content += `// ✅ ${model.name} Validators\n`;
    content += `export const ${model.name.toLowerCase()}Schema = z.object({\n`;
    
    model.fields.forEach(field => {
      let zodType = mapTSTypeToZod(field.type);
      
      if (field.isArray) zodType += '.array()';
      if (field.isOptional) zodType += '.optional()';
      
      content += `  ${field.name}: ${zodType},\n`;
    });
    
    content += `});\n\n`;
    
    // Create y Update schemas
    content += `export const create${model.name}Schema = ${model.name.toLowerCase()}Schema.omit({ id: true, createdAt: true, updatedAt: true });\n`;
    content += `export const update${model.name}Schema = create${model.name}Schema.partial();\n\n`;
  });
  
  return content;
}

// 🔄 Mapeo de tipos TS a Zod
function mapTSTypeToZod(tsType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'z.string()',
    'number': 'z.number()',
    'boolean': 'z.boolean()',
    'Date': 'z.date()',
    'any': 'z.any()'
  };
  
  return typeMap[tsType] || 'z.unknown()';
}

// 🚀 Función Principal
async function main() {
  console.log('🔧 Generando tipos desde Prisma...');
  
  try {
    // 📡 Extraer modelos de Prisma
    const models = extractPrismaModels();
    console.log(`📋 Encontrados ${models.length} modelos:`, models.map(m => m.name).join(', '));
    
    // 📁 Crear directorios si no existen
    Object.values(CONFIG.outputDir).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // 📝 Generar archivos
    const modelTypes = generateModelTypes(models);
    const payloadTypes = generatePayloadTypes(models);
    const zodValidators = generateZodValidators(models);
    
    // 💾 Escribir archivos
    fs.writeFileSync(path.join(CONFIG.outputDir.types, 'modelos-generated.ts'), modelTypes);
    fs.writeFileSync(path.join(CONFIG.outputDir.types, 'payloads-generated.ts'), payloadTypes);
    fs.writeFileSync(path.join(CONFIG.outputDir.validators, 'base-generated.ts'), zodValidators);
    
    console.log('✅ Tipos generados exitosamente:');
    console.log('  📄 modelos-generated.ts');
    console.log('  📄 payloads-generated.ts');
    console.log('  📄 base-generated.ts');
    
    // 🔍 Ejecutar auditoría después de generar
    console.log('\n🔍 Ejecutando auditoría de consistencia...');
    execSync('npm run audit:consistency', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Error generando tipos:', error);
    process.exit(1);
  }
}

// 🎯 Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

export { main as generateTypes };