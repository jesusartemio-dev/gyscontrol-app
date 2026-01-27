/**
 * Script de Migración: Agregar campos de responsables al cronograma
 *
 * Este script migra los datos existentes para agregar campos de responsables
 * en EDTs, Zonas, Actividades y Tareas del cronograma de 6 niveles.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateCronogramaResponsables() {
  console.log('🚀 Iniciando migración de responsables en cronograma...')

  try {
    // 1. Migrar EDTs - asignar responsable basado en el gestor del proyecto
    console.log('📋 Migrando responsables de EDTs...')

    const edtsSinResponsable = await prisma.proyectoEdt.findMany({
      where: { responsableId: null },
      include: { proyecto: { select: { gestorId: true } } }
    })

    for (const edt of edtsSinResponsable) {
      if (edt.proyecto.gestorId) {
        await prisma.proyectoEdt.update({
          where: { id: edt.id },
          data: { responsableId: edt.proyecto.gestorId }
        })
        console.log(`✅ EDT ${edt.nombre}: asignado responsable ${edt.proyecto.gestorId}`)
      }
    }

    // 2. Migrar Zonas - asignar responsable del EDT padre
    console.log('🏭 Migrando responsables de Zonas...')

    const zonasSinResponsable = await prisma.proyectoZona.findMany({
      where: { responsableId: null },
      include: { proyectoEdt: { select: { responsableId: true } } }
    })

    for (const zona of zonasSinResponsable) {
      if (zona.proyectoEdt.responsableId) {
        await prisma.proyectoZona.update({
          where: { id: zona.id },
          data: { responsableId: zona.proyectoEdt.responsableId }
        })
        console.log(`✅ Zona ${zona.nombre}: asignado responsable ${zona.proyectoEdt.responsableId}`)
      }
    }

    // 3. Migrar Actividades - asignar responsable de la zona o EDT padre
    console.log('⚙️ Migrando responsables de Actividades...')

    const actividadesSinResponsable = await prisma.proyectoActividad.findMany({
      where: { responsableId: null },
      include: {
        proyectoZona: { select: { responsableId: true } },
        proyectoEdt: { select: { responsableId: true } }
      }
    })

    for (const actividad of actividadesSinResponsable) {
      const responsableId = actividad.proyectoZona?.responsableId || actividad.proyectoEdt?.responsableId

      if (responsableId) {
        await prisma.proyectoActividad.update({
          where: { id: actividad.id },
          data: { responsableId }
        })
        console.log(`✅ Actividad ${actividad.nombre}: asignado responsable ${responsableId}`)
      }
    }

    // 4. Migrar Tareas - asignar responsable de la actividad padre
    console.log('✅ Migrando responsables de Tareas...')

    const tareasSinResponsable = await prisma.proyectoTarea.findMany({
      where: { responsableId: null },
      include: {
        proyectoActividad: { select: { responsableId: true } },
        proyectoEdt: { select: { responsableId: true } }
      }
    })

    for (const tarea of tareasSinResponsable) {
      const responsableId = tarea.proyectoActividad?.responsableId || tarea.proyectoEdt?.responsableId

      if (responsableId) {
        await prisma.proyectoTarea.update({
          where: { id: tarea.id },
          data: { responsableId }
        })
        console.log(`✅ Tarea ${tarea.nombre}: asignado responsable ${responsableId}`)
      }
    }

    // 5. Calcular progreso inicial basado en horas existentes
    console.log('📊 Calculando progreso inicial...')

    const tareasConHoras = await prisma.proyectoTarea.findMany({
      where: { horasReales: { gt: 0 } }
    })

    for (const tarea of tareasConHoras) {
      const horasReales = Number(tarea.horasReales)
      const horasEstimadas = tarea.horasEstimadas ? Number(tarea.horasEstimadas) : 0

      if (horasEstimadas > 0) {
        const porcentajeAvance = Math.min(100, Math.round((horasReales / horasEstimadas) * 100))
        const estado = porcentajeAvance >= 100 ? 'completada' : 'en_progreso'

        await prisma.proyectoTarea.update({
          where: { id: tarea.id },
          data: {
            porcentajeCompletado: porcentajeAvance,
            estado: estado as any
          }
        })
        console.log(`📈 Tarea ${tarea.nombre}: progreso ${porcentajeAvance}%`)
      }
    }

    // 6. Propagar progreso hacia arriba en la jerarquía
    console.log('🔄 Propagando progreso en jerarquía...')

    // Obtener todos los EDTs y recalcular su progreso
    const edts = await prisma.proyectoEdt.findMany({
      include: {
        zonas: true,
        actividadesDirectas: true
      }
    })

    for (const edt of edts) {
      const elementos = [...edt.zonas, ...edt.actividadesDirectas]
      if (elementos.length === 0) continue

      const progresoPromedio = Math.round(
        elementos.reduce((sum, elem) => sum + elem.porcentajeAvance, 0) / elementos.length
      )

      const horasReales = elementos.reduce((sum, elem) => sum + Number(elem.horasReales), 0)

      await prisma.proyectoEdt.update({
        where: { id: edt.id },
        data: {
          porcentajeAvance: progresoPromedio,
          horasReales: horasReales.toString(),
          estado: progresoPromedio >= 100 ? 'completado' : progresoPromedio > 0 ? 'en_progreso' : 'planificado'
        }
      })
      console.log(`📊 EDT ${edt.nombre}: progreso ${progresoPromedio}%`)
    }

    // 7. Actualizar progreso de proyectos
    console.log('🏗️ Actualizando progreso de proyectos...')

    const proyectos = await prisma.proyecto.findMany({
      include: { fases: true }
    })

    for (const proyecto of proyectos) {
      if (proyecto.fases.length === 0) continue

      const progresoGeneral = Math.round(
        proyecto.fases.reduce((sum, fase) => sum + fase.porcentajeAvance, 0) / proyecto.fases.length
      )

      await prisma.proyecto.update({
        where: { id: proyecto.id },
        data: { progresoGeneral }
      })
      console.log(`🏗️ Proyecto ${proyecto.nombre}: progreso general ${progresoGeneral}%`)
    }

    console.log('✅ Migración completada exitosamente!')

    // 8. Reporte final
    const estadisticas = await Promise.all([
      prisma.proyectoEdt.count({ where: { responsableId: { not: null } } }),
      prisma.proyectoZona.count({ where: { responsableId: { not: null } } }),
      prisma.proyectoActividad.count({ where: { responsableId: { not: null } } }),
      prisma.proyectoTarea.count({ where: { responsableId: { not: null } } }),
      prisma.proyectoTarea.count({ where: { porcentajeCompletado: { gt: 0 } } })
    ])

    console.log('\n📊 Reporte de Migración:')
    console.log(`- EDTs con responsable: ${estadisticas[0]}`)
    console.log(`- Zonas con responsable: ${estadisticas[1]}`)
    console.log(`- Actividades con responsable: ${estadisticas[2]}`)
    console.log(`- Tareas con responsable: ${estadisticas[3]}`)
    console.log(`- Tareas con progreso calculado: ${estadisticas[4]}`)

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateCronogramaResponsables()
    .then(() => {
      console.log('🎉 Migración finalizada correctamente')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error)
      process.exit(1)
    })
}

export { migrateCronogramaResponsables }