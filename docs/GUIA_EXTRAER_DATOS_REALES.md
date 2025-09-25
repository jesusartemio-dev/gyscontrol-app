# Guía para Extraer Datos Reales de la Base de Datos

## 🎯 Objetivo

Extraer los datos **reales** que tienes actualmente en tu base de datos limpia y crear un script de restauración personalizado.

## 📊 Script para Extraer Datos

### Archivo: `scripts/extract-current-data.ts`

```typescript
// ===================================================
// 📁 Archivo: scripts/extract-current-data.ts
// 🔧 Descripción: Extrae datos actuales de la base de datos
// ===================================================

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function extractCurrentData() {
  console.log('🔍 Extrayendo datos actuales de la base de datos...')

  try {
    // Crear directorio si no existe
    const outputDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = path.join(outputDir, `current-data-${timestamp}.json`)

    console.log('📊 Consultando base de datos...')

    // Extraer TODOS los datos actuales
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
      // Usuarios
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
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

      // Plantillas auxiliares
      prisma.plantillaExclusion.findMany({
        include: { items: true }
      }),

      prisma.plantillaCondicion.findMany({
        include: { items: true }
      })
    ])

    const extractedData = {
      metadata: {
        description: 'Datos reales extraídos de la base de datos GYS',
        timestamp,
        version: '1.0',
        totalRecords: {
          users: users.length,
          clients: clients.length,
          catalogEquipment: catalogEquipment.length,
          catalogServices: catalogServices.length,
          resources: resources.length,
          providers: providers.length,
          templates: templates.length
        }
      },
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

    // Guardar archivo
    fs.writeFileSync(outputFile, JSON.stringify(extractedData, null, 2))

    console.log(`✅ Extracción completada: ${outputFile}`)
    console.log('📊 Resumen:')
    console.log(`   - Usuarios: ${users.length}`)
    console.log(`   - Clientes: ${clients.length}`)
    console.log(`   - Equipos catálogo: ${catalogEquipment.length}`)
    console.log(`   - Servicios catálogo: ${catalogServices.length}`)
    console.log(`   - Recursos: ${resources.length}`)
    console.log(`   - Proveedores: ${providers.length}`)
    console.log(`   - Plantillas: ${templates.length}`)

    // Mostrar datos de ejemplo
    if (users.length > 0) {
      console.log('\n👤 Usuarios encontrados:')
      users.forEach(user => console.log(`   - ${user.name} (${user.email}) - ${user.role}`))
    }

    if (clients.length > 0) {
      console.log('\n🏢 Clientes encontrados:')
      clients.slice(0, 5).forEach(client => console.log(`   - ${client.nombre} (${client.codigo})`))
      if (clients.length > 5) console.log(`   ... y ${clients.length - 5} más`)
    }

  } catch (error) {
    console.error('❌ Error durante la extracción:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  extractCurrentData()
    .then(() => {
      console.log('\n🎉 Extracción completada exitosamente')
      console.log('📁 Revisa la carpeta "data/" para el archivo generado')
    })
    .catch((error) => {
      console.error('💥 Error en extracción:', error)
      process.exit(1)
    })
}

export { extractCurrentData }
```

## 🚀 Cómo Usar

### 1. Crear el Archivo del Script

Crea el archivo `scripts/extract-current-data.ts` con el contenido anterior.

### 2. Ejecutar la Extracción

```bash
npx tsx scripts/extract-current-data.ts
```

### 3. Verificar el Resultado

El script creará un archivo en `data/current-data-[timestamp].json` con todos tus datos reales.

### 4. Crear Script de Restauración

Una vez que tengas el archivo JSON, puedes crear un script de restauración personalizado basado en tus datos reales.

## 📁 Estructura Esperada

```
data/
├── current-data-2025-01-24T19-30-00-000Z.json
└── ...

scripts/
├── extract-current-data.ts
└── restore-my-data.ts (crear basado en el JSON)
```

## 📊 Qué Datos Extraerá

El script extraerá **exactamente** lo que tienes en tu base de datos:

- ✅ **Usuarios reales** con sus roles
- ✅ **Clientes reales** con toda su información
- ✅ **Catálogos reales** de equipos y servicios
- ✅ **Recursos reales** con costos
- ✅ **Proveedores reales**
- ✅ **Plantillas reales** (si existen)
- ✅ **Configuraciones reales** de exclusiones y condiciones

## 🎯 Resultado Esperado

Después de ejecutar, verás algo como:

```
🔍 Extrayendo datos actuales de la base de datos...
📊 Consultando base de datos...
✅ Extracción completada: data/current-data-2025-01-24T19-30-00-000Z.json
📊 Resumen:
   - Usuarios: 3
   - Clientes: 25
   - Equipos catálogo: 150
   - Servicios catálogo: 80
   - Recursos: 12
   - Proveedores: 15
   - Plantillas: 5

👤 Usuarios encontrados:
   - Administrador GYS (admin@gys.com) - admin
   - Usuario Comercial (comercial@gys.com) - comercial
   - Usuario Logístico (logistico@gys.com) - logistico

🏢 Clientes encontrados:
   - MINERA VOLCAN (VLC)
   - TERNA ENERGY PERÚ (TEP)
   - ENEL GENERACIÓN PERÚ (ENE)
   ... y 22 más
```

## 🔄 Próximos Pasos

1. **Extraer datos**: Ejecuta el script
2. **Revisar JSON**: Verifica que contenga tus datos reales
3. **Crear script de restauración**: Basado en el JSON generado
4. **Probar**: Reset y restore para verificar

¿Quieres que ejecute el script de extracción ahora mismo, o prefieres crear el archivo primero y ejecutarlo manualmente?