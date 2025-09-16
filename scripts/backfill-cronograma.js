/**
 * 🔄 Script de backfill para migración de datos al módulo cronograma ERP
 * 🎯 Objetivo: Migrar datos existentes de proyectos y tareas al nuevo sistema EDT
 * 📅 Ejecutar una sola vez después del deploy: node scripts/backfill-cronograma.js
 * 👤 Autor: Sistema GYS - Agente TRAE
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ✅ Configuración del backfill
const CONFIG = {
  BATCH_SIZE: 50,
  LOG_FILE: './logs/backfill-cronograma.log',
  BACKUP_FILE: './backups/pre-backfill-backup.json',
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  FORCE: process.argv.includes('--force')
};

// ✅ Logger personalizado
class BackfillLogger {
  constructor(logFile) {
    this.logFile = logFile;
    this.ensureLogDir();
  }

  ensureLogDir() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    
    // Console output
    console.log(logLine.trim());
    
    // File output
    fs.appendFileSync(this.logFile, logLine);
  }

  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  success(message, data) { this.log('success', message, data); }
}

const logger = new BackfillLogger(CONFIG.LOG_FILE);

/**
 * 📊 Estadísticas del backfill
 */
class BackfillStats {
  constructor() {
    this.reset();
  }

  reset() {
    this.proyectosProcesados = 0;
    this.edtsCreados = 0;
    this.tareasConvertidas = 0;
    this.registrosHorasAsociados = 0;
    this.errores = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  addError(error, context) {
    this.errores.push({ error: error.message, context, timestamp: new Date() });
  }

  addWarning(warning, context) {
    this.warnings.push({ warning, context, timestamp: new Date() });
  }

  getReport() {
    const duration = Date.now() - this.startTime;
    return {
      duracion: `${duration}ms`,
      proyectosProcesados: this.proyectosProcesados,
      edtsCreados: this.edtsCreados,
      tareasConvertidas: this.tareasConvertidas,
      registrosHorasAsociados: this.registrosHorasAsociados,
      errores: this.errores.length,
      warnings: this.warnings.length,
      detalleErrores: this.errores,
      detalleWarnings: this.warnings
    };
  }
}

const stats = new BackfillStats();

/**
 * 💾 Crear backup de datos existentes
 */
async function crearBackup() {
  try {
    logger.info('💾 Creando backup de datos existentes...');

    const backupData = {
      timestamp: new Date().toISOString(),
      proyectos: await prisma.proyecto.findMany({
        include: {
          tareas: true,
          registrosHoras: true,
          proyectoEdts: true
        }
      }),
      tareas: await prisma.tarea.findMany(),
      registrosHoras: await prisma.registroHoras.findMany({
        where: { proyectoEdtId: null }
      })
    };

    // Asegurar directorio de backup
    const backupDir = path.dirname(CONFIG.BACKUP_FILE);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.BACKUP_FILE, JSON.stringify(backupData, null, 2));
    
    logger.success('✅ Backup creado exitosamente', {
      archivo: CONFIG.BACKUP_FILE,
      proyectos: backupData.proyectos.length,
      tareas: backupData.tareas.length,
      registrosHoras: backupData.registrosHoras.length
    });

    return backupData;

  } catch (error) {
    logger.error('❌ Error creando backup:', error.message);
    throw error;
  }
}

/**
 * 🔍 Verificar prerrequisitos
 */
