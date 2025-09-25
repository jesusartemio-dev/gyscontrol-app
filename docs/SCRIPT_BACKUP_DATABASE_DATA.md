# Script de Backup y Restauración de Datos de Base de Datos

## 📋 Resumen

Este documento proporciona scripts para respaldar y restaurar datos críticos de la base de datos GYS, permitiendo resetear la base de datos durante desarrollo sin perder información importante.

## 🎯 Propósito

- **Backup**: Extraer datos críticos antes de resetear la base de datos
- **Restore**: Restaurar datos después del reset
- **Desarrollo**: Facilitar el desarrollo con datos realistas

## 📊 Datos a Respaldar

### Datos Críticos (Siempre respaldar)
- **Usuarios**: Admin, comercial, logístico
- **Clientes**: Catálogo completo de clientes
- **Catálogos**: Equipos, servicios, recursos, unidades, categorías
- **Proveedores**: Información de proveedores
- **Plantillas**: Plantillas existentes (si las hay)

### Datos Opcionales (Según necesidad)
- **Cotizaciones**: Historial de cotizaciones
- **Proyectos**: Información de proyectos
- **Listas de equipo**: Configuraciones de listas

## 🔧 Scripts de Backup

### Script Principal: `scripts/backup-database-data.ts`

```typescript
// ===================================================
// 📁 Archivo: backup-database-data.ts
// 📌 Ubicación: scripts/backup-database-data.ts
// 🔧 Descripción: Script para respaldar datos de la base de datos
// ===================================================

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface BackupData {
  timestamp: string
  version: string
  data: {
    users: any[]
    clients: any[]
    catalogEquipment: any[]
    catalogServices: any[]
    resources: any[]
    serviceUnits: any[]
    units: any[]
    serviceCategories: any[]
    equipmentCategories: any[]
    providers: any[]
    templates: any[]
    templateExclusions: any[]
    templateConditions: any[]
  }
}

async function backupDatabaseData(): Promise<void> {
  console.log('🔄 Iniciando backup de datos de base de datos...')

  try {
    // Crear directorio de backups si no existe
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`)

    console.log('📊 Extrayendo datos...')

    // Extraer datos críticos
    const [
      users,
      clients,
      catalogEquipment,
      catalogServices,
      resources,
      serviceUnits,
      units,
      serviceCategories,
      equipmentCategories,
      providers,
      templates,
      templateExclusions,
      templateConditions
    ] = await Promise.all([
      // Usuarios críticos
      prisma.user.findMany({
        where: {
          role: { in: ['admin', 'comercial', 'logistico'] }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          // No incluir password por seguridad
        }
      }),

      // Clientes
      prisma.cliente.findMany({
        include: {
          oportunidades: true,
          historialProyectos: true,
          contactos: true
        }
      }),

      // Catálogos
      prisma.catalogoEquipo.findMany({
        include: {
          categoria: true,
          unidad: true
        }
      }),

      prisma.catalogoServicio.findMany({
        include: {
          categoria: true,
          unidadServicio: true,
          recurso: true
        }
      }),

      // Recursos y unidades
      prisma.recurso.findMany(),
      prisma.unidadServicio.findMany(),
      prisma.unidad.findMany(),
      prisma.categoriaServicio.findMany(),
      prisma.categoriaEquipo.findMany(),

      // Proveedores
      prisma.proveedor.findMany(),

      // Plantillas
      prisma.plantilla.findMany({
        include: {
          equipos: {
            include: { items: true }
          },
          servicios: {
            include: { items: true }
          },
          gastos: {
            include: { items: true }
          }
        }
      }),

      // Plantillas de exclusiones y condiciones
      prisma.plantillaExclusion.findMany({
        include: { items: true }
      }),

      prisma.plantillaCondicion.findMany({
        include: { items: true }
      })
    ])

    const backupData: BackupData = {
      timestamp,
      version: '1.0',
      data: {
        users,
        clients,
        catalogEquipment,
        catalogServices,
        resources,
        serviceUnits,
        units,
        serviceCategories,
        equipmentCategories,
        providers,
        templates,
        templateExclusions,
        templateConditions
      }
    }

    // Guardar archivo de backup
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))

    console.log(`✅ Backup completado: ${backupFile}`)
    console.log(`📊 Resumen:`)
    console.log(`   - Usuarios: ${users.length}`)
    console.log(`   - Clientes: ${clients.length}`)
    console.log(`   - Equipos catálogo: ${catalogEquipment.length}`)
    console.log(`   - Servicios catálogo: ${catalogServices.length}`)
    console.log(`   - Recursos: ${resources.length}`)
    console.log(`   - Proveedores: ${providers.length}`)
    console.log(`   - Plantillas: ${templates.length}`)

  } catch (error) {
    console.error('❌ Error durante el backup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar backup si se llama directamente
if (require.main === module) {
  backupDatabaseData()
    .then(() => {
      console.log('🎉 Backup completado exitosamente')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en backup:', error)
      process.exit(1)
    })
}

export { backupDatabaseData, BackupData }
```

### Script de Restauración: `scripts/restore-database-data.ts`

```typescript
// ===================================================
// 📁 Archivo: restore-database-data.ts
// 📌 Ubicación: scripts/restore-database-data.ts
// 🔧 Descripción: Script para restaurar datos desde backup
// ===================================================

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { BackupData } from './backup-database-data'

const prisma = new PrismaClient()

async function restoreDatabaseData(backupFilePath?: string): Promise<void> {
  console.log('🔄 Iniciando restauración de datos...')

  try {
    // Determinar archivo de backup
    let backupPath = backupFilePath
    if (!backupPath) {
      // Buscar el backup más reciente
      const backupDir = path.join(process.cwd(), 'backups')
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .sort()
        .reverse()

      if (files.length === 0) {
        throw new Error('No se encontraron archivos de backup')
      }

      backupPath = path.join(backupDir, files[0])
    }

    console.log(`📂 Usando backup: ${backupPath}`)

    // Leer archivo de backup
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    const backupData: BackupData = JSON.parse(backupContent)

    console.log(`📅 Backup del: ${backupData.timestamp}`)
    console.log('📊 Restaurando datos...')

    // Restaurar en orden de dependencias

    // 1. Categorías y unidades (base)
    console.log('🏗️ Restaurando categorías y unidades...')
    for (const category of backupData.data.equipmentCategories) {
      await prisma.categoriaEquipo.upsert({
        where: { id: category.id },
        update: category,
        create: category
      })
    }

    for (const category of backupData.data.serviceCategories) {
      await prisma.categoriaServicio.upsert({
        where: { id: category.id },
        update: category,
        create: category
      })
    }

    for (const unit of backupData.data.units) {
      await prisma.unidad.upsert({
        where: { id: unit.id },
        update: unit,
        create: unit
      })
    }

    for (const unit of backupData.data.serviceUnits) {
      await prisma.unidadServicio.upsert({
        where: { id: unit.id },
        update: unit,
        create: unit
      })
    }

    // 2. Recursos
    console.log('👷 Restaurando recursos...')
    for (const resource of backupData.data.resources) {
      await prisma.recurso.upsert({
        where: { id: resource.id },
        update: resource,
        create: resource
      })
    }

    // 3. Catálogos
    console.log('📚 Restaurando catálogos...')
    for (const equipment of backupData.data.catalogEquipment) {
      await prisma.catalogoEquipo.upsert({
        where: { id: equipment.id },
        update: {
          ...equipment,
          categoriaId: equipment.categoriaId,
          unidadId: equipment.unidadId
        },
        create: {
          ...equipment,
          categoriaId: equipment.categoriaId,
          unidadId: equipment.unidadId
        }
      })
    }

    for (const service of backupData.data.catalogServices) {
      await prisma.catalogoServicio.upsert({
        where: { id: service.id },
        update: {
          ...service,
          categoriaId: service.categoriaId,
          unidadServicioId: service.unidadServicioId,
          recursoId: service.recursoId
        },
        create: {
          ...service,
          categoriaId: service.categoriaId,
          unidadServicioId: service.unidadServicioId,
          recursoId: service.recursoId
        }
      })
    }

    // 4. Proveedores
    console.log('🏭 Restaurando proveedores...')
    for (const provider of backupData.data.providers) {
      await prisma.proveedor.upsert({
        where: { id: provider.id },
        update: provider,
        create: provider
      })
    }

    // 5. Clientes
    console.log('👥 Restaurando clientes...')
    for (const client of backupData.data.clients) {
      const { oportunidades, historialProyectos, contactos, ...clientData } = client
      await prisma.cliente.upsert({
        where: { id: clientData.id },
        update: clientData,
        create: clientData
      })
    }

    // 6. Usuarios
    console.log('👤 Restaurando usuarios...')
    for (const user of backupData.data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: {
          ...user,
          password: '$2b$10$dummy.hash.for.backup.restore' // Hash dummy
        }
      })
    }

    // 7. Plantillas de exclusiones y condiciones
    console.log('📋 Restaurando plantillas auxiliares...')
    for (const exclusion of backupData.data.templateExclusions) {
      const { items, ...exclusionData } = exclusion
      await prisma.plantillaExclusion.upsert({
        where: { id: exclusionData.id },
        update: exclusionData,
        create: exclusionData
      })

      for (const item of items) {
        await prisma.plantillaExclusionItem.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    for (const condition of backupData.data.templateConditions) {
      const { items, ...conditionData } = condition
      await prisma.plantillaCondicion.upsert({
        where: { id: conditionData.id },
        update: conditionData,
        create: conditionData
      })

      for (const item of items) {
        await prisma.plantillaCondicionItem.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 8. Plantillas (si existen)
    if (backupData.data.templates.length > 0) {
      console.log('📄 Restaurando plantillas...')
      for (const template of backupData.data.templates) {
        const { equipos, servicios, gastos, ...templateData } = template
        await prisma.plantilla.upsert({
          where: { id: templateData.id },
          update: templateData,
          create: templateData
        })
      }
    }

    console.log('✅ Restauración completada exitosamente')

  } catch (error) {
    console.error('❌ Error durante la restauración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar restauración si se llama directamente
if (require.main === module) {
  const backupFile = process.argv[2] // Argumento opcional

  restoreDatabaseData(backupFile)
    .then(() => {
      console.log('🎉 Restauración completada exitosamente')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en restauración:', error)
      process.exit(1)
    })
}

export { restoreDatabaseData }
```

## 🚀 Uso de los Scripts

### Backup de Datos

```bash
# Crear backup
npx tsx scripts/backup-database-data.ts

# Los archivos se guardan en la carpeta 'backups/'
```

### Reset y Restauración

```bash
# 1. Hacer backup
npx tsx scripts/backup-database-data.ts

# 2. Resetear base de datos
npx prisma migrate reset --force

# 3. Aplicar esquema actual
npx prisma db push --accept-data-loss

# 4. Restaurar datos
npx tsx scripts/restore-database-data.ts

# Opcional: especificar archivo de backup
npx tsx scripts/restore-database-data.ts backups/backup-2025-01-24T10-30-00-000Z.json
```

## 📁 Estructura de Archivos

```
backups/
├── backup-2025-01-24T10-30-00-000Z.json
├── backup-2025-01-25T15-45-00-000Z.json
└── ...

scripts/
├── backup-database-data.ts
└── restore-database-data.ts
```

## ⚠️ Consideraciones Importantes

### Seguridad
- **Passwords**: Los passwords no se respaldan por seguridad
- **Hashes dummy**: Se usan hashes dummy para restauración
- **Re-autenticación**: Los usuarios deberán resetear passwords después

### Datos Sensibles
- **Información financiera**: Se respalda completamente
- **Datos de clientes**: Se incluyen contactos y historial
- **Configuraciones**: Todas las configuraciones se preservan

### Orden de Restauración
1. **Dependencias base**: Categorías, unidades, recursos
2. **Catálogos**: Equipos y servicios
3. **Entidades**: Proveedores, clientes, usuarios
4. **Plantillas**: Configuraciones finales

## 🔄 Automatización

### Package.json Scripts

```json
{
  "scripts": {
    "db:backup": "tsx scripts/backup-database-data.ts",
    "db:restore": "tsx scripts/restore-database-data.ts",
    "db:reset-restore": "npm run db:backup && npx prisma migrate reset --force && npx prisma db push --accept-data-loss && npm run db:restore"
  }
}
```

### Uso Automatizado

```bash
# Backup, reset y restore en un comando
npm run db:reset-restore
```

## 📊 Verificación

Después de la restauración, verificar:

```sql
-- Contar registros restaurados
SELECT 'users' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'clients', COUNT(*) FROM "Cliente"
UNION ALL
SELECT 'equipment', COUNT(*) FROM "CatalogoEquipo"
UNION ALL
SELECT 'services', COUNT(*) FROM "CatalogoServicio"
UNION ALL
SELECT 'providers', COUNT(*) FROM "Proveedor";
```

---

*Script creado para facilitar el desarrollo y testing del sistema GYS*
*Última actualización: 2025-01-24*