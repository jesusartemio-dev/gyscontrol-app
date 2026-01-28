/**
 * Script de migración: Plantillas a Catálogo de Condiciones y Exclusiones
 *
 * Este script migra los datos existentes del archivo temp-plantillas-storage.json
 * a las nuevas tablas de catálogo en la base de datos.
 *
 * Ejecutar: npx tsx scripts/migrate-condiciones-exclusiones.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface PlantillaItem {
  id: string
  descripcion: string
  tipo?: string
  orden: number
  activo: boolean
}

interface PlantillaCondicion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  tipo?: string
  activo: boolean
  orden: number
  items: PlantillaItem[]
}

interface PlantillaExclusion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  activo: boolean
  orden: number
  items: PlantillaItem[]
}

async function main() {
  console.log('🚀 Iniciando migración de condiciones y exclusiones...\n')

  // Leer datos existentes
  const storagePath = path.join(process.cwd(), 'temp-plantillas-storage.json')

  if (!fs.existsSync(storagePath)) {
    console.log('⚠️  No se encontró el archivo temp-plantillas-storage.json')
    console.log('   Creando categorías por defecto...\n')
    await createDefaultCategories()
    return
  }

  const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'))
  const condiciones: PlantillaCondicion[] = data.condiciones || []
  const exclusiones: PlantillaExclusion[] = data.exclusiones || []

  console.log(`📋 Encontrados: ${condiciones.length} condiciones, ${exclusiones.length} exclusiones\n`)

  // Crear categorías
  console.log('📂 Creando categorías...')
  const categoriasCondicion = new Set<string>()
  const categoriasExclusion = new Set<string>()

  condiciones.forEach(c => {
    if (c.categoria) categoriasCondicion.add(c.categoria)
  })
  exclusiones.forEach(e => {
    if (e.categoria) categoriasExclusion.add(e.categoria)
  })

  const categoriaCondicionMap: Record<string, string> = {}
  const categoriaExclusionMap: Record<string, string> = {}

  // Crear categorías de condiciones
  let orden = 1
  for (const nombre of categoriasCondicion) {
    try {
      const existing = await prisma.categoriaCondicion.findUnique({ where: { nombre } })
      if (existing) {
        categoriaCondicionMap[nombre] = existing.id
        console.log(`   ✓ Categoría condición existente: ${nombre}`)
      } else {
        const cat = await prisma.categoriaCondicion.create({
          data: { nombre, orden: orden++ }
        })
        categoriaCondicionMap[nombre] = cat.id
        console.log(`   + Categoría condición creada: ${nombre}`)
      }
    } catch (error) {
      console.error(`   ✗ Error creando categoría condición ${nombre}:`, error)
    }
  }

  // Crear categorías de exclusiones
  orden = 1
  for (const nombre of categoriasExclusion) {
    try {
      const existing = await prisma.categoriaExclusion.findUnique({ where: { nombre } })
      if (existing) {
        categoriaExclusionMap[nombre] = existing.id
        console.log(`   ✓ Categoría exclusión existente: ${nombre}`)
      } else {
        const cat = await prisma.categoriaExclusion.create({
          data: { nombre, orden: orden++ }
        })
        categoriaExclusionMap[nombre] = cat.id
        console.log(`   + Categoría exclusión creada: ${nombre}`)
      }
    } catch (error) {
      console.error(`   ✗ Error creando categoría exclusión ${nombre}:`, error)
    }
  }

  // Migrar condiciones
  console.log('\n📝 Migrando condiciones...')
  let migratedCondiciones = 0
  let migratedCondicionItems = 0

  for (const condicion of condiciones) {
    try {
      const codigo = `COND-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase()

      const created = await prisma.catalogoCondicion.create({
        data: {
          codigo,
          nombre: condicion.nombre,
          descripcion: condicion.descripcion,
          categoriaId: condicion.categoria ? categoriaCondicionMap[condicion.categoria] : null,
          tipo: condicion.tipo,
          activo: condicion.activo,
          orden: condicion.orden,
          items: {
            create: condicion.items.map((item, idx) => ({
              descripcion: item.descripcion,
              tipo: item.tipo,
              orden: item.orden || idx + 1,
              activo: item.activo
            }))
          }
        }
      })

      migratedCondiciones++
      migratedCondicionItems += condicion.items.length
      console.log(`   + ${condicion.nombre} (${condicion.items.length} items)`)
    } catch (error) {
      console.error(`   ✗ Error migrando condición "${condicion.nombre}":`, error)
    }
  }

  // Migrar exclusiones
  console.log('\n📝 Migrando exclusiones...')
  let migratedExclusiones = 0
  let migratedExclusionItems = 0

  for (const exclusion of exclusiones) {
    try {
      const codigo = `EXCL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase()

      const created = await prisma.catalogoExclusion.create({
        data: {
          codigo,
          nombre: exclusion.nombre,
          descripcion: exclusion.descripcion,
          categoriaId: exclusion.categoria ? categoriaExclusionMap[exclusion.categoria] : null,
          activo: exclusion.activo,
          orden: exclusion.orden,
          items: {
            create: exclusion.items.map((item, idx) => ({
              descripcion: item.descripcion,
              orden: item.orden || idx + 1,
              activo: item.activo
            }))
          }
        }
      })

      migratedExclusiones++
      migratedExclusionItems += exclusion.items.length
      console.log(`   + ${exclusion.nombre} (${exclusion.items.length} items)`)
    } catch (error) {
      console.error(`   ✗ Error migrando exclusión "${exclusion.nombre}":`, error)
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(50))
  console.log('✅ MIGRACIÓN COMPLETADA')
  console.log('='.repeat(50))
  console.log(`   Condiciones migradas: ${migratedCondiciones} (${migratedCondicionItems} items)`)
  console.log(`   Exclusiones migradas: ${migratedExclusiones} (${migratedExclusionItems} items)`)
  console.log('\n💡 Puedes eliminar el archivo temp-plantillas-storage.json si todo está correcto.')
}

async function createDefaultCategories() {
  // Categorías de condiciones por defecto
  const defaultCondicionCategories = ['General', 'Precios', 'Entrega', 'Técnica']
  const defaultExclusionCategories = ['General', 'Industrial', 'Comercial']

  console.log('📂 Creando categorías por defecto...')

  for (let i = 0; i < defaultCondicionCategories.length; i++) {
    const nombre = defaultCondicionCategories[i]
    try {
      await prisma.categoriaCondicion.upsert({
        where: { nombre },
        update: {},
        create: { nombre, orden: i + 1 }
      })
      console.log(`   + Categoría condición: ${nombre}`)
    } catch (error) {
      console.error(`   ✗ Error creando categoría condición ${nombre}:`, error)
    }
  }

  for (let i = 0; i < defaultExclusionCategories.length; i++) {
    const nombre = defaultExclusionCategories[i]
    try {
      await prisma.categoriaExclusion.upsert({
        where: { nombre },
        update: {},
        create: { nombre, orden: i + 1 }
      })
      console.log(`   + Categoría exclusión: ${nombre}`)
    } catch (error) {
      console.error(`   ✗ Error creando categoría exclusión ${nombre}:`, error)
    }
  }

  console.log('\n✅ Categorías por defecto creadas.')
}

main()
  .catch((e) => {
    console.error('❌ Error en la migración:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