async function verificarPrerrequisitos() {
  try {
    logger.info('🔍 Verificando prerrequisitos...');

    // ✅ Verificar conexión a BD
    await prisma.$connect();
    logger.info('✅ Conexión a base de datos OK');

    // ✅ Verificar que existen categorías de servicio
    const categoriasCount = await prisma.categoriaServicio.count();
    if (categoriasCount === 0) {
      throw new Error('No existen categorías de servicio. Ejecutar seeders primero.');
    }
    logger.info(`✅ Categorías de servicio disponibles: ${categoriasCount}`);

    // ✅ Verificar que existen usuarios
    const usuariosCount = await prisma.user.count();
    if (usuariosCount === 0) {
      throw new Error('No existen usuarios en el sistema.');
    }
    logger.info(`✅ Usuarios disponibles: ${usuariosCount}`);

    // ✅ Verificar proyectos existentes
    const proyectosCount = await prisma.proyecto.count();
    logger.info(`📊 Proyectos a procesar: ${proyectosCount}`);

    // ✅ Verificar tareas existentes
    const tareasCount = await prisma.tarea.count();
    logger.info(`📊 Tareas a convertir: ${tareasCount}`);

    // ✅ Verificar registros de horas sin EDT
    const registrosSinEdt = await prisma.registroHoras.count({
      where: { proyectoEdtId: null }
    });
    logger.info(`📊 Registros de horas a asociar: ${registrosSinEdt}`);

    return {
      proyectos: proyectosCount,
      tareas: tareasCount,
      registrosSinEdt
    };

  } catch (error) {
    logger.error('❌ Error en verificación de prerrequisitos:', error.message);
    throw error;
  }
}

/**
 * 🏗️ Crear EDT raíz para un proyecto
 */
async function crearEdtRaiz(proyecto, categoriaDefault, usuarioDefault) {
  try {
    const edtRaiz = {
      proyectoId: proyecto.id,
      categoriaServicioId: categoriaDefault.id,
      responsableId: usuarioDefault.id,
      nombre: `EDT Principal - ${proyecto.nombre}`,
      descripcion: `EDT raíz generado automáticamente para el proyecto ${proyecto.nombre}`,
      estado: 'planeado',
      prioridad: 'media',
      horasPlan: 0,
      horasReales: 0,
      porcentajeAvance: 0,
      fechaInicioPlan: proyecto.fechaInicio || new Date(),
      fechaFinPlan: proyecto.fechaFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      nivel: 1,
      orden: 1,
      parentId: null
    };

    if (CONFIG.DRY_RUN) {
      logger.info('🔄 [DRY RUN] Crearía EDT raíz:', edtRaiz);
      return { id: `dry-run-${proyecto.id}`, ...edtRaiz };
    }

    const edtCreado = await prisma.proyectoEdt.create({
      data: edtRaiz
    });

    stats.edtsCreados++;
    logger.info(`✅ EDT raíz creado para proyecto ${proyecto.nombre}`, { edtId: edtCreado.id });
    
    return edtCreado;

  } catch (error) {
    stats.addError(error, `Crear EDT raíz para proyecto ${proyecto.id}`);
    logger.error(`❌ Error creando EDT raíz para proyecto ${proyecto.nombre}:`, error.message);
    throw error;
  }
}

/**
 * 🔄 Convertir tareas existentes a EDT
 */
