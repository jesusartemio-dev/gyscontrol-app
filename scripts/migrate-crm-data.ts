// ===================================================
// 📁 Archivo: migrate-crm-data.ts
// 📌 Ubicación: scripts/
// 🔧 Descripción: Script para migrar datos existentes al sistema CRM
// ✅ Migra clientes, cotizaciones y proyectos a estructuras CRM
// ===================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MigrationStats {
  clientesMigrados: number
  oportunidadesCreadas: number
  actividadesCreadas: number
  historialProyectos: number
  errores: string[]
}

async function migrateExistingData(): Promise<void> {
  console.log('🚀 Iniciando migración de datos al sistema CRM...')

  const stats: MigrationStats = {
    clientesMigrados: 0,
    oportunidadesCreadas: 0,
    actividadesCreadas: 0,
    historialProyectos: 0,
    errores: []
  }

  try {
    // 1. Migrar datos de clientes existentes
    await migrateClientes(stats)

    // 2. Crear oportunidades desde cotizaciones activas
    await migrateCotizacionesToOportunidades(stats)

    // 3. Migrar historial de proyectos por cliente
    await migrateHistorialProyectos(stats)

    // 4. Crear métricas iniciales para usuarios comerciales
    await createInitialMetrics(stats)

    console.log('✅ Migración completada exitosamente!')
    console.log('📊 Estadísticas de migración:', stats)

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    stats.errores.push(`Error general: ${error}`)
  } finally {
    await prisma.$disconnect()
  }

  // Reporte final
  console.log('\n📋 REPORTE FINAL DE MIGRACIÓN')
  console.log('================================')
  console.log(`👥 Clientes migrados: ${stats.clientesMigrados}`)
  console.log(`🎯 Oportunidades creadas: ${stats.oportunidadesCreadas}`)
  console.log(`📝 Actividades creadas: ${stats.actividadesCreadas}`)
  console.log(`📚 Historial de proyectos: ${stats.historialProyectos}`)

  if (stats.errores.length > 0) {
    console.log('\n⚠️ ERRORES ENCONTRADOS:')
    stats.errores.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`)
    })
  }
}

async function migrateClientes(stats: MigrationStats): Promise<void> {
  console.log('📋 Migrando datos de clientes...')

  try {
    const clientes = await prisma.cliente.findMany({
      include: {
        cotizaciones: {
          where: {
            estado: { in: ['aprobada', 'enviada'] }
          },
          take: 5, // Últimas 5 cotizaciones para análisis
          orderBy: { createdAt: 'desc' }
        },
        proyectos: {
          where: {
            estado: { in: ['completado', 'en_ejecucion'] }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    for (const cliente of clientes) {
      try {
        // Calcular métricas del cliente
        const totalProyectos = cliente.proyectos.length
        const ultimoProyecto = cliente.proyectos[0]?.fechaFin || cliente.proyectos[0]?.fechaInicio
        const valorTotalProyectos = cliente.proyectos.reduce((sum: number, p: any) => sum + (p.grandTotal || 0), 0)

        // Estimar frecuencia de compra (meses entre proyectos)
        let frecuenciaCompra: number | null = null
        if (totalProyectos > 1) {
          const fechas = cliente.proyectos
            .map((p: any) => new Date(p.fechaInicio))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime())

          const diferencias = []
          for (let i = 1; i < fechas.length; i++) {
            diferencias.push(fechas[i].getTime() - fechas[i-1].getTime())
          }

          const promedioMs = diferencias.reduce((sum, diff) => sum + diff, 0) / diferencias.length
          frecuenciaCompra = Math.round(promedioMs / (1000 * 60 * 60 * 24 * 30)) // meses
        }

        // Determinar sector basado en análisis de proyectos
        let sector: string | null = null
        if (cliente.proyectos.length > 0) {
          // Lógica simple: si el nombre del proyecto contiene palabras clave
          const nombresProyectos = cliente.proyectos.map(p => p.nombre.toLowerCase()).join(' ')
          if (nombresProyectos.includes('mina') || nombresProyectos.includes('minería')) {
            sector = 'minería'
          } else if (nombresProyectos.includes('fabrica') || nombresProyectos.includes('manufactura')) {
            sector = 'manufactura'
          } else if (nombresProyectos.includes('energia') || nombresProyectos.includes('eléctrica')) {
            sector = 'energía'
          }
        }

        // Actualizar cliente con datos CRM
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: {
            sector,
            tamanoEmpresa: valorTotalProyectos > 100000 ? 'grande' :
                          valorTotalProyectos > 50000 ? 'mediana' : 'pequeña',
            frecuenciaCompra: frecuenciaCompra ? `${frecuenciaCompra} meses` : null,
            ultimoProyecto,
            potencialAnual: valorTotalProyectos * 1.2, // Estimación conservadora
            estadoRelacion: totalProyectos > 0 ? 'cliente_activo' : 'prospecto'
          }
        })

        stats.clientesMigrados++
        console.log(`  ✅ Migrado cliente: ${cliente.nombre}`)

      } catch (error) {
        console.error(`  ❌ Error migrando cliente ${cliente.nombre}:`, error)
        stats.errores.push(`Cliente ${cliente.nombre}: ${error}`)
      }
    }

  } catch (error) {
    console.error('❌ Error en migración de clientes:', error)
    stats.errores.push(`Migración clientes: ${error}`)
  }
}

async function migrateCotizacionesToOportunidades(stats: MigrationStats): Promise<void> {
  console.log('🎯 Creando oportunidades desde cotizaciones activas...')

  try {
    const cotizacionesActivas = await prisma.cotizacion.findMany({
      where: {
        estado: { in: ['borrador', 'enviada', 'aprobada'] },
        oportunidadCrm: null // Solo las que no tienen oportunidad asociada
      },
      include: {
        cliente: true,
        comercial: true
      }
    })

    for (const cotizacion of cotizacionesActivas) {
      try {
        if (!cotizacion.cliente) continue

        // Determinar estado de la oportunidad basado en el estado de la cotización
        let estadoOportunidad: 'prospecto' | 'contacto_inicial' | 'propuesta_enviada' | 'negociacion' | 'cerrada_ganada' | 'cerrada_perdida'
        let probabilidad: number

        switch (cotizacion.estado) {
          case 'aprobada':
            estadoOportunidad = 'propuesta_enviada'
            probabilidad = 70
            break
          case 'enviada':
            estadoOportunidad = 'propuesta_enviada'
            probabilidad = 50
            break
          default:
            estadoOportunidad = 'contacto_inicial'
            probabilidad = 30
        }

        // Crear oportunidad
        const oportunidad = await prisma.crmOportunidad.create({
          data: {
            clienteId: cotizacion.cliente.id,
            nombre: `Cotización ${cotizacion.nombre}`,
            descripcion: `Oportunidad creada automáticamente desde cotización ${cotizacion.nombre}`,
            valorEstimado: cotizacion.grandTotal,
            probabilidad,
            fechaCierreEstimada: cotizacion.fechaCierreEstimada || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            fuente: 'cotizacion_existente',
            estado: estadoOportunidad,
            prioridad: cotizacion.prioridad === 'alta' ? 'alta' : 'media',
            comercialId: cotizacion.comercialId,
            responsableId: cotizacion.comercialId,
            cotizacionId: cotizacion.id
          }
        })

        // Crear actividad inicial
        await prisma.crmActividad.create({
          data: {
            oportunidadId: oportunidad.id,
            tipo: 'llamada',
            descripcion: `Cotización ${cotizacion.nombre} enviada al cliente`,
            fecha: cotizacion.fechaEnvio || cotizacion.createdAt,
            resultado: 'neutro',
            usuarioId: cotizacion.comercialId || 'system'
          }
        })

        stats.oportunidadesCreadas++
        stats.actividadesCreadas++
        console.log(`  ✅ Creada oportunidad desde cotización: ${cotizacion.nombre}`)

      } catch (error) {
        console.error(`  ❌ Error creando oportunidad para cotización ${cotizacion.nombre}:`, error)
        stats.errores.push(`Cotización ${cotizacion.nombre}: ${error}`)
      }
    }

  } catch (error) {
    console.error('❌ Error en migración de cotizaciones:', error)
    stats.errores.push(`Migración cotizaciones: ${error}`)
  }
}

async function migrateHistorialProyectos(stats: MigrationStats): Promise<void> {
  console.log('📚 Migrando historial de proyectos...')

  try {
    const proyectosCompletados = await prisma.proyecto.findMany({
      where: {
        estado: 'completado'
      },
      include: {
        cliente: true,
        comercial: true,
        cotizacion: true
      }
    })

    for (const proyecto of proyectosCompletados) {
      try {
        if (!proyecto.cliente) continue

        // Crear entrada en historial de proyectos
        await prisma.crmHistorialProyecto.create({
          data: {
            clienteId: proyecto.cliente.id,
            proyectoId: proyecto.id,
            cotizacionId: proyecto.cotizacionId,
            nombreProyecto: proyecto.nombre,
            tipoProyecto: 'nuevo', // Por defecto, se puede refinar después
            sector: proyecto.cliente.sector,
            complejidad: proyecto.totalInterno > 50000 ? 'alta' : proyecto.totalInterno > 20000 ? 'media' : 'baja',
            valorContrato: proyecto.grandTotal,
            margenObtenido: proyecto.totalCliente > proyecto.totalInterno ?
              ((proyecto.totalCliente - proyecto.totalInterno) / proyecto.totalInterno) * 100 : 0,
            duracionDias: proyecto.fechaFin && proyecto.fechaInicio ?
              Math.round((new Date(proyecto.fechaFin).getTime() - new Date(proyecto.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) : null,
            fechaInicio: proyecto.fechaInicio,
            fechaFin: proyecto.fechaFin,
            fechaAdjudicacion: proyecto.fechaInicio,
            calificacionCliente: 4, // Valor por defecto, se puede actualizar después
            retroalimentacion: 'Proyecto completado exitosamente',
            exitos: 'Entrega en tiempo y forma',
            recomendaciones: 'Cliente satisfecho, buena relación comercial'
          }
        })

        stats.historialProyectos++
        console.log(`  ✅ Migrado historial para proyecto: ${proyecto.nombre}`)

      } catch (error) {
        console.error(`  ❌ Error migrando historial para proyecto ${proyecto.nombre}:`, error)
        stats.errores.push(`Proyecto ${proyecto.nombre}: ${error}`)
      }
    }

  } catch (error) {
    console.error('❌ Error en migración de historial de proyectos:', error)
    stats.errores.push(`Migración historial proyectos: ${error}`)
  }
}

async function createInitialMetrics(stats: MigrationStats): Promise<void> {
  console.log('📊 Creando métricas iniciales para usuarios comerciales...')

  try {
    const usuariosComerciales = await prisma.user.findMany({
      where: {
        role: { in: ['comercial', 'coordinador', 'gerente'] }
      }
    })

    const periodoActual = new Date().toISOString().slice(0, 7) // YYYY-MM

    for (const usuario of usuariosComerciales) {
      try {
        // Calcular métricas básicas del usuario
        const cotizacionesUsuario = await prisma.cotizacion.count({
          where: { comercialId: usuario.id }
        })

        const proyectosUsuario = await prisma.proyecto.count({
          where: { comercialId: usuario.id }
        })

        const oportunidadesUsuario = await prisma.crmOportunidad.count({
          where: { comercialId: usuario.id }
        })

        // Crear métrica inicial
        await prisma.crmMetricaComercial.upsert({
          where: {
            usuarioId_periodo: {
              usuarioId: usuario.id,
              periodo: periodoActual
            }
          },
          update: {
            cotizacionesGeneradas: cotizacionesUsuario,
            proyectosCerrados: proyectosUsuario
          },
          create: {
            usuarioId: usuario.id,
            periodo: periodoActual,
            cotizacionesGeneradas: cotizacionesUsuario,
            proyectosCerrados: proyectosUsuario,
            llamadasRealizadas: 0,
            reunionesAgendadas: 0,
            propuestasEnviadas: 0,
            emailsEnviados: 0
          }
        })

        console.log(`  ✅ Métricas iniciales creadas para: ${usuario.name || usuario.email}`)

      } catch (error) {
        console.error(`  ❌ Error creando métricas para usuario ${usuario.email}:`, error)
        stats.errores.push(`Métricas usuario ${usuario.email}: ${error}`)
      }
    }

  } catch (error) {
    console.error('❌ Error creando métricas iniciales:', error)
    stats.errores.push(`Creación métricas iniciales: ${error}`)
  }
}

// Ejecutar migración si se llama directamente
if (typeof require !== 'undefined' && require.main === module) {
  migrateExistingData()
    .then(() => {
      console.log('🎉 Migración finalizada')
      if (typeof process !== 'undefined') {
        process.exit(0)
      }
    })
    .catch((error) => {
      console.error('💥 Error fatal en migración:', error)
      if (typeof process !== 'undefined') {
        process.exit(1)
      }
    })
}

export { migrateExistingData }