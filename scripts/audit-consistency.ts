/**
 * 🔍 SCRIPT DE AUDITORÍA DE CONSISTENCIA GYS
 * 
 * Este script valida la consistencia entre todas las capas del proyecto
 * siguiendo el FLUJO_GYS: Prisma → Types → Payloads → Validators → APIs → Services → Components → Pages → Sidebar → Testing
 * 
 * @author GYS Development Team
 * @version 2.0.0
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

/**
 * 🔍 Tipos de validación por fase
 */
type ValidationPhase = 'models' | 'types' | 'payloads' | 'validators' | 'apis' | 'services' | 'components' | 'pages' | 'sidebar' | 'testing'

/**
 * 📋 Resultado de validación
 */
interface ValidationResult {
  phase: ValidationPhase
  entity: string
  passed: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

/**
 * 🎯 Configuración de validación por fase
 */
const PHASE_CONFIG = {
  models: {
    name: 'Prisma Models',
    files: ['prisma/schema.prisma'],
    validators: ['validatePrismaModel']
  },
  types: {
    name: 'TypeScript Types',
    files: ['src/types/modelos.ts'],
    validators: ['validateTypes']
  },
  payloads: {
    name: 'API Payloads',
    files: ['src/types/payloads.ts'],
    validators: ['validatePayloads']
  },
  validators: {
    name: 'Zod Validators',
    files: ['src/lib/validators/*.ts'],
    validators: ['validateZodSchemas']
  },
  apis: {
    name: 'API Routes',
    files: ['src/app/api/**/route.ts'],
    validators: ['validateApiRoutes']
  },
  services: {
    name: 'Services',
    files: ['src/lib/services/*.ts'],
    validators: ['validateServices']
  },
  components: {
    name: 'Components',
    files: ['src/components/**/*.tsx'],
    validators: ['validateComponents']
  },
  pages: {
    name: 'Pages',
    files: ['src/app/**/page.tsx'],
    validators: ['validatePages']
  },
  sidebar: {
    name: 'Sidebar Navigation',
    files: ['src/components/Sidebar.tsx'],
    validators: ['validateSidebar']
  },
  testing: {
    name: 'Tests',
    files: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    validators: ['validateTests']
  }
}

/**
 * 🔍 Clase principal de auditoría
 */
class ConsistencyAuditor {
  private results: ValidationResult[] = []
  private entities: string[] = []

  constructor() {
    this.loadEntities()
  }

  /**
   * 📋 Cargar entidades del proyecto
   */
  private loadEntities() {
    try {
      const schemaContent = readFileSync('prisma/schema.prisma', 'utf-8')
      const modelMatches = schemaContent.match(/model\s+(\w+)\s*{/g)
      
      if (modelMatches) {
        this.entities = modelMatches.map(match => {
          const modelName = match.match(/model\s+(\w+)/)?.[1]
          return modelName || ''
        }).filter(Boolean)
      }

      console.log(chalk.blue(`📋 Entidades encontradas: ${this.entities.join(', ')}`))
    } catch (error) {
      console.error(chalk.red('❌ Error al cargar entidades del schema.prisma'))
    }
  }

  /**
   * 🔍 Ejecutar auditoría por fase
   */
  async auditPhase(phase: ValidationPhase, entityFilter?: string): Promise<ValidationResult[]> {
    console.log(chalk.yellow(`\n🔍 Auditando fase: ${PHASE_CONFIG[phase].name}`))
    
    const phaseResults: ValidationResult[] = []
    const entitiesToCheck = entityFilter ? [entityFilter] : this.entities

    for (const entity of entitiesToCheck) {
      const result = await this.validateEntityInPhase(phase, entity)
      phaseResults.push(result)
      this.results.push(result)
    }

    return phaseResults
  }

  /**
   * ✅ Validar entidad en fase específica
   */
  private async validateEntityInPhase(phase: ValidationPhase, entity: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      phase,
      entity,
      passed: true,
      errors: [],
      warnings: [],
      suggestions: []
    }

    try {
      switch (phase) {
        case 'models':
          await this.validatePrismaModel(entity, result)
          break
        case 'types':
          await this.validateTypes(entity, result)
          break
        case 'payloads':
          await this.validatePayloads(entity, result)
          break
        case 'validators':
          await this.validateZodSchemas(entity, result)
          break
        case 'apis':
          await this.validateApiRoutes(entity, result)
          break
        case 'services':
          await this.validateServices(entity, result)
          break
        case 'components':
          await this.validateComponents(entity, result)
          break
        case 'pages':
          await this.validatePages(entity, result)
          break
        case 'sidebar':
          await this.validateSidebar(entity, result)
          break
        case 'testing':
          await this.validateTests(entity, result)
          break
      }
    } catch (error) {
      result.errors.push(`Error durante validación: ${error}`)
      result.passed = false
    }

    return result
  }