async function convertirTareasAEdt(proyecto, edtRaiz, categoriaDefault, usuarioDefault) {
  try {
    const tareas = await prisma.tarea.findMany({
      where: { proyectoId: proyecto.id },
      orderBy: { createdAt: 'asc' }
    });

    if (tareas.length === 0) {
      logger.info(`ℹ️ No hay tareas para convertir en proyecto ${proyecto.nombre}`);
      return [];
    }

    logger.info(`🔄 Convirtiendo ${tareas.length} tareas a EDT para proyecto ${proyecto.nombre}`);

    const edtsCreados = [];
    let orden = 2; // El EDT raíz tiene orden 1

    for (const tarea of tareas) {
      try {
        // Mapear estado de tarea a estado EDT
        const estadoMapping = {
          'pendiente': 'planeado',
          'en_progreso': 'en_progreso',
          'completada': 'completado',
          'cancelada': 'cancelado'
        };

        // Mapear prioridad
        const prioridadMapping = {
          'baja': 'baja',
          'media': 'media',
          'alta': 'alta',
          'critica': 'critica'
        };

        const edtData = {
          proyectoId: proyecto.id,
          categoriaServicioId: categoriaDefault.id,
          responsableId: tarea.responsableId || usuarioDefault.id,
          parentId: edtRaiz.id,
          nombre: tarea.nombre,
          descripcion: tarea.descripcion || `Convertido desde tarea: ${tarea.nombre}`,
          estado: estadoMapping[tarea.estado] || 'planeado',
          prioridad: prioridadMapping[tarea.prioridad] || 'media',
          horasPlan: tarea.horasEstimadas || 8,
          horasReales: 0, // Se calculará después con registros de horas
          porcentajeAvance: tarea.estado === 'completada' ? 100 : 0,
          fechaInicioPlan: tarea.fechaInicio || new Date(),
          fechaFinPlan: tarea.fechaFin || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          nivel: 2,
          orden: orden++,
          // Metadatos de migración
          notas: `Migrado desde tarea ID: ${tarea.id} el ${new Date().toISOString()}`
        };

        if (CONFIG.DRY_RUN) {
          logger.info('🔄 [DRY RUN] Crearía EDT desde tarea:', { tareaId: tarea.id, edtData });
          edtsCreados.push({ id: `dry-run-edt-${tarea.id}`, ...edtData });
        } else {
          const edtCreado = await prisma.proyectoEdt.create({
            data: edtData
          });
          
          edtsCreados.push(edtCreado);
          stats.edtsCreados++;
          stats.tareasConvertidas++;
          
          if (CONFIG.VERBOSE) {
            logger.info(`✅ Tarea convertida a EDT:`, {
              tareaId: tarea.id,
              tareaNombre: tarea.nombre,
              edtId: edtCreado.id,
              edtNombre: edtCreado.nombre
            });
          }
        }

      } catch (error) {
        stats.addError(error, `Convertir tarea ${tarea.id} a EDT`);
        logger.error(`❌ Error convirtiendo tarea ${tarea.id}:`, error.message);
        // Continuar con la siguiente tarea
      }
    }

    logger.success(`✅ ${edtsCreados.length} tareas convertidas a EDT para proyecto ${proyecto.nombre}`);
    return edtsCreados;

  } catch (error) {
    stats.addError(error, `Convertir tareas del proyecto ${proyecto.id}`);
    logger.error(`❌ Error convirtiendo tareas del proyecto ${proyecto.nombre}:`, error.message);
    return [];
  }
}

/**
 * 🕐 Asociar registros de horas a EDT
 */
async function asociarRegistrosHoras(proyecto, edtsCreados) {
  try {
    const registrosSinEdt = await prisma.registroHoras.findMany({
      where: {
        proyectoId: proyecto.id,
        proyectoEdtId: null
      }
    });

    if (registrosSinEdt.length === 0) {
      logger.info(`ℹ️ No hay registros de horas para asociar en proyecto ${proyecto.nombre}`);
      return;
    }

    logger.info(`🕐 Asociando ${registrosSinEdt.length} registros de horas en proyecto ${proyecto.nombre}`);

    // Estrategia: asociar registros al primer EDT disponible o al EDT raíz
    const edtParaAsociar = edtsCreados.length > 1 ? edtsCreados[1] : edtsCreados[0]; // Evitar EDT raíz si hay otros

    if (!edtParaAsociar) {
      stats.addWarning('No hay EDT disponible para asociar registros de horas', `Proyecto ${proyecto.id}`);
      return;
    }

    let registrosAsociados = 0;
    let horasTotales = 0;

    for (const registro of registrosSinEdt) {
      try {
        if (CONFIG.DRY_RUN) {
          logger.info('🔄 [DRY RUN] Asociaría registro de horas:', {
            registroId: registro.id,
            edtId: edtParaAsociar.id,
            horas: registro.horasTrabajadas
          });
        } else {
          await prisma.registroHoras.update({
            where: { id: registro.id },
            data: { proyectoEdtId: edtParaAsociar.id }
          });
        }

        registrosAsociados++;
        horasTotales += registro.horasTrabajadas;
        stats.registrosHorasAsociados++;

      } catch (error) {
        stats.addError(error, `Asociar registro de horas ${registro.id}`);
        logger.error(`❌ Error asociando registro ${registro.id}:`, error.message);
      }
    }

    // Actualizar horas reales del EDT
    if (!CONFIG.DRY_RUN && registrosAsociados > 0) {
      await prisma.proyectoEdt.update({
        where: { id: edtParaAsociar.id },
        data: { horasReales: horasTotales }
      });
    }

    logger.success(`✅ ${registrosAsociados} registros asociados (${horasTotales}h) al EDT ${edtParaAsociar.nombre}`);

  } catch (error) {
    stats.addError(error, `Asociar registros de horas del proyecto ${proyecto.id}`);
    logger.error(`❌ Error asociando registros de horas del proyecto ${proyecto.nombre}:`, error.message);
  }
}

