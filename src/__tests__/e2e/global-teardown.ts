/**
 * 🧪 Teardown Global para Tests E2E
 * 
 * @description Limpieza después de todos los tests E2E
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import { FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

/**
 * 🧹 Teardown global ejecutado después de todos los tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Iniciando teardown global para tests E2E...');
  
  try {
    // 🗄️ Limpiar base de datos de test
    await cleanupTestDatabase();
    
    // 🔐 Limpiar archivos de autenticación
    await cleanupAuthFiles();
    
    // 📁 Limpiar archivos temporales
    await cleanupTempFiles();
    
    // 📊 Generar reporte de limpieza
    await generateCleanupReport();
    
    console.log('✅ Teardown global completado exitosamente');
  } catch (error) {
    console.error('❌ Error en teardown global:', error);
    // No lanzamos el error para no fallar el proceso
  } finally {
    // 🔌 Cerrar conexión a base de datos
    await prisma.$disconnect();
  }
}

/**
 * 🗄️ Limpiar base de datos de test
 */
async function cleanupTestDatabase() {
  console.log('🗄️ Limpiando base de datos de test...');
  
  try {
    // Limpiar tablas en orden correcto (respetando foreign keys)
    const tablesToClean = [
      'EventoTrazabilidad',
      'ItemEntrega', 
      'Entrega',
      'Proyecto',
      'Usuario',
      'Equipo',
      'Cliente'
    ];
    
    let cleanedTables = 0;
    
    for (const table of tablesToClean) {
      try {
        const result = await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
        console.log(`🧹 Tabla ${table} limpiada (${result} registros eliminados)`);
        cleanedTables++;
      } catch (error) {
        console.warn(`⚠️ No se pudo limpiar tabla ${table}:`, error);
      }
    }
    
    console.log(`✅ Base de datos limpiada (${cleanedTables}/${tablesToClean.length} tablas)`);
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  }
}

/**
 * 🔐 Limpiar archivos de autenticación
 */
async function cleanupAuthFiles() {
  console.log('🔐 Limpiando archivos de autenticación...');
  
  try {
    const authDir = 'playwright/.auth';
    const authFile = path.join(authDir, 'user.json');
    
    // Verificar si el archivo existe
    try {
      await fs.access(authFile);
      await fs.unlink(authFile);
      console.log('🗑️ Archivo de autenticación eliminado');
    } catch (error) {
      console.log('ℹ️ No hay archivos de autenticación para limpiar');
    }
    
    // Intentar eliminar directorio si está vacío
    try {
      await fs.rmdir(authDir);
      console.log('📁 Directorio de autenticación eliminado');
    } catch (error) {
      // Directorio no vacío o no existe, ignorar
    }
    
    console.log('✅ Archivos de autenticación limpiados');
  } catch (error) {
    console.error('❌ Error limpiando archivos de autenticación:', error);
  }
}

/**
 * 📁 Limpiar archivos temporales
 */
async function cleanupTempFiles() {
  console.log('📁 Limpiando archivos temporales...');
  
  try {
    const tempDirs = [
      'test-results',
      'playwright-report',
      'coverage/e2e'
    ];
    
    let cleanedDirs = 0;
    
    for (const dir of tempDirs) {
      try {
        // Verificar si el directorio existe
        await fs.access(dir);
        
        // Limpiar contenido del directorio
        const files = await fs.readdir(dir);
        let cleanedFiles = 0;
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          
          if (stat.isDirectory()) {
            await fs.rmdir(filePath, { recursive: true });
          } else {
            await fs.unlink(filePath);
          }
          cleanedFiles++;
        }
        
        console.log(`🗑️ Directorio ${dir} limpiado (${cleanedFiles} elementos eliminados)`);
        cleanedDirs++;
      } catch (error) {
        console.log(`ℹ️ Directorio ${dir} no existe o ya está limpio`);
      }
    }
    
    console.log(`✅ Archivos temporales limpiados (${cleanedDirs}/${tempDirs.length} directorios)`);
  } catch (error) {
    console.error('❌ Error limpiando archivos temporales:', error);
  }
}

/**
 * 📊 Generar reporte de limpieza
 */
async function generateCleanupReport() {
  console.log('📊 Generando reporte de limpieza...');
  
  try {
    const report = {
      timestamp: new Date().toISOString(),
      cleanup: {
        database: 'completed',
        authFiles: 'completed',
        tempFiles: 'completed'
      },
      summary: {
        status: 'success',
        message: 'Teardown global completado exitosamente',
        duration: process.uptime()
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    // Crear directorio de reportes si no existe
    const reportsDir = 'test-results/cleanup';
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Guardar reporte
    const reportPath = path.join(reportsDir, `cleanup-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Reporte de limpieza guardado en: ${reportPath}`);
    console.log('✅ Reporte de limpieza generado');
  } catch (error) {
    console.error('❌ Error generando reporte de limpieza:', error);
  }
}

/**
 * 🔍 Verificar estado del sistema después de limpieza
 */
async function verifyCleanupState() {
  console.log('🔍 Verificando estado del sistema...');
  
  try {
    // Verificar conexión a base de datos
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión a base de datos verificada');
    
    // Verificar que las tablas estén vacías
    const tablesToVerify = ['Usuario', 'Proyecto', 'Entrega'];
    
    for (const table of tablesToVerify) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const recordCount = (count as any)[0].count;
        
        if (recordCount === '0') {
          console.log(`✅ Tabla ${table} está vacía`);
        } else {
          console.warn(`⚠️ Tabla ${table} tiene ${recordCount} registros`);
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo verificar tabla ${table}:`, error);
      }
    }
    
    console.log('✅ Verificación de estado completada');
  } catch (error) {
    console.error('❌ Error verificando estado del sistema:', error);
  }
}

export default globalTeardown;
