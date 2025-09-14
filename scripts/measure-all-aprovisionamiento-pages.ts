/**
 * 📊 Script para medir performance de TODAS las páginas de aprovisionamiento
 * Mide tiempos de carga específicos para cada página del módulo
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// 🎯 Interface para métricas completas de aprovisionamiento
interface AprovisionamientoMetrics {
  timestamp: string
  pages: {
    dashboard: PageMetrics
    proyectos: PageMetrics
    listas: PageMetrics
    pedidos: PageMetrics
    timeline: PageMetrics
  }
  summary: {
    totalPages: number
    averageLoadTime: number
    slowestPage: string
    fastestPage: string
    recommendations: string[]
  }
}

interface PageMetrics {
  url: string
  queryTime: number
  estimatedLoadTime: number
  dataVolume: {
    records: number
    relations: number
  }
  bottlenecks: string[]
}

// 📊 Medir página Dashboard de Aprovisionamiento
async function measureDashboardPage(): Promise<PageMetrics> {
  console.log('📊 Midiendo Dashboard de Aprovisionamiento...')
  
  const start = performance.now()
  
  // Simular queries del dashboard
  const [proyectos, listasRecientes, pedidosRecientes, estadisticas] = await Promise.all([
    // Proyectos activos
    prisma.proyecto.findMany({
      take: 10,
      where: { estado: 'activo' },
      include: {
        cliente: true,
        listaEquipos: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      }
    }),
    
    // Listas recientes
    prisma.listaEquipo.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        proyecto: { select: { nombre: true, codigo: true } },
        _count: { select: { items: true } }
      }
    }),
    
    // Pedidos recientes
    prisma.pedidoEquipo.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        proyecto: { select: { nombre: true } },
        _count: { select: { items: true } }
      }
    }),
    
    // Estadísticas generales
    Promise.all([
      prisma.proyecto.count({ where: { estado: 'activo' } }),
      prisma.listaEquipo.count({ where: { estado: { not: 'rechazado' } } }),
      prisma.pedidoEquipo.count({ where: { estado: { not: 'cancelado' } } })
    ])
  ])
  
  const queryTime = performance.now() - start
  const totalRecords = proyectos.length + listasRecientes.length + pedidosRecientes.length
  
  return {
    url: 'http://localhost:3000/finanzas/aprovisionamiento',
    queryTime,
    estimatedLoadTime: queryTime + 200, // + tiempo de renderizado
    dataVolume: {
      records: totalRecords,
      relations: proyectos.length * 2 + listasRecientes.length + pedidosRecientes.length
    },
    bottlenecks: queryTime > 300 ? ['Múltiples queries paralelas', 'Includes anidados'] : []
  }
}

// 📋 Medir página de Proyectos
async function measureProyectosPage(): Promise<PageMetrics> {
  console.log('📋 Midiendo Página de Proyectos...')
  
  const start = performance.now()
  
  const proyectos = await prisma.proyecto.findMany({
    take: 20,
    include: {
      cliente: true,
      listaEquipos: {
        select: {
          id: true,
          codigo: true,
          estado: true,
          _count: { select: { items: true } }
        }
      },
      pedidos: {
        select: {
          id: true,
          codigo: true,
          estado: true
        }
      },
      _count: {
        select: {
          listaEquipos: true,
          pedidos: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  const queryTime = performance.now() - start
  
  return {
    url: 'http://localhost:3000/finanzas/aprovisionamiento/proyectos',
    queryTime,
    estimatedLoadTime: queryTime + 250,
    dataVolume: {
      records: proyectos.length,
      relations: proyectos.reduce((acc, p) => acc + (p.listaEquipos?.length || 0) + (p.pedidos?.length || 0), 0)
    },
    bottlenecks: queryTime > 400 ? ['Includes múltiples', 'Conteos anidados'] : []
  }
}

// 📝 Medir página de Listas de Equipo
async function measureListasPage(): Promise<PageMetrics> {
  console.log('📝 Midiendo Página de Listas de Equipo...')
  
  const start = performance.now()
  
  const listas = await prisma.listaEquipo.findMany({
    take: 15,
    include: {
      proyecto: {
        select: {
          nombre: true,
          codigo: true,
          cliente: { select: { nombre: true } }
        }
      },
      responsable: {
        select: { name: true, email: true }
      },
      items: {
        take: 5,
        include: {
          proveedor: { select: { nombre: true } },
          cotizaciones: {
            take: 3,
            include: {
              cotizacion: {
                include: {
                  proveedor: { select: { nombre: true } }
                }
              }
            }
          }
        }
      },
      _count: { select: { items: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  const queryTime = performance.now() - start
  
  return {
    url: 'http://localhost:3000/finanzas/aprovisionamiento/listas',
    queryTime,
    estimatedLoadTime: queryTime + 300,
    dataVolume: {
      records: listas.length,
      relations: listas.reduce((acc, l) => acc + (l.items?.length || 0) * 2, 0)
    },
    bottlenecks: queryTime > 500 ? ['Includes profundos', 'Cotizaciones anidadas'] : []
  }
}

// 📦 Medir página de Pedidos
async function measurePedidosPage(): Promise<PageMetrics> {
  console.log('📦 Midiendo Página de Pedidos...')
  
  const start = performance.now()
  
  const pedidos = await prisma.pedidoEquipo.findMany({
    take: 15,
    include: {
      proyecto: {
        select: {
          nombre: true,
          codigo: true,
          cliente: { select: { nombre: true } }
        }
      },
      responsable: {
        select: { name: true, email: true }
      },
      lista: {
        select: {
          numeroSecuencia: true,
          estado: true
        }
      },
      items: {
        take: 5,
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
      _count: { select: { items: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  const queryTime = performance.now() - start
  
  return {
    url: 'http://localhost:3000/finanzas/aprovisionamiento/pedidos',
    queryTime,
    estimatedLoadTime: queryTime + 280,
    dataVolume: {
      records: pedidos.length,
      relations: pedidos.reduce((acc, p) => acc + (p.items?.length || 0), 0)
    },
    bottlenecks: queryTime > 400 ? ['Items con relaciones', 'Múltiples includes'] : []
  }
}

// ⏱️ Medir página de Timeline
async function measureTimelinePage(): Promise<PageMetrics> {
  console.log('⏱️ Midiendo Página de Timeline...')
  
  const start = performance.now()
  
  // Simular queries del timeline (eventos cronológicos)
  const [listas, pedidos, proyectos] = await Promise.all([
    prisma.listaEquipo.findMany({
      take: 10,
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        createdAt: true,
        fechaAprobacionFinal: true,
        proyecto: { select: { nombre: true, codigo: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    
    prisma.pedidoEquipo.findMany({
      take: 10,
      select: {
        id: true,
        codigo: true,
        estado: true,
        fechaPedido: true,
        fechaEntregaEstimada: true,
        fechaEntregaReal: true,
        proyecto: { select: { nombre: true, codigo: true } }
      },
      orderBy: { fechaPedido: 'desc' }
    }),
    
    prisma.proyecto.findMany({
      take: 5,
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        createdAt: true,
        fechaInicio: true,
        fechaFin: true
      },
      orderBy: { createdAt: 'desc' }
    })
  ])
  
  const queryTime = performance.now() - start
  const totalRecords = listas.length + pedidos.length + proyectos.length
  
  return {
    url: 'http://localhost:3000/finanzas/aprovisionamiento/timeline',
    queryTime,
    estimatedLoadTime: queryTime + 350, // + tiempo de procesamiento de timeline
    dataVolume: {
      records: totalRecords,
      relations: totalRecords // cada registro tiene relación con proyecto
    },
    bottlenecks: queryTime > 300 ? ['Múltiples queries temporales', 'Ordenamiento por fechas'] : []
  }
}

// 📊 Generar resumen y recomendaciones
function generateSummary(pages: Record<string, PageMetrics>): AprovisionamientoMetrics['summary'] {
  const pageEntries = Object.entries(pages)
  const loadTimes = pageEntries.map(([_, metrics]) => metrics.estimatedLoadTime)
  
  const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
  const slowestPage = pageEntries.reduce((a, b) => 
    a[1].estimatedLoadTime > b[1].estimatedLoadTime ? a : b
  )[0]
  const fastestPage = pageEntries.reduce((a, b) => 
    a[1].estimatedLoadTime < b[1].estimatedLoadTime ? a : b
  )[0]
  
  const recommendations: string[] = []
  
  // Recomendaciones basadas en tiempos
  if (averageLoadTime > 500) {
    recommendations.push('🔴 CRÍTICO: Tiempo promedio de carga > 500ms - Optimización urgente')
  }
  
  // Recomendaciones por página específica
  pageEntries.forEach(([pageName, metrics]) => {
    if (metrics.estimatedLoadTime > 600) {
      recommendations.push(`🟡 MEDIO: Página ${pageName} es lenta (${Math.round(metrics.estimatedLoadTime)}ms)`)
    }
    
    if (metrics.bottlenecks.length > 0) {
      recommendations.push(`⚠️ ATENCIÓN: ${pageName} - ${metrics.bottlenecks.join(', ')}`)
    }
  })
  
  // Recomendaciones generales
  recommendations.push('💡 Implementar React Query para cache entre páginas')
  recommendations.push('💡 Considerar paginación en todas las listas')
  recommendations.push('💡 Optimizar includes con select específicos')
  
  return {
    totalPages: pageEntries.length,
    averageLoadTime: Math.round(averageLoadTime),
    slowestPage,
    fastestPage,
    recommendations
  }
}

// 🎯 Función principal
async function measureAllAprovisionamientoPages(): Promise<AprovisionamientoMetrics> {
  console.log('🚀 Iniciando medición completa de páginas de aprovisionamiento...')
  
  try {
    // Medir todas las páginas en paralelo
    const [dashboard, proyectos, listas, pedidos, timeline] = await Promise.all([
      measureDashboardPage(),
      measureProyectosPage(),
      measureListasPage(),
      measurePedidosPage(),
      measureTimelinePage()
    ])
    
    const pages = { dashboard, proyectos, listas, pedidos, timeline }
    const summary = generateSummary(pages)
    
    return {
      timestamp: new Date().toISOString(),
      pages,
      summary
    }
    
  } catch (error) {
    console.error('❌ Error midiendo páginas:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 📊 Mostrar reporte completo
function displayCompleteReport(metrics: AprovisionamientoMetrics) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 REPORTE COMPLETO - PÁGINAS DE APROVISIONAMIENTO')
  console.log('='.repeat(80))
  console.log(`📅 Fecha: ${new Date(metrics.timestamp).toLocaleString('es-PE')}`)
  
  console.log('\n🌐 TIEMPOS DE CARGA POR PÁGINA:')
  Object.entries(metrics.pages).forEach(([pageName, pageMetrics]) => {
    const status = pageMetrics.estimatedLoadTime > 500 ? '🔴' : pageMetrics.estimatedLoadTime > 300 ? '🟡' : '🟢'
    console.log(`   ${status} ${pageName.toUpperCase()}: ${Math.round(pageMetrics.estimatedLoadTime)}ms`)
    console.log(`      • Query DB: ${Math.round(pageMetrics.queryTime)}ms`)
    console.log(`      • Registros: ${pageMetrics.dataVolume.records}`)
    console.log(`      • Relaciones: ${pageMetrics.dataVolume.relations}`)
    if (pageMetrics.bottlenecks.length > 0) {
      console.log(`      • Cuellos de botella: ${pageMetrics.bottlenecks.join(', ')}`)
    }
    console.log()
  })
  
  console.log('📈 RESUMEN GENERAL:')
  console.log(`   • Total páginas analizadas: ${metrics.summary.totalPages}`)
  console.log(`   • Tiempo promedio: ${metrics.summary.averageLoadTime}ms`)
  console.log(`   • Página más lenta: ${metrics.summary.slowestPage} (${Math.round(metrics.pages[metrics.summary.slowestPage as keyof typeof metrics.pages].estimatedLoadTime)}ms)`)
  console.log(`   • Página más rápida: ${metrics.summary.fastestPage} (${Math.round(metrics.pages[metrics.summary.fastestPage as keyof typeof metrics.pages].estimatedLoadTime)}ms)`)
  
  console.log('\n💡 RECOMENDACIONES:')
  metrics.summary.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`)
  })
  
  console.log('\n' + '='.repeat(80))
  console.log('✅ Análisis completo de aprovisionamiento finalizado')
  console.log('='.repeat(80))
}

// 💾 Guardar reporte
async function saveCompleteReport(metrics: AprovisionamientoMetrics) {
  const timestamp = Date.now()
  const reportsDir = path.join(process.cwd(), 'audit-reports')
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }
  
  // Guardar JSON
  const jsonPath = path.join(reportsDir, `aprovisionamiento-complete-${timestamp}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2))
  
  // Guardar Markdown
  const mdPath = path.join(reportsDir, `aprovisionamiento-complete-${timestamp}.md`)
  const mdContent = generateMarkdownReport(metrics)
  fs.writeFileSync(mdPath, mdContent)
  
  console.log(`\n💾 Reporte completo guardado en: ${jsonPath}`)
  console.log(`📄 Resumen en Markdown: ${mdPath}`)
}

// 📄 Generar reporte Markdown
function generateMarkdownReport(metrics: AprovisionamientoMetrics): string {
  return `# 📊 Reporte Completo - Páginas de Aprovisionamiento

**Fecha:** ${new Date(metrics.timestamp).toLocaleString('es-PE')}

## 🌐 Tiempos de Carga por Página

| Página | Tiempo Total | Query DB | Registros | Relaciones | Estado |
|--------|-------------|----------|-----------|------------|--------|
${Object.entries(metrics.pages).map(([name, page]) => {
  const status = page.estimatedLoadTime > 500 ? '🔴 Lento' : page.estimatedLoadTime > 300 ? '🟡 Medio' : '🟢 Rápido'
  return `| ${name} | ${Math.round(page.estimatedLoadTime)}ms | ${Math.round(page.queryTime)}ms | ${page.dataVolume.records} | ${page.dataVolume.relations} | ${status} |`
}).join('\n')}

## 📈 Resumen General

- **Total páginas:** ${metrics.summary.totalPages}
- **Tiempo promedio:** ${metrics.summary.averageLoadTime}ms
- **Página más lenta:** ${metrics.summary.slowestPage}
- **Página más rápida:** ${metrics.summary.fastestPage}

## 🔍 Análisis Detallado

${Object.entries(metrics.pages).map(([name, page]) => `### ${name.toUpperCase()}

- **URL:** ${page.url}
- **Tiempo de carga:** ${Math.round(page.estimatedLoadTime)}ms
- **Query DB:** ${Math.round(page.queryTime)}ms
- **Volumen de datos:** ${page.dataVolume.records} registros, ${page.dataVolume.relations} relaciones
${page.bottlenecks.length > 0 ? `- **Cuellos de botella:** ${page.bottlenecks.join(', ')}` : '- **Sin cuellos de botella detectados**'}
`).join('\n')}

## 💡 Recomendaciones

${metrics.summary.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---

*Reporte generado automáticamente por el sistema de monitoreo GYS*
`
}

// 🚀 Ejecutar si es llamado directamente
if (require.main === module) {
  measureAllAprovisionamientoPages()
    .then(metrics => {
      displayCompleteReport(metrics)
      return saveCompleteReport(metrics)
    })
    .catch(error => {
      console.error('💥 Error en medición completa:', error)
      process.exit(1)
    })
}

export { measureAllAprovisionamientoPages, displayCompleteReport, saveCompleteReport }
export type { AprovisionamientoMetrics, PageMetrics }