/**
 * 🏗️ Procesar un proyecto individual
 */
async function procesarProyecto(proyecto, categoriaDefault, usuarioDefault) {
  try {
    logger.info(`🏗️ Procesando proyecto: ${proyecto.nombre} (ID: ${proyecto.id})`);

    // ✅ Verificar si ya tiene EDT
    const edtsExistentes = await prisma.proyectoEdt.count({
      where: { proyectoId: proyecto.id }
    });

    if (edtsExistentes > 0 && !CONFIG.FORCE) {
      stats.addWarning('Proyecto ya tiene EDT, saltando', `Proyecto ${proyecto.id}`);
      logger.warn(`⚠️ Proyecto ${proyecto.nombre} ya tiene ${edtsExistentes} EDT. Use --force para sobrescribir.`);
      return;
    }

    // ✅ Crear EDT raíz
    const edtRaiz = await crearEdtRaiz(proyecto, categoriaDefault, usuarioDefault);
    const edtsCreados = [edtRaiz];

    // ✅ Convertir tareas a EDT
    const edtsDesTareas = await convertirTareasAEdt(proyecto, edtRaiz, categoriaDefault, usuarioDefault);
    edtsCreados.push(...edtsDesTareas);

    // ✅ Asociar registros de horas
    await asociarRegistrosHoras(proyecto, edtsCreados);

    stats.proyectosProcesados++;
    logger.success(`✅ Proyecto ${proyecto.nombre} procesado exitosamente`, {
      edtsCreados: edtsCreados.length,
      tareasConvertidas: edtsDesTareas.length
    });

  } catch (error) {
    stats.addError(error, `Procesar proyecto ${proyecto.id}`);
    logger.error(`❌ Error procesando proyecto ${proyecto.nombre}:`, error.message);
  }
}

/**
 * 🚀 Función principal de backfill
 */
