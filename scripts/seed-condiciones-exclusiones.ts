/**
 * Script para sembrar datos de condiciones y exclusiones en el nuevo formato simplificado
 *
 * Nuevo formato:
 * - CatalogoCondicion: Items individuales (cada condición es un registro)
 * - CatalogoExclusion: Items individuales (cada exclusión es un registro)
 * - PlantillaCondicionIndependiente: Agrupaciones de condiciones
 * - PlantillaExclusionIndependiente: Agrupaciones de exclusiones
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos de ejemplo basados en el archivo anterior
const condicionesData = [
  // Condiciones Comerciales
  { descripcion: 'Los precios son válidos según el alcance técnico ofertado y plazos estipulados. Cualquier modificación requerida por el cliente será objeto de actualización de oferta.', tipo: 'comercial', categoria: 'general' },
  { descripcion: 'El cliente debe enviar su orden de compra a ventas@gyscontrol.com. Si no recibe confirmación, debe comunicarse con GYS.', tipo: 'comercial', categoria: 'general' },
  { descripcion: 'Los precios ofertados NO incluyen IGV.', tipo: 'comercial', categoria: 'precios' },
  { descripcion: 'No se aceptará anulación total o parcial de órdenes de compra, salvo casos sustentados. Penalidades pueden alcanzar hasta el 100% del valor de la orden.', tipo: 'comercial', categoria: 'precios' },
  // Condiciones de Entrega
  { descripcion: 'El plazo de entrega inicia una vez aclarado técnica-comercialmente el pedido.', tipo: 'entrega', categoria: 'entrega' },
  { descripcion: 'Los plazos de entrega son estimados y pueden variar según disponibilidad de materiales.', tipo: 'entrega', categoria: 'entrega' },
  { descripcion: 'La entrega se realizará en las instalaciones del cliente, salvo acuerdo diferente.', tipo: 'entrega', categoria: 'entrega' },
  // Condiciones Técnicas
  { descripcion: 'Los trabajos se ejecutarán según las especificaciones técnicas acordadas.', tipo: 'tecnica', categoria: 'tecnica' },
  { descripcion: 'El cliente debe proporcionar acceso a las áreas de trabajo en horarios acordados.', tipo: 'tecnica', categoria: 'tecnica' },
  { descripcion: 'GYS no se responsabiliza por equipos o materiales proporcionados por el cliente.', tipo: 'tecnica', categoria: 'tecnica' },
]

const exclusionesData = [
  { descripcion: 'Suministro de licencias para el correcto funcionamiento del sistema', categoria: 'general' },
  { descripcion: 'Calibración de instrumentos', categoria: 'general' },
  { descripcion: 'Planos o diagramas eléctricos/mecánicos completos del sistema', categoria: 'general' },
  { descripcion: 'Obras civiles ni permisos municipales', categoria: 'general' },
  { descripcion: 'Trabajos de albañilería, pintura o acabados', categoria: 'industrial' },
  { descripcion: 'Suministro de energía eléctrica temporal durante la instalación', categoria: 'industrial' },
  { descripcion: 'Transporte de equipos pesados', categoria: 'industrial' },
  { descripcion: 'Gastos de importación y nacionalización', categoria: 'comercial' },
  { descripcion: 'Seguros de transporte internacional', categoria: 'comercial' },
]

async function main() {
  console.log('🚀 Sembrando datos de condiciones y exclusiones...\n')

  // Crear categorías si no existen
  console.log('📂 Creando/verificando categorías...')

  const categoriasCondicion = ['general', 'precios', 'entrega', 'tecnica']
  const categoriasExclusion = ['general', 'industrial', 'comercial']

  const catCondicionMap: Record<string, string> = {}
  const catExclusionMap: Record<string, string> = {}

  for (const nombre of categoriasCondicion) {
    const cat = await prisma.categoriaCondicion.upsert({
      where: { nombre },
      update: {},
      create: { nombre, orden: categoriasCondicion.indexOf(nombre) + 1 }
    })
    catCondicionMap[nombre] = cat.id
    console.log(`   ✓ Categoría condición: ${nombre}`)
  }

  for (const nombre of categoriasExclusion) {
    const cat = await prisma.categoriaExclusion.upsert({
      where: { nombre },
      update: {},
      create: { nombre, orden: categoriasExclusion.indexOf(nombre) + 1 }
    })
    catExclusionMap[nombre] = cat.id
    console.log(`   ✓ Categoría exclusión: ${nombre}`)
  }

  // Crear catálogo de condiciones
  console.log('\n📝 Creando catálogo de condiciones...')
  let condicionCount = 0
  for (const cond of condicionesData) {
    const codigo = `COND-${String(condicionCount + 1).padStart(4, '0')}`
    await prisma.catalogoCondicion.upsert({
      where: { codigo },
      update: {
        descripcion: cond.descripcion,
        tipo: cond.tipo,
        categoriaId: catCondicionMap[cond.categoria],
      },
      create: {
        codigo,
        descripcion: cond.descripcion,
        tipo: cond.tipo,
        categoriaId: catCondicionMap[cond.categoria],
        orden: condicionCount + 1,
      }
    })
    condicionCount++
  }
  console.log(`   ✓ ${condicionCount} condiciones creadas`)

  // Crear catálogo de exclusiones
  console.log('\n📝 Creando catálogo de exclusiones...')
  let exclusionCount = 0
  for (const excl of exclusionesData) {
    const codigo = `EXCL-${String(exclusionCount + 1).padStart(4, '0')}`
    await prisma.catalogoExclusion.upsert({
      where: { codigo },
      update: {
        descripcion: excl.descripcion,
        categoriaId: catExclusionMap[excl.categoria],
      },
      create: {
        codigo,
        descripcion: excl.descripcion,
        categoriaId: catExclusionMap[excl.categoria],
        orden: exclusionCount + 1,
      }
    })
    exclusionCount++
  }
  console.log(`   ✓ ${exclusionCount} exclusiones creadas`)

  // Crear plantillas de ejemplo
  console.log('\n📋 Creando plantillas de ejemplo...')

  // Plantilla de condiciones generales
  const plantillaCond = await prisma.plantillaCondicionIndependiente.create({
    data: {
      nombre: 'Condiciones Generales de Proyecto',
      descripcion: 'Plantilla con condiciones estándar para proyectos industriales',
    }
  })

  // Obtener las primeras 5 condiciones para la plantilla
  const condiciones = await prisma.catalogoCondicion.findMany({ take: 5, orderBy: { orden: 'asc' } })
  for (let i = 0; i < condiciones.length; i++) {
    await prisma.plantillaCondicionItemIndependiente.create({
      data: {
        plantillaCondicionId: plantillaCond.id,
        catalogoCondicionId: condiciones[i].id,
        descripcion: condiciones[i].descripcion,
        tipo: condiciones[i].tipo,
        orden: i + 1,
      }
    })
  }
  console.log(`   ✓ Plantilla condiciones: "${plantillaCond.nombre}" (${condiciones.length} items)`)

  // Plantilla de exclusiones generales
  const plantillaExcl = await prisma.plantillaExclusionIndependiente.create({
    data: {
      nombre: 'Exclusiones Generales',
      descripcion: 'Plantilla con exclusiones estándar para proyectos',
    }
  })

  // Obtener las primeras 4 exclusiones para la plantilla
  const exclusiones = await prisma.catalogoExclusion.findMany({ take: 4, orderBy: { orden: 'asc' } })
  for (let i = 0; i < exclusiones.length; i++) {
    await prisma.plantillaExclusionItemIndependiente.create({
      data: {
        plantillaExclusionId: plantillaExcl.id,
        catalogoExclusionId: exclusiones[i].id,
        descripcion: exclusiones[i].descripcion,
        orden: i + 1,
      }
    })
  }
  console.log(`   ✓ Plantilla exclusiones: "${plantillaExcl.nombre}" (${exclusiones.length} items)`)

  console.log('\n' + '='.repeat(50))
  console.log('✅ DATOS SEMBRADOS CORRECTAMENTE')
  console.log('='.repeat(50))
  console.log(`   Categorías condición: ${categoriasCondicion.length}`)
  console.log(`   Categorías exclusión: ${categoriasExclusion.length}`)
  console.log(`   Condiciones en catálogo: ${condicionCount}`)
  console.log(`   Exclusiones en catálogo: ${exclusionCount}`)
  console.log(`   Plantillas creadas: 2`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
