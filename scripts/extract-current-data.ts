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
      prisma.user.findMany(),

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