async function ejecutarBackfill() {
  try {
    logger.info('🚀 Iniciando backfill del módulo cronograma');
    logger.info('⚙️ Configuración:', CONFIG);

    // ✅ Verificar prerrequisitos
    const prereqs = await verificarPrerrequisitos();
    
    if (prereqs.proyectos === 0) {
      logger.info('ℹ️ No hay proyectos para procesar. Backfill completado.');
      return;
    }

    // ✅ Crear backup
    if (!CONFIG.DRY_RUN) {
      await crearBackup();
    }

    // ✅ Obtener datos de referencia
    const categoriaDefault = await prisma.categoriaServicio.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    const usuarioDefault = await prisma.user.findFirst({
      where: { role: { in: ['admin', 'gerente'] } },
      orderBy: { createdAt: 'asc' }
    });

    if (!categoriaDefault || !usuarioDefault) {
      throw new Error('No se encontraron categoría de servicio o usuario por defecto');
    }

    logger.info('📋 Referencias por defecto:', {
      categoria: categoriaDefault.nombre,
      usuario: usuarioDefault.name
    });

    // ✅ Procesar proyectos en lotes
    let offset = 0;
    let proyectosProcesados = 0;

    while (true) {
      const proyectos = await prisma.proyecto.findMany({
        take: CONFIG.BATCH_SIZE,
        skip: offset,
        orderBy: { createdAt: 'asc' }
      });

      if (proyectos.length === 0) break;

      logger.info(`📦 Procesando lote ${Math.floor(offset / CONFIG.BATCH_SIZE) + 1}: ${proyectos.length} proyectos`);

      for (const proyecto of proyectos) {
        await procesarProyecto(proyecto, categoriaDefault, usuarioDefault);
        proyectosProcesados++;
        
        // Progress indicator
        if (proyectosProcesados % 10 === 0) {
          logger.info(`📊 Progreso: ${proyectosProcesados}/${prereqs.proyectos} proyectos procesados`);
        }
      }

      offset += CONFIG.BATCH_SIZE;
    }

    // ✅ Reporte final
    const report = stats.getReport();
    logger.success('🎉 Backfill completado exitosamente!');
    logger.info('📊 Reporte final:', report);

    // ✅ Guardar reporte
    const reportFile = `./logs/backfill-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logger.info(`📋 Reporte guardado en: ${reportFile}`);

    return report;

  } catch (error) {
    logger.error('❌ Error crítico en backfill:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 🧹 Función de rollback (en caso de problemas)
 */
async function rollback() {
  try {
    logger.info('🧹 Iniciando rollback del backfill...');

    if (!fs.existsSync(CONFIG.BACKUP_FILE)) {
      throw new Error(`Archivo de backup no encontrado: ${CONFIG.BACKUP_FILE}`);
    }

    const backupData = JSON.parse(fs.readFileSync(CONFIG.BACKUP_FILE, 'utf8'));
    
    // Eliminar EDT creados durante el backfill
    const edtsCreados = await prisma.proyectoEdt.findMany({
      where: {
        notas: { contains: 'Migrado desde tarea ID:' }
      }
    });

    logger.info(`🗑️ Eliminando ${edtsCreados.length} EDT creados durante el backfill...`);
    
    await prisma.proyectoEdt.deleteMany({
      where: {
        notas: { contains: 'Migrado desde tarea ID:' }
      }
    });

    // Restaurar asociaciones de registros de horas
    await prisma.registroHoras.updateMany({
      where: { proyectoEdtId: { not: null } },
      data: { proyectoEdtId: null }
    });

    logger.success('✅ Rollback completado exitosamente');

  } catch (error) {
    logger.error('❌ Error en rollback:', error.message);
    throw error;
  }
}

// ✅ Manejo de argumentos de línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🔄 Script de Backfill - Cronograma ERP

Uso: node scripts/backfill-cronograma.js [opciones]

Opciones:
  --dry-run     Simular ejecución sin hacer cambios
  --verbose     Mostrar información detallada
  --force       Sobrescribir EDT existentes
  --rollback    Deshacer cambios del backfill
  --help        Mostrar esta ayuda

Ejemplos:
  node scripts/backfill-cronograma.js --dry-run
  node scripts/backfill-cronograma.js --verbose
  node scripts/backfill-cronograma.js --force
  node scripts/backfill-cronograma.js --rollback
`);
    process.exit(0);
  }

  if (args.includes('--rollback')) {
    rollback()
      .then(() => {
        console.log('✅ Rollback completado');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error en rollback:', error.message);
        process.exit(1);
      });
  } else {
    ejecutarBackfill()
      .then((report) => {
        console.log('✅ Backfill completado exitosamente');
        console.log('📊 Estadísticas finales:', {
          proyectos: report.proyectosProcesados,
          edts: report.edtsCreados,
          tareas: report.tareasConvertidas,
          registros: report.registrosHorasAsociados,
          errores: report.errores,
          warnings: report.warnings
        });
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Error en backfill:', error.message);
        process.exit(1);
      });
  }
}

module.exports = {
  ejecutarBackfill,
  rollback,
  BackfillStats,
  BackfillLogger
};