  /**
   * 🗄️ Validar modelo Prisma
   */
  private async validatePrismaModel(entity: string, result: ValidationResult) {
    const schemaPath = 'prisma/schema.prisma'
    
    if (!existsSync(schemaPath)) {
      result.errors.push('Archivo schema.prisma no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(schemaPath, 'utf-8')
    const modelRegex = new RegExp(`model\\s+${entity}\\s*{([^}]+)}`, 's')
    const match = content.match(modelRegex)

    if (!match) {
      result.errors.push(`Modelo ${entity} no encontrado en schema.prisma`)
      result.passed = false
      return
    }

    const modelContent = match[1]
    
    // ✅ Validar campos obligatorios
    const requiredFields = ['id', 'createdAt', 'updatedAt']
    for (const field of requiredFields) {
      if (!modelContent.includes(field)) {
        result.errors.push(`Campo obligatorio '${field}' faltante en modelo ${entity}`)
        result.passed = false
      }
    }

    // ✅ Validar relaciones
    const relationMatches = modelContent.match(/@relation\([^)]+\)/g)
    if (relationMatches) {
      for (const relation of relationMatches) {
        if (!relation.includes('onDelete')) {
          result.warnings.push(`Relación sin onDelete definido: ${relation}`)
        }
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Modelo Prisma validado`))
  }

  /**
   * 📝 Validar tipos TypeScript
   */
  private async validateTypes(entity: string, result: ValidationResult) {
    const typesPath = 'src/types/modelos.ts'
    
    if (!existsSync(typesPath)) {
      result.errors.push('Archivo modelos.ts no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(typesPath, 'utf-8')
    
    // ✅ Validar que existe la interfaz base
    if (!content.includes(`export interface ${entity}`)) {
      result.errors.push(`Interfaz ${entity} no encontrada en modelos.ts`)
      result.passed = false
      return
    }

    // ✅ Validar interfaces con relaciones
    const expectedInterfaces = [
      `${entity}ConItems`,
      `${entity}ConTodo`
    ]

    for (const interfaceName of expectedInterfaces) {
      if (!content.includes(interfaceName)) {
        result.warnings.push(`Interfaz ${interfaceName} no encontrada`)
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Tipos TypeScript validados`))
  }

  /**
   * 📦 Validar payloads
   */
  private async validatePayloads(entity: string, result: ValidationResult) {
    const payloadsPath = 'src/types/payloads.ts'
    
    if (!existsSync(payloadsPath)) {
      result.errors.push('Archivo payloads.ts no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(payloadsPath, 'utf-8')
    
    // ✅ Validar payloads esperados
    const expectedPayloads = [
      `Crear${entity}Data`,
      `Actualizar${entity}Data`,
      `Filtros${entity}`
    ]

    for (const payload of expectedPayloads) {
      if (!content.includes(payload)) {
        result.errors.push(`Payload ${payload} no encontrado en payloads.ts`)
        result.passed = false
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Payloads validados`))
  }

  /**
   * 🔍 Validar schemas Zod
   */
  private async validateZodSchemas(entity: string, result: ValidationResult) {
    const entityLower = entity.toLowerCase()
    const validatorPath = `src/lib/validators/${entityLower}.ts`
    
    if (!existsSync(validatorPath)) {
      result.errors.push(`Archivo de validadores ${validatorPath} no encontrado`)
      result.passed = false
      return
    }

    const content = readFileSync(validatorPath, 'utf-8')
    
    // ✅ Validar schemas esperados
    const expectedSchemas = [
      `create${entity}Schema`,
      `update${entity}Schema`,
      `${entityLower}FiltersSchema`
    ]

    for (const schema of expectedSchemas) {
      if (!content.includes(schema)) {
        result.errors.push(`Schema ${schema} no encontrado`)
        result.passed = false
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Schemas Zod validados`))
  }

  /**
   * 🌐 Validar rutas API
   */
  private async validateApiRoutes(entity: string, result: ValidationResult) {
    const entityKebab = this.toKebabCase(entity)
    const apiBasePath = `src/app/api/${entityKebab}`
    const routePath = `${apiBasePath}/route.ts`
    const idRoutePath = `${apiBasePath}/[id]/route.ts`
    
    // ✅ Validar ruta principal
    if (!existsSync(routePath)) {
      result.errors.push(`Ruta API principal ${routePath} no encontrada`)
      result.passed = false
    } else {
      const content = readFileSync(routePath, 'utf-8')
      if (!content.includes('export async function GET') || !content.includes('export async function POST')) {
        result.errors.push('Ruta principal debe exportar funciones GET y POST')
        result.passed = false
      }
    }

    // ✅ Validar ruta individual
    if (!existsSync(idRoutePath)) {
      result.errors.push(`Ruta API individual ${idRoutePath} no encontrada`)
      result.passed = false
    } else {
      const content = readFileSync(idRoutePath, 'utf-8')
      const requiredMethods = ['GET', 'PUT', 'DELETE']
      for (const method of requiredMethods) {
        if (!content.includes(`export async function ${method}`)) {
          result.errors.push(`Método ${method} faltante en ruta individual`)
          result.passed = false
        }
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Rutas API validadas`))
  }

  /**
   * 🔧 Validar servicios
   */
  private async validateServices(entity: string, result: ValidationResult) {
    const entityLower = entity.toLowerCase()
    const servicePath = `src/lib/services/${entityLower}.ts`
    
    if (!existsSync(servicePath)) {
      result.errors.push(`Servicio ${servicePath} no encontrado`)
      result.passed = false
      return
    }

    const content = readFileSync(servicePath, 'utf-8')
    
    // ✅ Validar clase de servicio
    if (!content.includes(`export class ${entity}Service`)) {
      result.errors.push(`Clase ${entity}Service no encontrada`)
      result.passed = false
    }

    // ✅ Validar métodos CRUD
    const requiredMethods = ['getList', 'getById', 'create', 'update', 'delete']
    for (const method of requiredMethods) {
      if (!content.includes(`static async ${method}`)) {
        result.errors.push(`Método ${method} faltante en servicio`)
        result.passed = false
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Servicio validado`))
  }

  /**
   * 🎨 Validar componentes
   */
  private async validateComponents(entity: string, result: ValidationResult) {
    const entityKebab = this.toKebabCase(entity)
    const componentDir = `src/components/${entityKebab}`
    
    if (!existsSync(componentDir)) {
      result.errors.push(`Directorio de componentes ${componentDir} no encontrado`)
      result.passed = false
      return
    }

    // ✅ Validar componentes esperados
    const expectedComponents = [
      `${entity}List.tsx`,
      `${entity}Form.tsx`,
      `${entity}Select.tsx`
    ]

    for (const component of expectedComponents) {
      const componentPath = `${componentDir}/${component}`
      if (!existsSync(componentPath)) {
        result.warnings.push(`Componente ${component} no encontrado`)
      }
    }

    console.log(chalk.green(`  ✅ ${entity} - Componentes validados`))
  }

  /**
   * 📄 Validar páginas
   */
  private async validatePages(entity: string, result: ValidationResult) {
    const entityKebab = this.toKebabCase(entity)
    const pageDir = `src/app/${entityKebab}`
    
    if (!existsSync(pageDir)) {
      result.errors.push(`Directorio de páginas ${pageDir} no encontrado`)
      result.passed = false
      return
    }

    // ✅ Validar página principal
    const mainPagePath = `${pageDir}/page.tsx`
    if (!existsSync(mainPagePath)) {
      result.errors.push(`Página principal ${mainPagePath} no encontrada`)
      result.passed = false
    }

    console.log(chalk.green(`  ✅ ${entity} - Páginas validadas`))
  }

  /**
   * 🧭 Validar sidebar
   */
  private async validateSidebar(entity: string, result: ValidationResult) {
    const sidebarPath = 'src/components/Sidebar.tsx'
    
    if (!existsSync(sidebarPath)) {
      result.errors.push('Archivo Sidebar.tsx no encontrado')
      result.passed = false
      return
    }

    const content = readFileSync(sidebarPath, 'utf-8')
    const entityKebab = this.toKebabCase(entity)
    
    if (!content.includes(`/${entityKebab}`)) {
      result.warnings.push(`Ruta /${entityKebab} no encontrada en sidebar`)
    }

    console.log(chalk.green(`  ✅ ${entity} - Sidebar validado`))
  }

  /**
   * 🧪 Validar tests
   */
  private async validateTests(entity: string, result: ValidationResult) {
    const entityLower = entity.toLowerCase()
    const testPaths = [
      `src/__tests__/api/${entityLower}.test.ts`,
      `src/__tests__/services/${entityLower}.test.ts`,
      `src/__tests__/components/${entityLower}.test.tsx`
    ]

    let testsFound = 0
    for (const testPath of testPaths) {
      if (existsSync(testPath)) {
        testsFound++
      }
    }

    if (testsFound === 0) {
      result.warnings.push('No se encontraron tests para esta entidad')
    } else if (testsFound < testPaths.length) {
      result.warnings.push(`Solo ${testsFound}/${testPaths.length} tipos de tests encontrados`)
    }

    console.log(chalk.green(`  ✅ ${entity} - Tests validados (${testsFound}/${testPaths.length})`))
  }

  /**
   * 📊 Generar reporte final
   */
  generateReport(): void {
    console.log(chalk.blue('\n📊 REPORTE DE CONSISTENCIA\n'))
    
    const totalEntities = this.entities.length
    const totalValidations = this.results.length
    const passedValidations = this.results.filter(r => r.passed).length
    const failedValidations = totalValidations - passedValidations
    
    console.log(chalk.white(`Total de entidades: ${totalEntities}`))
    console.log(chalk.white(`Total de validaciones: ${totalValidations}`))
    console.log(chalk.green(`Validaciones exitosas: ${passedValidations}`))
    console.log(chalk.red(`Validaciones fallidas: ${failedValidations}`))
    
    const successRate = ((passedValidations / totalValidations) * 100).toFixed(1)
    console.log(chalk.yellow(`Tasa de éxito: ${successRate}%\n`))

    // 📋 Agrupar por fase
    const byPhase = this.results.reduce((acc, result) => {
      if (!acc[result.phase]) acc[result.phase] = []
      acc[result.phase].push(result)
      return acc
    }, {} as Record<ValidationPhase, ValidationResult[]>)

    // 📊 Mostrar resultados por fase
    for (const [phase, results] of Object.entries(byPhase)) {
      const phasePassed = results.filter(r => r.passed).length
      const phaseTotal = results.length
      const phaseRate = ((phasePassed / phaseTotal) * 100).toFixed(1)
      
      console.log(chalk.blue(`📋 ${PHASE_CONFIG[phase as ValidationPhase].name}: ${phasePassed}/${phaseTotal} (${phaseRate}%)`))
      
      // ❌ Mostrar errores
      const errors = results.flatMap(r => r.errors)
      if (errors.length > 0) {
        console.log(chalk.red('  ❌ Errores:'))
        errors.forEach(error => console.log(chalk.red(`    • ${error}`)))
      }
      
      // ⚠️ Mostrar advertencias
      const warnings = results.flatMap(r => r.warnings)
      if (warnings.length > 0) {
        console.log(chalk.yellow('  ⚠️  Advertencias:'))
        warnings.forEach(warning => console.log(chalk.yellow(`    • ${warning}`)))
      }
      
      console.log()
    }

    // 🚨 Recomendaciones finales
    if (failedValidations > 0) {
      console.log(chalk.red('🚨 ACCIÓN REQUERIDA:'))
      console.log(chalk.white('1. Revisa los errores listados arriba'))
      console.log(chalk.white('2. Ejecuta las correcciones necesarias'))
      console.log(chalk.white('3. Vuelve a ejecutar la auditoría'))
      console.log(chalk.white('4. Repite hasta alcanzar 100% de consistencia\n'))
    } else {
      console.log(chalk.green('🎉 ¡FELICITACIONES!'))
      console.log(chalk.white('Todas las validaciones han pasado exitosamente.'))
      console.log(chalk.white('El proyecto mantiene 100% de consistencia.\n'))
    }
  }

  /**
   * 🔧 Convertir a kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
  }
}

/**
 * 🚀 Función principal
 */
async function main() {
  const args = process.argv.slice(2)
  const phaseArg = args.find(arg => arg.startsWith('--phase='))?.split('=')[1] as ValidationPhase
  const entityArg = args.find(arg => arg.startsWith('--entity='))?.split('=')[1]
  
  const auditor = new ConsistencyAuditor()
  
  if (phaseArg) {
    // 🔍 Auditar fase específica
    await auditor.auditPhase(phaseArg, entityArg)
  } else {
    // 🔍 Auditar todas las fases
    const phases: ValidationPhase[] = ['models', 'types', 'payloads', 'validators', 'apis', 'services', 'components', 'pages', 'sidebar', 'testing']
    
    for (const phase of phases) {
      await auditor.auditPhase(phase, entityArg)
    }
  }
  
  auditor.generateReport()
}

// 🚀 Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

export { ConsistencyAuditor }
export type { ValidationPhase, ValidationResult }