#!/usr/bin/env tsx

/**
 * Script para restaurar datos de la base de datos GYS
 *
 * Este script restaura los datos extraídos previamente desde un archivo JSON
 * a la base de datos. Es útil para resetear la base de datos durante desarrollo.
 *
 * Uso:
 * npm run restore-data
 * o
 * npx tsx scripts/restore-current-data.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface BackupData {
  metadata: {
    description: string
    timestamp: string
    version: string
    totalRecords: {
      users: number
      clients: number
      catalogEquipment: number
      catalogServices: number
      resources: number
      providers: number
      templates: number
    }
  }
  data: {
    users: any[]
    clients: any[]
    catalogEquipment: any[]
    catalogServices: any[]
    resources: any[]
    providers: any[]
    templates: any[]
    serviceUnits: any[]
    units: any[]
    serviceCategories: any[]
    equipmentCategories: any[]
  }
}

async function restoreData() {
  console.log('🚀 Iniciando restauración de datos...\n')

  // Leer archivo de backup
  const backupPath = path.join(process.cwd(), 'data', 'current-data-2025-09-24T19-31-01-735Z.json')

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Archivo de backup no encontrado:', backupPath)
    console.log('Ejecuta primero el script de extracción: npm run extract-data')
    process.exit(1)
  }

  const backupData: BackupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

  console.log('📊 Información del backup:')
  console.log(`   Descripción: ${backupData.metadata.description}`)
  console.log(`   Timestamp: ${backupData.metadata.timestamp}`)
  console.log(`   Registros totales:`, backupData.metadata.totalRecords)
  console.log()

  try {
    // Limpiar datos existentes (orden inverso de dependencias)
    console.log('🧹 Limpiando datos existentes...')

    // Limpiar tablas con dependencias primero
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionExclusion" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionCondicion" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionEdt" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionTarea" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionGastoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionGasto" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionServicioItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionServicio" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionEquipoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionEquipo" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Cotizacion" CASCADE`

    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoCronograma" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoFase" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoTarea" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoSubtarea" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoDependenciaTarea" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoEdt" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoCronograma" CASCADE`

    await prisma.$executeRaw`TRUNCATE TABLE "ListaEquipoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ListaEquipo" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PedidoEquipoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PedidoEquipo" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionProveedorItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CotizacionProveedor" CASCADE`

    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoGastoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoGasto" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoServicioItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoServicio" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoEquipoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ProyectoEquipo" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Proyecto" CASCADE`

    await prisma.$executeRaw`TRUNCATE TABLE "Valorizacion" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "RegistroHoras" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ListaRequerimientoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "ListaRequerimiento" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PaqueteCompraItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PaqueteCompra" CASCADE`

    await prisma.$executeRaw`TRUNCATE TABLE "Tarea" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Subtarea" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "DependenciaTarea" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "AsignacionRecurso" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "RegistroProgreso" CASCADE`

    // Limpiar plantillas
    await prisma.$executeRaw`TRUNCATE TABLE "PlantillaGastoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PlantillaGasto" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PlantillaServicioItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PlantillaServicio" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PlantillaEquipoItem" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "PlantillaEquipo" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Plantilla" CASCADE`

    // Limpiar catálogos
    await prisma.$executeRaw`TRUNCATE TABLE "CatalogoServicio" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CatalogoEquipo" CASCADE`

    // Limpiar maestros
    await prisma.$executeRaw`TRUNCATE TABLE "Proveedor" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Cliente" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Recurso" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "UnidadServicio" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Unidad" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CategoriaServicio" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CategoriaEquipo" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "NivelServicio" CASCADE`

    // Limpiar usuarios y sesiones
    await prisma.$executeRaw`TRUNCATE TABLE "CrmActividad" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "CrmOportunidad" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Account" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "Session" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "VerificationToken" CASCADE`
    await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`

    console.log('✅ Limpieza completada\n')

    // Restaurar datos (orden de dependencias)
    console.log('📥 Restaurando datos...\n')

    // 1. Restaurar unidades
    console.log('   ↳ Restaurando unidades...')
    for (const unit of backupData.data.units) {
      await prisma.unidad.create({ data: unit })
    }

    // 2. Restaurar categorías de equipo
    console.log('   ↳ Restaurando categorías de equipo...')
    for (const category of backupData.data.equipmentCategories) {
      await prisma.categoriaEquipo.create({ data: category })
    }

    // 3. Restaurar categorías de servicio
    console.log('   ↳ Restaurando categorías de servicio...')
    for (const category of backupData.data.serviceCategories) {
      await prisma.categoriaServicio.create({ data: category })
    }

    // 4. Restaurar unidades de servicio
    console.log('   ↳ Restaurando unidades de servicio...')
    for (const unit of backupData.data.serviceUnits) {
      await prisma.unidadServicio.create({ data: unit })
    }

    // 5. Restaurar recursos
    console.log('   ↳ Restaurando recursos...')
    for (const resource of backupData.data.resources) {
      await prisma.recurso.create({ data: resource })
    }

    // 6. Restaurar proveedores
    console.log('   ↳ Restaurando proveedores...')
    for (const provider of backupData.data.providers) {
      await prisma.proveedor.create({ data: provider })
    }

    // 7. Restaurar usuarios
    console.log('   ↳ Restaurando usuarios...')
    for (const user of backupData.data.users) {
      await prisma.user.create({ data: user })
    }

    // 8. Restaurar clientes
    console.log('   ↳ Restaurando clientes...')
    for (const client of backupData.data.clients) {
      await prisma.cliente.create({ data: client })
    }

    // 9. Restaurar catálogo de equipos
    console.log('   ↳ Restaurando catálogo de equipos...')
    for (const equipment of backupData.data.catalogEquipment) {
      await prisma.catalogoEquipo.create({ data: equipment })
    }

    // 10. Restaurar catálogo de servicios
    console.log('   ↳ Restaurando catálogo de servicios...')
    for (const service of backupData.data.catalogServices) {
      await prisma.catalogoServicio.create({ data: service })
    }

    // 11. Restaurar plantillas (si existen)
    if (backupData.data.templates.length > 0) {
      console.log('   ↳ Restaurando plantillas...')
      for (const template of backupData.data.templates) {
        await prisma.plantilla.create({ data: template })
      }
    }

    console.log('\n✅ Restauración completada exitosamente!')
    console.log(`📊 Resumen de restauración:`)
    console.log(`   • ${backupData.metadata.totalRecords.users} usuarios`)
    console.log(`   • ${backupData.metadata.totalRecords.clients} clientes`)
    console.log(`   • ${backupData.metadata.totalRecords.catalogEquipment} equipos en catálogo`)
    console.log(`   • ${backupData.metadata.totalRecords.catalogServices} servicios en catálogo`)
    console.log(`   • ${backupData.metadata.totalRecords.resources} recursos`)
    console.log(`   • ${backupData.metadata.totalRecords.providers} proveedores`)
    console.log(`   • ${backupData.metadata.totalRecords.templates} plantillas`)

  } catch (error) {
    console.error('❌ Error durante la restauración:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar restauración
restoreData()
  .then(() => {
    console.log('\n🎉 Proceso de restauración finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })