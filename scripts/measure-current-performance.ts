/**
 * 🎯 Script para medir performance actual de páginas de aprovisionamiento
 * 
 * Este script genera un baseline de performance antes de aplicar optimizaciones
 * para poder comparar mejoras posteriormente.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

const prisma = new PrismaClient()

// 🎯 Tipos para métricas
interface PerformanceBaseline {
  timestamp: string
  database: {
    listasEquipo: {
      totalRecords: number
      queryTime: number
      avgQueryTime: number
    }
    pedidosEquipo: {
      totalRecords: number
      queryTime: number
      avgQueryTime: number
    }
    relacionesComplejas: {
      queryTime: number
      recordsWithRelations: number
    }
  }
  estimatedPageLoad: {
    listasEquipoPage: number
    pedidosEquipoPage: number
    detailPage: number
  }
  recommendations: string[]
}

// 🔍 Función para medir queries de base de datos
async function measureDatabasePerformance() {
  console.log('📊 Midiendo performance de base de datos...')
  
  // Medir query de listas de equipo
  const listasStart = performance.now()
  const listas = await prisma.listaEquipo.findMany({
    take: 50, // Simular paginación actual
    include: {
      proyecto: {
        select: {
          nombre: true,
          codigo: true,
          cliente: {
            select: { nombre: true }
          }
        }
      },
      items: {
        include: {
          proveedor: {
            select: {
              nombre: true
            }
          },
          cotizaciones: {
            include: {
              cotizacion: {
                include: {
                  proveedor: {
                    select: { nombre: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  const listasTime = performance.now() - listasStart
  
  // Contar total de registros
  const totalListas = await prisma.listaEquipo.count()
  
  // Medir query de pedidos de equipo
  const pedidosStart = performance.now()
  const pedidos = await prisma.pedidoEquipo.findMany({
    take: 50,
    include: {
      proyecto: {
        select: {
          nombre: true,
          codigo: true,
          cliente: {
            select: { nombre: true }
          }
        }
      },
      lista: {
          select: {
            numeroSecuencia: true,
            estado: true
          }
        },
      items: {
        include: {
          listaEquipoItem: {
            select: {
              codigo: true,
              descripcion: true,
              cantidad: true
            }
          }
        }
      },
      responsable: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  const pedidosTime = performance.now() - pedidosStart
  
  const totalPedidos = await prisma.pedidoEquipo.count()
  
  // Medir query compleja con múltiples relaciones
  const complexStart = performance.now()
  const complexQuery = await prisma.listaEquipo.findMany({
    take: 10,
    include: {
      proyecto: {
        include: {
          cliente: true
        }
      },
      items: {
        include: {
          proveedor: true,
          cotizaciones: {
            include: {
              cotizacion: {
                include: {
                  proveedor: true
                }
              }
            }
          }
        }
      }
    }
  })
  const complexTime = performance.now() - complexStart
  
  return {
    listasEquipo: {
      totalRecords: totalListas,
      queryTime: Math.round(listasTime * 100) / 100,
      avgQueryTime: Math.round((listasTime / listas.length) * 100) / 100
    },
    pedidosEquipo: {
      totalRecords: totalPedidos,
      queryTime: Math.round(pedidosTime * 100) / 100,
      avgQueryTime: Math.round((pedidosTime / pedidos.length) * 100) / 100
    },
    relacionesComplejas: {
      queryTime: Math.round(complexTime * 100) / 100,
      recordsWithRelations: complexQuery.length
    }
  }
}

// 📈 Función para estimar tiempos de carga de páginas
function estimatePageLoadTimes(dbMetrics: any) {
  // Estimaciones basadas en métricas de DB + overhead de React
  const reactOverhead = 200 // ms base para renderizado React
  const networkLatency = 100 // ms estimado para requests
  
  return {
    listasEquipoPage: Math.round(dbMetrics.listasEquipo.queryTime + reactOverhead + networkLatency),
    pedidosEquipoPage: Math.round(dbMetrics.pedidosEquipo.queryTime + reactOverhead + networkLatency),
    detailPage: Math.round(dbMetrics.relacionesComplejas.queryTime + reactOverhead + networkLatency)
  }
}

// 💡 Función para generar recomendaciones
function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = []
  
  // Recomendaciones basadas en tiempos de query
  if (metrics.database.listasEquipo.queryTime > 500) {
    recommendations.push('🔴 CRÍTICO: Query de listas de equipo toma más de 500ms - Implementar paginación urgente')
  } else if (metrics.database.listasEquipo.queryTime > 200) {
    recommendations.push('🟡 MEDIO: Query de listas de equipo podría optimizarse con índices')
  }
  
  if (metrics.database.pedidosEquipo.queryTime > 500) {
    recommendations.push('🔴 CRÍTICO: Query de pedidos de equipo toma más de 500ms - Optimizar includes')
  }
  
  if (metrics.database.relacionesComplejas.queryTime > 1000) {
    recommendations.push('🔴 CRÍTICO: Queries complejas toman más de 1 segundo - Implementar lazy loading')
  }
  
  // Recomendaciones basadas en volumen de datos
  if (metrics.database.listasEquipo.totalRecords > 1000) {
    recommendations.push('📊 INFO: Más de 1000 listas de equipo - Considerar virtualización de tablas')
  }
  
  if (metrics.database.pedidosEquipo.totalRecords > 500) {
    recommendations.push('📊 INFO: Más de 500 pedidos - Implementar filtros avanzados')
  }
  
  // Recomendaciones de performance estimada
  if (metrics.estimatedPageLoad.listasEquipoPage > 2000) {
    recommendations.push('🔴 CRÍTICO: Página de listas estimada en más de 2 segundos - Optimización urgente')
  }
  
  if (metrics.estimatedPageLoad.pedidosEquipoPage > 2000) {
    recommendations.push('🔴 CRÍTICO: Página de pedidos estimada en más de 2 segundos - Optimización urgente')
  }
  
  // Recomendaciones generales
  recommendations.push('💡 SUGERENCIA: Implementar React Query para cache inteligente')
  recommendations.push('💡 SUGERENCIA: Agregar índices compuestos en Prisma')
  recommendations.push('💡 SUGERENCIA: Usar React.memo en componentes de tabla')
  
  return recommendations
}

// 🎯 Función principal
async function measureCurrentPerformance(): Promise<PerformanceBaseline> {
  console.log('🚀 Iniciando medición de performance baseline...')
  
  try {
    // Medir performance de base de datos
    const dbMetrics = await measureDatabasePerformance()
    
    // Estimar tiempos de carga de páginas
    const pageLoadMetrics = estimatePageLoadTimes(dbMetrics)
    
    // Crear baseline completo
    const baseline: PerformanceBaseline = {
      timestamp: new Date().toISOString(),
      database: dbMetrics,
      estimatedPageLoad: pageLoadMetrics,
      recommendations: []
    }
    
    // Generar recomendaciones
    baseline.recommendations = generateRecommendations(baseline)
    
    return baseline
    
  } catch (error) {
    console.error('❌ Error midiendo performance:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 📊 Función para mostrar reporte
function displayReport(baseline: PerformanceBaseline) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 REPORTE DE PERFORMANCE BASELINE - SISTEMA GYS')
  console.log('='.repeat(80))
  console.log(`📅 Fecha: ${new Date(baseline.timestamp).toLocaleString('es-PE')}`)
  console.log('\n🗄️  MÉTRICAS DE BASE DE DATOS:')
  console.log(`   📋 Listas de Equipo:`)
  console.log(`      • Total registros: ${baseline.database.listasEquipo.totalRecords.toLocaleString()}`)
  console.log(`      • Tiempo de query: ${baseline.database.listasEquipo.queryTime}ms`)
  console.log(`      • Tiempo promedio por registro: ${baseline.database.listasEquipo.avgQueryTime}ms`)
  
  console.log(`   📦 Pedidos de Equipo:`)
  console.log(`      • Total registros: ${baseline.database.pedidosEquipo.totalRecords.toLocaleString()}`)
  console.log(`      • Tiempo de query: ${baseline.database.pedidosEquipo.queryTime}ms`)
  console.log(`      • Tiempo promedio por registro: ${baseline.database.pedidosEquipo.avgQueryTime}ms`)
  
  console.log(`   🔗 Relaciones Complejas:`)
  console.log(`      • Tiempo de query: ${baseline.database.relacionesComplejas.queryTime}ms`)
  console.log(`      • Registros con relaciones: ${baseline.database.relacionesComplejas.recordsWithRelations}`)
  
  console.log('\n🌐 TIEMPOS ESTIMADOS DE CARGA DE PÁGINAS:')
  console.log(`   📋 Página Listas de Equipo: ${baseline.estimatedPageLoad.listasEquipoPage}ms`)
  console.log(`   📦 Página Pedidos de Equipo: ${baseline.estimatedPageLoad.pedidosEquipoPage}ms`)
  console.log(`   🔍 Página de Detalle: ${baseline.estimatedPageLoad.detailPage}ms`)
  
  console.log('\n💡 RECOMENDACIONES:')
  baseline.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`)
  })
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Reporte completado. Guarda estos datos como baseline para comparar mejoras.')
  console.log('='.repeat(80) + '\n')
}

// 💾 Función para guardar reporte en archivo
async function saveReport(baseline: PerformanceBaseline) {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  const reportPath = path.join(process.cwd(), 'audit-reports', `performance-baseline-${Date.now()}.json`)
  
  try {
    // Crear directorio si no existe
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    
    // Guardar reporte
    await fs.writeFile(reportPath, JSON.stringify(baseline, null, 2))
    
    console.log(`💾 Reporte guardado en: ${reportPath}`)
    
    // También crear un resumen en markdown
    const markdownPath = reportPath.replace('.json', '.md')
    const markdownContent = generateMarkdownReport(baseline)
    await fs.writeFile(markdownPath, markdownContent)
    
    console.log(`📄 Resumen en Markdown: ${markdownPath}`)
    
  } catch (error) {
    console.error('❌ Error guardando reporte:', error)
  }
}

// 📝 Función para generar reporte en Markdown
function generateMarkdownReport(baseline: PerformanceBaseline): string {
  return `# 📊 Performance Baseline Report - Sistema GYS

**Fecha:** ${new Date(baseline.timestamp).toLocaleString('es-PE')}

## 🗄️ Métricas de Base de Datos

### 📋 Listas de Equipo
- **Total registros:** ${baseline.database.listasEquipo.totalRecords.toLocaleString()}
- **Tiempo de query:** ${baseline.database.listasEquipo.queryTime}ms
- **Tiempo promedio por registro:** ${baseline.database.listasEquipo.avgQueryTime}ms

### 📦 Pedidos de Equipo
- **Total registros:** ${baseline.database.pedidosEquipo.totalRecords.toLocaleString()}
- **Tiempo de query:** ${baseline.database.pedidosEquipo.queryTime}ms
- **Tiempo promedio por registro:** ${baseline.database.pedidosEquipo.avgQueryTime}ms

### 🔗 Relaciones Complejas
- **Tiempo de query:** ${baseline.database.relacionesComplejas.queryTime}ms
- **Registros con relaciones:** ${baseline.database.relacionesComplejas.recordsWithRelations}

## 🌐 Tiempos Estimados de Carga

| Página | Tiempo Estimado |
|--------|----------------|
| 📋 Listas de Equipo | ${baseline.estimatedPageLoad.listasEquipoPage}ms |
| 📦 Pedidos de Equipo | ${baseline.estimatedPageLoad.pedidosEquipoPage}ms |
| 🔍 Página de Detalle | ${baseline.estimatedPageLoad.detailPage}ms |

## 💡 Recomendaciones

${baseline.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---

*Reporte generado automáticamente por el sistema de monitoreo GYS*
`
}

// 🚀 Ejecutar si es llamado directamente
if (require.main === module) {
  measureCurrentPerformance()
    .then(baseline => {
      displayReport(baseline)
      return saveReport(baseline)
    })
    .catch(error => {
      console.error('❌ Error en medición de performance:', error)
      process.exit(1)
    })
}

export { measureCurrentPerformance, displayReport, saveReport }
export type { PerformanceBaseline }