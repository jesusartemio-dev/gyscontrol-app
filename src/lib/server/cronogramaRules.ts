// ===================================================
// 📁 Archivo: cronogramaRules.ts
// 📌 Ubicación: src/lib/server
// 🔧 Descripción: Funciones de validación que usan Prisma (server-only)
// ===================================================

import "server-only";
import { prisma } from '@/lib/prisma'

/**
  * GYS-GEN-16: Función de Roll-up Automático
  * Asegura consistencia de horas en toda la jerarquía
  */
export async function ejecutarRollupHoras(cronogramaId: string, prismaClient = prisma): Promise<{ exito: boolean; correcciones: string[] }> {
  const correcciones: string[] = []

  try {
    console.log(`🔄 GYS-GEN-16: Iniciando roll-up de horas para cronograma ${cronogramaId}`)

    // 1. Roll-up tareas → actividades
    console.log('📊 Paso 1: Roll-up tareas → actividades')
    const actividadesConTareas = await prismaClient.cotizacionActividad.findMany({
      where: {
        cotizacionEdt: { cotizacionId: cronogramaId }
      },
      include: { cotizacionTarea: true }
    })

    console.log(`📊 Encontradas ${actividadesConTareas.length} actividades con tareas`)

    for (const actividad of actividadesConTareas) {
      const tareasHoras = actividad.cotizacionTarea.map((t: any) => ({
        nombre: t.nombre,
        horas: Number(t.horasEstimadas || 0)
      }))
      const sumaTareas = tareasHoras.reduce((sum: number, t: any) => sum + t.horas, 0)
      const horasActuales = Number(actividad.horasEstimadas || 0)

      console.log(`📊 Actividad "${actividad.nombre}":`)
      console.log(`   - Tareas: ${tareasHoras.map((t: any) => `${t.nombre}(${t.horas}h)`).join(', ')}`)
      console.log(`   - Suma tareas: ${sumaTareas}h`)
      console.log(`   - Horas actuales: ${horasActuales}h`)
      console.log(`   - Diferencia: ${Math.abs(horasActuales - sumaTareas)}`)

      if (Math.abs(horasActuales - sumaTareas) > 0.01) {
        console.log(`🔄 Actualizando actividad ${actividad.nombre}: ${horasActuales}h → ${sumaTareas}h`)
        await prismaClient.cotizacionActividad.update({
          where: { id: actividad.id },
          data: { horasEstimadas: sumaTareas }
        })
        correcciones.push(`Actividad ${actividad.nombre}: ${horasActuales}h → ${sumaTareas}h`)
      } else {
        console.log(`✅ Actividad ${actividad.nombre} ya está correcta: ${horasActuales}h`)
      }
    }

    // 2. Roll-up actividades → EDTs
    console.log('📊 Paso 2: Roll-up actividades → EDTs')
    const edts = await prismaClient.cotizacionEdt.findMany({
      where: { cotizacionId: cronogramaId },
      include: { cotizacionActividad: true }
    })

    console.log(`📊 Encontrados ${edts.length} EDTs`)

    for (const edt of edts) {
      const actividadesHoras = edt.cotizacionActividad.map((a: any) => ({
        nombre: a.nombre,
        horas: Number(a.horasEstimadas || 0)
      }))
      const sumaActividades = actividadesHoras.reduce((sum: number, a: any) => sum + a.horas, 0)
      const horasActuales = Number(edt.horasEstimadas || 0)

      console.log(`📊 EDT "${edt.nombre}":`)
      console.log(`   - Actividades: ${actividadesHoras.map((a: any) => `${a.nombre}(${a.horas}h)`).join(', ')}`)
      console.log(`   - Suma actividades: ${sumaActividades}h`)
      console.log(`   - Horas actuales: ${horasActuales}h`)
      console.log(`   - Diferencia: ${Math.abs(horasActuales - sumaActividades)}`)

      if (Math.abs(horasActuales - sumaActividades) > 0.01) {
        console.log(`🔄 Actualizando EDT ${edt.nombre}: ${horasActuales}h → ${sumaActividades}h`)
        await prismaClient.cotizacionEdt.update({
          where: { id: edt.id },
          data: { horasEstimadas: sumaActividades }
        })
        correcciones.push(`EDT ${edt.nombre}: ${horasActuales}h → ${sumaActividades}h`)
      } else {
        console.log(`✅ EDT ${edt.nombre} ya está correcto: ${horasActuales}h`)
      }
    }

    // 3. Roll-up EDTs → fases
    console.log('📊 Paso 3: Roll-up EDTs → fases')
    const fases = await prismaClient.cotizacionFase.findMany({
      where: { cotizacionId: cronogramaId },
      include: { cotizacionEdt: true }
    })

    console.log(`📊 Encontradas ${fases.length} fases`)

    for (const fase of fases) {
      const edtsHoras = fase.cotizacionEdt.map((e: any) => ({
        nombre: e.nombre,
        horas: Number(e.horasEstimadas || 0)
      }))
      const sumaEdts = edtsHoras.reduce((sum: number, e: any) => sum + e.horas, 0)
      const horasActuales = Number(fase.horasEstimadas || 0)

      console.log(`📊 Fase "${fase.nombre}":`)
      console.log(`   - EDTs: ${edtsHoras.map((e: any) => `${e.nombre}(${e.horas}h)`).join(', ')}`)
      console.log(`   - Suma EDTs: ${sumaEdts}h`)
      console.log(`   - Horas actuales: ${horasActuales}h`)
      console.log(`   - Diferencia: ${Math.abs(horasActuales - sumaEdts)}`)

      if (Math.abs(horasActuales - sumaEdts) > 0.01) {
        console.log(`🔄 Actualizando fase ${fase.nombre}: ${horasActuales}h → ${sumaEdts}h`)
        await prismaClient.cotizacionFase.update({
          where: { id: fase.id },
          data: { horasEstimadas: sumaEdts }
        })
        correcciones.push(`Fase ${fase.nombre}: ${horasActuales}h → ${sumaEdts}h`)
      } else {
        console.log(`✅ Fase ${fase.nombre} ya está correcta: ${horasActuales}h`)
      }
    }

    console.log(`✅ Roll-up completado exitosamente con ${correcciones.length} correcciones`)
    return { exito: true, correcciones }

  } catch (error) {
    console.error('❌ Error en roll-up de horas:', error)
    return {
      exito: false,
      correcciones: [`Error en roll-up: ${error instanceof Error ? error.message : 'Error desconocido'}`]
    }
  }
}