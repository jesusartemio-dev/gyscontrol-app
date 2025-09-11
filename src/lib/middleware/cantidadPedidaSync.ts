// ===================================================
// 📁 Archivo: cantidadPedidaSync.ts
// 📌 Ubicación: src/lib/middleware/
// 🔧 Descripción: Middleware para sincronización automática de cantidadPedida
// 📌 Características: Ejecuta validaciones y correcciones periódicas
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  obtenerEstadisticasConsistencia, 
  repararInconsistencias 
} from '@/lib/utils/cantidadPedidaValidator'

/**
 * 🔄 Middleware que verifica y corrige inconsistencias en cantidadPedida
 * Se ejecuta en rutas críticas relacionadas con pedidos
 */
export async function cantidadPedidaSyncMiddleware(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  try {
    // 🔍 Solo ejecutar en rutas específicas para evitar overhead
    const rutasCriticas = [
      '/api/pedido-equipo',
      '/api/pedido-equipo-item',
      '/api/lista-equipo'
    ]

    const esRutaCritica = rutasCriticas.some(ruta => 
      request.nextUrl.pathname.startsWith(ruta)
    )

    if (!esRutaCritica) {
      return response
    }

    // 📊 Verificar estadísticas de consistencia
    const estadisticas = await obtenerEstadisticasConsistencia()
    
    // ⚠️ Si hay más del 5% de inconsistencias, ejecutar reparación automática
    if (estadisticas.porcentajeConsistencia < 95 && estadisticas.itemsInconsistentes > 0) {
      console.warn(`⚠️ Detectadas ${estadisticas.itemsInconsistentes} inconsistencias en cantidadPedida (${(100 - estadisticas.porcentajeConsistencia).toFixed(2)}%)`)
      
      // 🔧 Ejecutar reparación en background
      setImmediate(async () => {
        try {
          const resultado = await repararInconsistencias()
          console.log(`✅ Reparación automática completada: ${resultado.itemsReparados} items corregidos`)
          
          if (resultado.errores.length > 0) {
            console.error('❌ Errores durante reparación:', resultado.errores)
          }
        } catch (error) {
          console.error('❌ Error en reparación automática:', error)
        }
      })
    }

    // 🚨 Si hay valores negativos, registrar alerta
    if (estadisticas.itemsNegativos > 0) {
      console.error(`🚨 ALERTA: ${estadisticas.itemsNegativos} items con cantidadPedida negativa detectados`)
      
      // 📧 Aquí se podría enviar notificación a administradores
      // await enviarNotificacionAdmin(estadisticas)
    }

    return response
  } catch (error) {
    console.error('❌ Error en middleware de sincronización:', error)
    // 🔄 No bloquear la respuesta por errores del middleware
    return response
  }
}

/**
 * 📊 Función para obtener reporte de salud de cantidadPedida
 */
export async function obtenerReporteSalud(): Promise<{
  estado: 'saludable' | 'advertencia' | 'critico'
  estadisticas: any
  recomendaciones: string[]
}> {
  try {
    const estadisticas = await obtenerEstadisticasConsistencia()
    const recomendaciones: string[] = []
    let estado: 'saludable' | 'advertencia' | 'critico' = 'saludable'

    // 🔍 Evaluar estado del sistema
    if (estadisticas.itemsNegativos > 0) {
      estado = 'critico'
      recomendaciones.push('Ejecutar script de corrección de valores negativos inmediatamente')
      recomendaciones.push('Investigar causa raíz de valores negativos')
    } else if (estadisticas.porcentajeConsistencia < 95) {
      estado = 'advertencia'
      recomendaciones.push('Ejecutar script de recálculo de cantidades')
      recomendaciones.push('Revisar logs de APIs de pedidos por errores')
    }

    if (estadisticas.itemsInconsistentes > 10) {
      recomendaciones.push('Considerar ejecutar mantenimiento de base de datos')
    }

    if (estadisticas.totalItems > 1000 && estadisticas.porcentajeConsistencia < 98) {
      recomendaciones.push('Implementar validaciones adicionales en APIs')
    }

    return {
      estado,
      estadisticas,
      recomendaciones
    }
  } catch (error) {
    console.error('❌ Error al obtener reporte de salud:', error)
    return {
      estado: 'critico',
      estadisticas: null,
      recomendaciones: ['Error al obtener estadísticas - revisar logs del sistema']
    }
  }
}

/**
 * 🔧 Función para ejecutar mantenimiento programado
 */
export async function ejecutarMantenimientoProgramado(): Promise<{
  exito: boolean
  itemsReparados: number
  errores: string[]
  duracion: number
}> {
  const inicioTiempo = Date.now()
  
  try {
    console.log('🔧 Iniciando mantenimiento programado de cantidadPedida...')
    
    // 📊 Obtener estadísticas iniciales
    const estadisticasIniciales = await obtenerEstadisticasConsistencia()
    console.log(`📊 Estado inicial: ${estadisticasIniciales.itemsInconsistentes} inconsistencias, ${estadisticasIniciales.itemsNegativos} negativos`)
    
    // 🔧 Ejecutar reparación
    const resultado = await repararInconsistencias()
    
    // 📊 Verificar estadísticas finales
    const estadisticasFinales = await obtenerEstadisticasConsistencia()
    
    const duracion = Date.now() - inicioTiempo
    
    console.log(`✅ Mantenimiento completado en ${duracion}ms:`)
    console.log(`   • Items reparados: ${resultado.itemsReparados}`)
    console.log(`   • Inconsistencias restantes: ${estadisticasFinales.itemsInconsistentes}`)
    console.log(`   • Valores negativos restantes: ${estadisticasFinales.itemsNegativos}`)
    
    return {
      exito: true,
      itemsReparados: resultado.itemsReparados,
      errores: resultado.errores,
      duracion
    }
  } catch (error) {
    const duracion = Date.now() - inicioTiempo
    console.error('❌ Error durante mantenimiento programado:', error)
    
    return {
      exito: false,
      itemsReparados: 0,
      errores: [String(error)],
      duracion
    }
  }
}

/**
 * ⏰ Configuración para ejecutar mantenimiento automático
 */
export function configurarMantenimientoAutomatico() {
  // 🕐 Ejecutar cada 6 horas
  const intervalo = 6 * 60 * 60 * 1000 // 6 horas en millisegundos
  
  setInterval(async () => {
    try {
      const reporte = await obtenerReporteSalud()
      
      // 🔧 Solo ejecutar mantenimiento si es necesario
      if (reporte.estado !== 'saludable') {
        console.log('🔧 Ejecutando mantenimiento automático...')
        await ejecutarMantenimientoProgramado()
      } else {
        console.log('✅ Sistema saludable - mantenimiento no necesario')
      }
    } catch (error) {
      console.error('❌ Error en mantenimiento automático:', error)
    }
  }, intervalo)
  
  console.log('⏰ Mantenimiento automático configurado (cada 6 horas)')
}
