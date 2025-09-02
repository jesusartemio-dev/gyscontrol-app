/**
 * 🧹 Configuración Global de Playwright - Teardown
 * 
 * Limpieza después de ejecutar todos los tests E2E.
 * Incluye limpieza de base de datos, archivos temporales y sesiones.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

import { FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs/promises'

/**
 * 🧹 Teardown global que se ejecuta después de todos los tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Iniciando limpieza global de Playwright...')
  
  try {
    // 🗑️ Limpiar archivos de autenticación
    await cleanupAuthFiles()
    
    // 🗄️ Limpiar base de datos de prueba
    await cleanupTestDatabase()
    
    // 📁 Limpiar archivos temporales
    await cleanupTempFiles()
    
    console.log('✅ Limpieza global completada exitosamente')
  } catch (error) {
    console.error('❌ Error en limpieza global:', error)
    // No lanzar error para no fallar el proceso
  }
}

/**
 * 🗑️ Limpiar archivos de autenticación
 */
async function cleanupAuthFiles() {
  console.log('🗑️ Limpiando archivos de autenticación...')
  
  try {
    const authFiles = [
      'auth-admin.json',
      'auth-gerente.json',
      'auth-comercial.json',
      'auth-logistica.json',
      'auth-finanzas.json'
    ]
    
    for (const file of authFiles) {
      const filePath = path.join(__dirname, file)
      try {
        await fs.unlink(filePath)
        console.log(`✅ Eliminado: ${file}`)
      } catch (error) {
        // Archivo no existe, continuar
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error limpiando archivos de autenticación:', errorMessage)
  }
}

/**
 * 🗄️ Limpiar base de datos de prueba
 */
async function cleanupTestDatabase() {
  console.log('🗄️ Limpiando base de datos de prueba...')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
        }
      }
    })
    
    // 🧹 Limpiar datos de prueba en orden correcto (respetando FK)
    await cleanupTestData(prisma)
    
    await prisma.$disconnect()
    console.log('✅ Base de datos de prueba limpiada')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error limpiando base de datos:', errorMessage)
  }
}

/**
 * 🧹 Limpiar datos de prueba específicos
 */
async function cleanupTestData(prisma: any) {
  try {
    // Orden de limpieza respetando relaciones FK
    const cleanupOrder = [
      // 💰 Finanzas
      { model: 'pago', condition: { id: { startsWith: 'pago-test-' } } },
      { model: 'recepcion', condition: { id: { startsWith: 'recepcion-test-' } } },
      { model: 'ordenCompra', condition: { id: { startsWith: 'orden-test-' } } },
  
      
      // 📋 Proyectos y equipos
      { model: 'pedidoEquipo', condition: { id: { startsWith: 'pedido-test-' } } },
      { model: 'proyecto', condition: { id: { startsWith: 'proyecto-test-' } } },
      { model: 'catalogoEquipo', condition: { id: { startsWith: 'equipo-test-' } } },
      
      // 🏢 Proveedores
      { model: 'proveedor', condition: { id: { startsWith: 'prov-test-' } } },
      
      // 👥 Usuarios (al final)
      { model: 'user', condition: { email: { endsWith: '@gys.com' } } }
    ]
    
    for (const { model, condition } of cleanupOrder) {
      try {
        const result = await prisma[model].deleteMany({
          where: condition
        })
        console.log(`🗑️ Eliminados ${result.count} registros de ${model}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.warn(`⚠️ Error eliminando ${model}:`, errorMessage)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error en limpieza de datos:', errorMessage)
  }
}

/**
 * 📁 Limpiar archivos temporales
 */
async function cleanupTempFiles() {
  console.log('📁 Limpiando archivos temporales...')
  
  try {
    const tempDirs = [
      'test-results',
      'playwright-report',
      'coverage'
    ]
    
    for (const dir of tempDirs) {
      try {
        const dirPath = path.join(process.cwd(), dir)
        await fs.rm(dirPath, { recursive: true, force: true })
        console.log(`🗑️ Eliminado directorio: ${dir}`)
      } catch (error) {
        // Directorio no existe, continuar
      }
    }
    
    // 🧹 Limpiar archivos de screenshots y videos antiguos
    await cleanupOldTestArtifacts()
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error limpiando archivos temporales:', errorMessage)
  }
}

/**
 * 🎬 Limpiar artefactos de tests antiguos
 */
async function cleanupOldTestArtifacts() {
  try {
    const artifactDirs = [
      'test-results',
      'playwright-report'
    ]
    
    for (const dir of artifactDirs) {
      const dirPath = path.join(process.cwd(), dir)
      
      try {
        const files = await fs.readdir(dirPath)
        const now = Date.now()
        const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 días
        
        for (const file of files) {
          const filePath = path.join(dirPath, file)
          const stats = await fs.stat(filePath)
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.rm(filePath, { recursive: true, force: true })
            console.log(`🗑️ Eliminado archivo antiguo: ${file}`)
          }
        }
      } catch (error) {
        // Directorio no existe o error de acceso
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error limpiando artefactos antiguos:', errorMessage)
  }
}

/**
 * 📊 Generar reporte de limpieza
 */
async function generateCleanupReport() {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      status: 'completed',
      actions: [
        'Archivos de autenticación eliminados',
        'Base de datos de prueba limpiada',
        'Archivos temporales eliminados',
        'Artefactos antiguos limpiados'
      ]
    }
    
    const reportPath = path.join(process.cwd(), 'cleanup-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    console.log('📊 Reporte de limpieza generado:', reportPath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error generando reporte:', errorMessage)
  }
}

export default globalTeardown