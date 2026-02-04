/**
 * Script para corregir las referencias edtId en ProyectoEdt
 *
 * El problema: Los ProyectoEdt tienen nombre correcto (ING, PLC, CON)
 * pero el edtId apunta al EDT incorrecto del catálogo (todos apuntan a GES)
 *
 * La solución: Buscar en el catálogo el EDT que coincida con el nombre
 * y actualizar el edtId para que apunte al correcto
 *
 * Uso: npx tsx scripts/fix-edt-references.ts
 */

import { prisma } from '../src/lib/prisma'

async function fixEdtReferences() {
  console.log('🔧 Iniciando corrección de referencias EDT...\n')

  // 1. Obtener todos los EDTs del catálogo
  const catalogoEdts = await prisma.edt.findMany({
    select: { id: true, nombre: true }
  })

  console.log('📚 EDTs en catálogo:')
  catalogoEdts.forEach(e => console.log(`   - ${e.nombre} (${e.id})`))
  console.log('')

  // Crear mapa de nombre -> id del catálogo
  const nombreToEdtId = new Map<string, string>()
  catalogoEdts.forEach(e => {
    nombreToEdtId.set(e.nombre.toUpperCase().trim(), e.id)
  })

  // 2. Obtener todos los ProyectoEdt con edtId incorrecto o null
  const proyectoEdts = await prisma.proyectoEdt.findMany({
    select: {
      id: true,
      nombre: true,
      edtId: true,
      edt: { select: { nombre: true } }
    }
  })

  console.log(`📋 ProyectoEdts encontrados: ${proyectoEdts.length}\n`)

  let corregidos = 0
  let yaCorrectos = 0
  let sinCoincidencia = 0

  for (const proyectoEdt of proyectoEdts) {
    const nombreNormalizado = proyectoEdt.nombre?.toUpperCase().trim() || ''
    const edtIdCorrecto = nombreToEdtId.get(nombreNormalizado)

    if (!edtIdCorrecto) {
      console.log(`⚠️  ${proyectoEdt.nombre}: No encontrado en catálogo`)
      sinCoincidencia++
      continue
    }

    if (proyectoEdt.edtId === edtIdCorrecto) {
      console.log(`✅ ${proyectoEdt.nombre}: Ya correcto (${proyectoEdt.edt?.nombre})`)
      yaCorrectos++
      continue
    }

    // Actualizar el edtId
    console.log(`🔄 ${proyectoEdt.nombre}: Corrigiendo edtId de "${proyectoEdt.edt?.nombre || 'null'}" a "${nombreNormalizado}"`)

    await prisma.proyectoEdt.update({
      where: { id: proyectoEdt.id },
      data: { edtId: edtIdCorrecto }
    })

    corregidos++
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Resumen:')
  console.log(`   ✅ Ya correctos: ${yaCorrectos}`)
  console.log(`   🔄 Corregidos: ${corregidos}`)
  console.log(`   ⚠️  Sin coincidencia en catálogo: ${sinCoincidencia}`)
  console.log('='.repeat(50))

  if (corregidos > 0) {
    console.log('\n✅ Corrección completada exitosamente!')
  } else if (yaCorrectos === proyectoEdts.length) {
    console.log('\n✅ Todos los EDTs ya estaban correctos!')
  }
}

// Ejecutar
fixEdtReferences()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
