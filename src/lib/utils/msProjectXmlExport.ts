// ===================================================
// 📁 Archivo: msProjectXmlExport.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Utilidad para exportar cronograma a formato XML de MS Project
//
// ✅ Convierte estructura jerárquica a formato MPP compatible
// ✅ GYS-GEN-19: Sincronización App ↔ Exportación XML
// ✍️ Autor: Kilo Code - Implementación Exportación MS Project
// 📅 Última actualización: 2025-10-12
// ===================================================

import { validarAntesDeExportar, autoCorregirInconsistencias } from '@/lib/validators/cronogramaRules'
import { ProyectoDependenciaTarea } from '@/types/modelos'

interface GanttTask {
  id: string
  nombre: string
  tipo: 'fase' | 'edt' | 'zona' | 'actividad' | 'tarea'
  fechaInicio: Date | null
  fechaFin: Date | null
  progreso: number
  estado: string
  nivel: number
  parentId?: string
  children?: GanttTask[]
  horasEstimadas?: number
  responsable?: string
  descripcion?: string
  dependenciaId?: string // Para dependencias entre tareas
  dependenciasAvanzadas?: ProyectoDependenciaTarea[] // Para dependencias avanzadas - GYS-XML-09
}

/**
 * Helper functions for date and duration calculations
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

function calcularMinutosSemanales(calendarioLaboral?: any): number {
  if (!calendarioLaboral) return 2400 // Default 40 hours/week (8 hours/day * 5 days)
  return (calendarioLaboral.horasPorDia || 8) * 60 * 5 // Assume 5 working days
}

function generarDiasCalendarioDinamico(calendarioLaboral?: any): string {
  if (!calendarioLaboral?.diasCalendario) {
    // Default calendar for Colombia
    return `
        <WeekDay>
          <DayType>1</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>
        <WeekDay>
          <DayType>2</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>3</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>4</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>5</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>6</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>7</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>`
  }

  // Generate dynamic calendar based on calendarioLaboral.diasCalendario
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  let xml = ''

  for (let i = 0; i < 7; i++) {
    const diaConfig = calendarioLaboral.diasCalendario.find((d: any) => d.diaSemana === dias[i])
    const dayType = i + 1 // MS Project: 1=Sunday, 2=Monday, etc.
    const esLaborable = diaConfig?.esLaborable || (i >= 1 && i <= 5) // Default Mon-Fri

    xml += `
        <WeekDay>
          <DayType>${dayType}</DayType>
          <DayWorking>${esLaborable ? 1 : 0}</DayWorking>`

    if (esLaborable) {
      const horaInicioManana = diaConfig?.horaInicioManana || calendarioLaboral.horaInicioManana || '08:00'
      const horaFinManana = diaConfig?.horaFinManana || calendarioLaboral.horaFinManana || '12:00'
      const horaInicioTarde = diaConfig?.horaInicioTarde || calendarioLaboral.horaInicioTarde || '13:00'
      const horaFinTarde = diaConfig?.horaFinTarde || calendarioLaboral.horaFinTarde || '17:00'

      xml += `
          <WorkingTimes>
            <WorkingTime>
              <FromTime>${horaInicioManana}:00</FromTime>
              <ToTime>${horaFinManana}:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>${horaInicioTarde}:00</FromTime>
              <ToTime>${horaFinTarde}:00</ToTime>
            </WorkingTime>
          </WorkingTimes>`
    }

    xml += `
        </WeekDay>`
  }

  return xml
}

function getNextWorkingDay(date: Date): Date {
  const d = new Date(date)
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

function calculateWorkingMinutes(start: Date, finish: Date): number {
  const startDate = new Date(start)
  startDate.setHours(0, 0, 0, 0)
  const finishDate = new Date(finish)
  finishDate.setHours(0, 0, 0, 0)
  if (finishDate < startDate) return 0
  let days = 0
  const current = new Date(startDate)
  while (current <= finishDate) {
    if (!isWeekend(current)) {
      days++
    }
    current.setDate(current.getDate() + 1)
  }
  return days * 480
}

/**
 * Convierte horas a formato ISO 8601 de HORAS para MS Project
 * GYS-XML-02: Duraciones en formato PT#H0M0S (horas) para compatibilidad nativa
 * MS Project nativo usa HORAS, no días, para evitar conversiones automáticas
 */
function toIsoHoursPeriod(hours: number): string {
  if (hours <= 0) return 'PT0H0M0S'

  // MS Project nativo: Duración en HORAS ISO 8601
  // Ej: 352 horas = PT352H0M0S (se muestra como 44d en MS Project)
  return `PT${Math.round(hours)}H0M0S`
}

interface MSProjectTask {
  UID: number
  ID: number
  Name: string
  Type: number // 0 = Fixed Units (MS Project native), 1 = Fixed Duration, 2 = Fixed Work
  OutlineLevel: number
  OutlineNumber: string
  Start?: string // Opcional para tareas summary
  Finish?: string // Opcional para tareas summary
  Duration?: string // Opcional para tareas summary
  PercentComplete: number
  Notes?: string
  parentId?: number // Para jerarquía ParentTaskUID
  hasChildren?: boolean // Para identificar tareas summary
  isMilestone?: boolean // Para identificar milestones
  // MS Project native manual fields
  ManualStart?: string
  ManualFinish?: string
  ManualDuration?: string
  // Campos para tareas summary
  Summary?: number
  DisplayAsSummary?: number
  TaskMode?: number
  ConstraintType?: number
  Manual?: number
}

/**
 * Valida datos antes de exportación (GYS-XML-07)
 */
function validatePreExport(tasks: GanttTask[], calendarioLaboral?: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validar calendario - permitir null (usará calendario por defecto)
  if (calendarioLaboral) {
    if (!calendarioLaboral.horasPorDia || calendarioLaboral.horasPorDia <= 0) {
      errors.push('Horas por día en calendario laboral inválidas')
    }
    if (!calendarioLaboral.diasCalendario || calendarioLaboral.diasCalendario.length === 0) {
      errors.push('No hay días laborables configurados en el calendario')
    }
  }

  // Validar tareas
  if (tasks.length === 0) {
    errors.push('No hay tareas para exportar')
  }

  // Validar IDs únicos
  const ids = new Set<string>()
  tasks.forEach(task => {
    if (ids.has(task.id)) {
      errors.push(`ID duplicado: ${task.id}`)
    }
    ids.add(task.id)
  })

  // Validar fechas y duraciones
  tasks.forEach(task => {
    const hasChildren = task.children && task.children.length > 0
    if (!hasChildren) { // Solo validar tareas hoja
      // Validar que las fechas sean objetos Date válidos
      if (task.fechaInicio && !(task.fechaInicio instanceof Date)) {
        errors.push(`Tarea "${task.nombre}": fechaInicio no es un objeto Date válido`)
      }
      if (task.fechaFin && !(task.fechaFin instanceof Date)) {
        errors.push(`Tarea "${task.nombre}": fechaFin no es un objeto Date válido`)
      }

      // Validar comparación de fechas solo si ambas son Date válidos
      if (task.fechaInicio instanceof Date && task.fechaFin instanceof Date && task.fechaInicio >= task.fechaFin) {
        errors.push(`Tarea "${task.nombre}": fecha inicio debe ser anterior a fecha fin`)
      }

      // Validar milestones
      if (task.horasEstimadas === 0 && !task.fechaInicio) {
        errors.push(`Milestone "${task.nombre}": debe tener fecha definida`)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Valida dependencias avanzadas antes de exportación (GYS-XML-09)
 */
function validarDependenciasAvanzadas(dependencias: ProyectoDependenciaTarea[], tasks: GanttTask[]): string[] {
  const errores: string[] = []
  const taskIds = new Set(tasks.map(t => t.id))

  dependencias.forEach(dep => {
    // Validar que tarea origen existe
    if (!taskIds.has(dep.tareaOrigenId)) {
      errores.push(`Dependencia inválida: tarea origen ${dep.tareaOrigenId} no existe`)
    }

    // Validar que tarea dependiente existe
    if (!taskIds.has(dep.tareaDependienteId)) {
      errores.push(`Dependencia inválida: tarea dependiente ${dep.tareaDependienteId} no existe`)
    }

    // Validar tipo de dependencia
    const tiposValidos = ['fin_a_inicio', 'inicio_a_inicio', 'fin_a_fin', 'inicio_a_fin']
    if (!tiposValidos.includes(dep.tipo)) {
      errores.push(`Tipo de dependencia inválido: ${dep.tipo} para dependencia ${dep.id}`)
    }

    // Validar que no hay ciclos (básico)
    if (dep.tareaOrigenId === dep.tareaDependienteId) {
      errores.push(`Dependencia cíclica detectada: tarea ${dep.tareaOrigenId} depende de sí misma`)
    }
  })

  return errores
}

/**
 * Valida y corrige tareas MSPDI antes de generar XML (GYS-XML-VERIFICATION)
 */
function validateAndCorrectTasks(tasks: MSProjectTask[], calendarioLaboral?: any): MSProjectTask[] {
  console.log('🔍 MSPDI VALIDATION - Validating', tasks.length, 'tasks...')

  const errors: string[] = []
  const corrections: string[] = []

  tasks.forEach(task => {
    const isLeaf = !task.hasChildren && !task.isMilestone
    const isSummary = task.hasChildren && !task.isMilestone
    const isMilestoneTask = task.isMilestone

    // VALIDACIÓN 1: Tareas hoja deben tener Start, Finish, Duration=PT{H}H0M0S (MS Project native)
    if (isLeaf) {
      if (!task.Start) {
        errors.push(`❌ TASK ${task.Name} (ID:${task.ID}): Missing <Start> field`)
      }
      if (!task.Finish) {
        errors.push(`❌ TASK ${task.Name} (ID:${task.ID}): Missing <Finish> field`)
      }
      if (!task.Duration) {
        errors.push(`❌ TASK ${task.Name} (ID:${task.ID}): Missing <Duration> field`)
      } else if (!task.Duration.startsWith('PT') || !task.Duration.includes('H')) {
        errors.push(`❌ TASK ${task.Name} (ID:${task.ID}): Invalid Duration format "${task.Duration}" - should be PT{H}H0M0S`)
        // CORRECCIÓN: Convertir a formato MS Project native
        const hoursMatch = task.Duration.match(/(\d+)/)
        if (hoursMatch) {
          const hours = parseInt(hoursMatch[1])
          task.Duration = `PT${hours}H0M0S`
          corrections.push(`✅ TASK ${task.Name}: Corrected Duration to ${task.Duration}`)
        }
      }

      // VALIDACIÓN: Finish debe ser coherente con Start + Duration
      if (task.Start && task.Finish && task.Duration) {
        const startDate = new Date(task.Start)
        const finishDate = new Date(task.Finish)
        const durationMatch = task.Duration.match(/PT(\d+)H/)
        if (durationMatch) {
          const expectedHours = parseInt(durationMatch[1])
          const expectedDays = Math.ceil(expectedHours / 8) // 8 hours per day
          const actualDays = Math.ceil((finishDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

          if (Math.abs(actualDays - expectedDays) > 1) { // Tolerancia de 1 día
            errors.push(`❌ TASK ${task.Name}: Finish date inconsistency. Expected ~${expectedDays} days, got ${actualDays} days`)
            // CORRECCIÓN: Recalcular Finish
            const correctedFinish = new Date(startDate)
            correctedFinish.setDate(startDate.getDate() + expectedDays)
            task.Finish = formatMSProjectDateWithTime(correctedFinish, '17:00:00')
            corrections.push(`✅ TASK ${task.Name}: Corrected Finish to ${task.Finish}`)
          }
        }
      }
    }

    // VALIDACIÓN 2: Tareas summary NO deben tener Start/Finish/Duration
    if (isSummary) {
      if (task.Start) {
        errors.push(`❌ SUMMARY ${task.Name} (ID:${task.ID}): Should NOT have <Start> field`)
        task.Start = undefined
        corrections.push(`✅ SUMMARY ${task.Name}: Removed Start field`)
      }
      if (task.Finish) {
        errors.push(`❌ SUMMARY ${task.Name} (ID:${task.ID}): Should NOT have <Finish> field`)
        task.Finish = undefined
        corrections.push(`✅ SUMMARY ${task.Name}: Removed Finish field`)
      }
      if (task.Duration) {
        errors.push(`❌ SUMMARY ${task.Name} (ID:${task.ID}): Should NOT have <Duration> field`)
        task.Duration = undefined
        corrections.push(`✅ SUMMARY ${task.Name}: Removed Duration field`)
      }
    }

    // VALIDACIÓN 3: Milestones deben tener Duration=PT0H0M0S
    if (isMilestoneTask) {
      if (task.Duration !== 'PT0H0M0S') {
        errors.push(`❌ MILESTONE ${task.Name} (ID:${task.ID}): Duration should be PT0H0M0S, got "${task.Duration}"`)
        task.Duration = 'PT0H0M0S'
        corrections.push(`✅ MILESTONE ${task.Name}: Corrected Duration to PT0H0M0S`)
      }
    }
  })

  // REPORTAR RESULTADOS
  if (errors.length > 0) {
    console.log('🚨 MSPDI VALIDATION ERRORS:')
    errors.forEach(error => console.log('  ', error))
  }

  if (corrections.length > 0) {
    console.log('🔧 MSPDI CORRECTIONS APPLIED:')
    corrections.forEach(correction => console.log('  ', correction))
  }

  if (errors.length === 0) {
    console.log('✅ MSPDI VALIDATION PASSED: All tasks meet MSPDI requirements')
  }

  return tasks
}

/**
 * Convierte tareas del cronograma a formato MS Project XML
 */
export function convertToMSProjectXML(tasks: GanttTask[], projectName: string = 'Cronograma GYS', calendarioLaboral?: any): string {
  // GYS-XML-EXPORT: Exportación directa sin validaciones ni cálculos
  // El cronograma ya está validado y calculado en la vista Gantt
  // Solo mapear los datos existentes al formato XML de MS Project

  // Validar datos antes de exportación (GYS-XML-07)
  const validation = validatePreExport(tasks, calendarioLaboral)
  if (!validation.isValid) {
    throw new Error(`Errores de validación en exportación XML:\n${validation.errors.join('\n')}`)
  }

  // Validar dependencias avanzadas si existen (GYS-XML-09)
  const dependenciasAvanzadas = tasks.flatMap(task => task.dependenciasAvanzadas || [])
  if (dependenciasAvanzadas.length > 0) {
    console.log(`🔗 GYS-XML-09: Validating ${dependenciasAvanzadas.length} advanced dependencies...`)
    const erroresDependencias = validarDependenciasAvanzadas(dependenciasAvanzadas, tasks)
    if (erroresDependencias.length > 0) {
      console.warn('⚠️ GYS-XML-09: Dependency validation warnings:', erroresDependencias)
      // No bloqueamos la exportación por dependencias inválidas, solo advertimos
    }
  }

  console.log('🔍 MSPDI EXPORT - Starting conversion for', tasks.length, 'tasks')

  // GYS-XML-EXPORT: Crear tarea raíz del proyecto
  const projectRootTask: MSProjectTask = {
    UID: 1,
    ID: 1,
    Name: projectName,
    Type: 1, // Fixed Duration
    OutlineLevel: 1,
    OutlineNumber: '1',
    Summary: 1,
    DisplayAsSummary: 1,
    TaskMode: 2, // Auto-scheduled
    ConstraintType: 2, // As Soon As Possible
    Manual: 0,
    PercentComplete: 0,
    hasChildren: true,
    isMilestone: false
  }

  const msProjectTasks: MSProjectTask[] = [projectRootTask]
  let taskCounter = 2
  const taskIdMap = new Map<string, number>()

  // Función recursiva para procesar tareas (mapeo directo sin cálculos)
  function processTask(task: GanttTask, outlineNumber: string = '1', parentUid: number = 1): void {
    const uid = taskCounter++
    taskIdMap.set(task.id, uid)

    // Usar OutlineNumber tal cual viene del Gantt (preservar jerarquía)
    const currentOutlineNumber = outlineNumber === '1' ? `${taskCounter - 1}` : `${outlineNumber}.${taskCounter - 1}`

    // Determinar tipo de tarea basado en datos del Gantt
    const hasChildren = task.children && task.children.length > 0
    const isPhase = task.tipo === 'fase'
    const isSummary = hasChildren || isPhase
    const isMilestone = (isPhase && task.nombre?.toUpperCase().includes('CIERRE') && !hasChildren)

    // Usar fechas EXACTAS del Gantt sin recalcular
    let startDate: string | undefined
    let finishDate: string | undefined
    let durationXml: string | undefined

    if (task.fechaInicio instanceof Date && !isNaN(task.fechaInicio.getTime())) {
      startDate = formatMSProjectDateWithTime(task.fechaInicio, '08:00:00')
    }

    if (task.fechaFin instanceof Date && !isNaN(task.fechaFin.getTime())) {
      finishDate = formatMSProjectDateWithTime(task.fechaFin, '17:00:00')
    }

    // Calcular duración basada en horas estimadas (no en fechas)
    if (task.horasEstimadas && task.horasEstimadas > 0 && !isSummary) {
      durationXml = `PT${Math.round(task.horasEstimadas)}H0M0S`
    } else if (isMilestone) {
      durationXml = 'PT0H0M0S'
    }

    const msTask: MSProjectTask = {
      UID: uid,
      ID: uid,
      Name: task.nombre,
      Type: 0, // Fixed Units
      OutlineLevel: task.nivel + 1, // +1 por la tarea raíz
      OutlineNumber: currentOutlineNumber,
      Start: isSummary ? undefined : startDate,
      Finish: isSummary ? undefined : finishDate,
      Duration: isSummary ? undefined : durationXml,
      PercentComplete: Math.round(task.progreso || 0),
      Notes: task.descripcion || undefined,
      parentId: parentUid,
      hasChildren: isSummary,
      isMilestone: isMilestone,
      ManualStart: (!isSummary && startDate) ? startDate : undefined,
      ManualFinish: (!isSummary && finishDate) ? finishDate : undefined,
      ManualDuration: (!isSummary && durationXml) ? durationXml : undefined
    }

    msProjectTasks.push(msTask)

    // Procesar hijos recursivamente
    if (task.children) {
      task.children.forEach(child => processTask(child, currentOutlineNumber, uid))
    }
  }

  // Procesar todas las tareas raíz (mapeo directo)
  tasks.forEach(task => processTask(task, '1', 1))

  // Debug logging removed for production

  // Agregar TaskLinks para dependencias reales de la base de datos - GYS-XML-09
  const taskLinks: Array<{ predecessorUID: number, successorUID: number, type: number, lag: number }> = []

  // Procesar dependencias reales desde los datos de tareas
  tasks.forEach(task => {
    // Para tareas que tienen dependenciaId (CotizacionTarea o ProyectoTarea)
    if (task.dependenciaId && taskIdMap.has(task.dependenciaId)) {
      const predecessorUID = taskIdMap.get(task.dependenciaId)
      const successorUID = taskIdMap.get(task.id)

      if (predecessorUID && successorUID) {
        taskLinks.push({
          predecessorUID,
          successorUID,
          type: 1, // Finish to Start (predeterminado)
          lag: 0
        })
      }
    }

    // Para ProyectoDependenciaTarea (sistema avanzado de dependencias) - GYS-XML-09
    if (task.dependenciasAvanzadas) {
      task.dependenciasAvanzadas.forEach((dep: ProyectoDependenciaTarea) => {
        if (taskIdMap.has(dep.tareaOrigenId)) {
          const tipoMSProject = {
            'fin_a_inicio': 1,  // FS
            'inicio_a_inicio': 2,   // SS
            'fin_a_fin': 3, // FF
            'inicio_a_fin': 4   // SF
          }[dep.tipo] || 1

          taskLinks.push({
            predecessorUID: taskIdMap.get(dep.tareaOrigenId)!,
            successorUID: taskIdMap.get(task.id)!,
            type: tipoMSProject,
            lag: 0 // MS Project maneja lag en minutos, por defecto 0
          })
        }
      })
    }
  })

  // GYS-XML-EXPORT: Solo incluir dependencias explícitas del Gantt
  // No crear dependencias automáticas - preservar exactamente lo que muestra el Gantt

  // GYS-XML-EXPORT: Generar XML directamente (sin validaciones adicionales)
  const xml = generateMSProjectXML(msProjectTasks, taskLinks, projectName, calendarioLaboral)

  return xml
}

/**
 * Genera excepciones de calendario (feriados, días especiales) - GYS-XML-08
 */
function generarExcepcionesCalendario(calendarioLaboral?: any): string {
  if (!calendarioLaboral?.excepcionesCalendario || calendarioLaboral.excepcionesCalendario.length === 0) {
    return ''
  }

  let xml = ''

  calendarioLaboral.excepcionesCalendario.forEach((excepcion: any) => {
    const fechaInicio = new Date(excepcion.fechaInicio).toISOString().split('T')[0]
    const fechaFin = excepcion.fechaFin
      ? new Date(excepcion.fechaFin).toISOString().split('T')[0]
      : fechaInicio

    xml += `
      <Exception>
        <EnteredByOccurrences>0</EnteredByOccurrences>
        <TimePeriod>
          <FromDate>${fechaInicio}T00:00:00</FromDate>
          <ToDate>${fechaFin}T23:59:59</ToDate>
        </TimePeriod>
        <Occurrences>1</Occurrences>
        <Name>${escapeXml(excepcion.nombre || 'Día especial')}</Name>
        <Type>${excepcion.esLaborable ? 1 : 0}</Type>`

    // Si es día laborable especial, agregar jornada
    if (excepcion.esLaborable && excepcion.horaInicio && excepcion.horaFin) {
      xml += `
        <WorkingTimes>
          <WorkingTime>
            <FromTime>${excepcion.horaInicio}:00</FromTime>
            <ToTime>${excepcion.horaFin}:00</ToTime>
          </WorkingTime>
        </WorkingTimes>`
    }

    xml += `
      </Exception>`
  })

  return xml
}

/**
 * Formatea fecha para MS Project (YYYY-MM-DDTHH:mm:ss)
 */
function formatMSProjectDate(date: Date): string {
  return date.toISOString().replace('Z', '').split('.')[0]
}

/**
 * Formatea fecha con hora específica para MS Project
 */
function formatMSProjectDateWithTime(date: Date, time: string): string {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `${dateStr}T${time}`
}


/**
 * Genera el XML completo de MS Project
 */
function generateMSProjectXML(tasks: MSProjectTask[], taskLinks: Array<{ predecessorUID: number, successorUID: number, type: number, lag: number }>, projectName: string, calendarioLaboral?: any): string {
  const now = formatMSProjectDate(new Date())

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Title>${projectName}</Title>
  <Author>GYS Control System</Author>
  <CreationDate>${now}</CreationDate>
  <LastSaved>${now}</LastSaved>
  <ScheduleFromStart>0</ScheduleFromStart>
  <StartDate>${tasks.length > 0 ? tasks.find(t => t.Start)?.Start || now : now}</StartDate>
  <FinishDate>${tasks.length > 0 ? tasks.find(t => t.Finish)?.Finish || now : now}</FinishDate>
  <FYStartDate>1</FYStartDate>
  <CriticalSlackLimit>0</CriticalSlackLimit>
  <CurrencyDigits>2</CurrencyDigits>
  <CurrencySymbol>$</CurrencySymbol>
  <CurrencyCode>USD</CurrencyCode>
  <CurrencySymbolPosition>1</CurrencySymbolPosition>
  <DefaultCalendarUID>1</DefaultCalendarUID>
  <DefaultStartTime>${calendarioLaboral?.horaInicioManana || '08:00'}:00</DefaultStartTime>
  <DefaultFinishTime>${calendarioLaboral?.horaFinTarde || '17:00'}:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>${calcularMinutosSemanales(calendarioLaboral)}</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <SaveVersion>21</SaveVersion>
  <BuildNumber>16.0.16227.20280</BuildNumber>
  <DefaultTaskType>0</DefaultTaskType>            <!-- Fixed Units -->
  <DefaultFixedCostAccrual>3</DefaultFixedCostAccrual>
  <DefaultStandardRate>10</DefaultStandardRate>
  <DefaultOvertimeRate>15</DefaultOvertimeRate>
  <DurationFormat>21</DurationFormat>             <!-- Days (MS Project native) -->
  <ShowProjectSummaryTask>1</ShowProjectSummaryTask>
  <TaskMode>2</TaskMode>
  <DefaultTaskMode>2</DefaultTaskMode>
  <EditableActualCosts>0</EditableActualCosts>
  <HonorConstraints>1</HonorConstraints>
  <InsertedProjectsLikeSummary>1</InsertedProjectsLikeSummary>
  <MultipleCriticalPaths>0</MultipleCriticalPaths>
  <NewTasksEffortDriven>0</NewTasksEffortDriven>
  <NewTasksEstimated>0</NewTasksEstimated>
  <NewTasksAreManual>0</NewTasksAreManual>
  <SplitsInProgressTasks>1</SplitsInProgressTasks>
  <SpreadActualCost>0</SpreadActualCost>
  <SpreadPercentComplete>0</SpreadPercentComplete>
  <TaskUpdatesResource>1</TaskUpdatesResource>
  <FiscalYearStart>0</FiscalYearStart>
  <WeekStartDay>1</WeekStartDay>
  <ShowTaskScheduleWarnings>0</ShowTaskScheduleWarnings>
  <ShowTaskScheduleSuggestions>0</ShowTaskScheduleSuggestions>
  <MoveCompletedEndsBack>0</MoveCompletedEndsBack>
  <MoveRemainingStartsBack>0</MoveRemainingStartsBack>
  <MoveRemainingStartsForward>0</MoveRemainingStartsForward>
  <MoveCompletedEndsForward>0</MoveCompletedEndsForward>
  <BaselineForEarnedValue>0</BaselineForEarnedValue>
  <AutoAddNewResourcesAndTasks>1</AutoAddNewResourcesAndTasks>
  <CurrentDate>${now}</CurrentDate>
  <MicrosoftProjectServerURL>1</MicrosoftProjectServerURL>
  <Autolink>1</Autolink>
  <NewTaskStartDate>0</NewTaskStartDate>
  <DefaultTaskEVMethod>0</DefaultTaskEVMethod>
  <ProjectExternallyEdited>0</ProjectExternallyEdited>
  <ExtendedCreationDate>${now}</ExtendedCreationDate>
  <ActualsInSync>1</ActualsInSync>
  <RemoveFileProperties>0</RemoveFileProperties>
  <AdminProject>0</AdminProject>
  <UpdateManuallyScheduledTasksWhenEditingLinks>1</UpdateManuallyScheduledTasksWhenEditingLinks>
  <KeepTaskOnNearestWorkingTimeWhenLinkEdit>1</KeepTaskOnNearestWorkingTimeWhenLinkEdit>
  <DefaultCalendarName>${calendarioLaboral?.nombre || 'Calendario Laboral GYS'}</DefaultCalendarName>
  <Calendars>
   <Calendar>
     <UID>1</UID>
     <Name>${calendarioLaboral?.nombre || 'Calendario Laboral GYS'}</Name>
     <IsBaseCalendar>1</IsBaseCalendar>
     <BaseCalendarUID>-1</BaseCalendarUID>
     <WeekDays>
       ${generarDiasCalendarioDinamico(calendarioLaboral)}
     </WeekDays>
     <Exceptions>
       ${generarExcepcionesCalendario(calendarioLaboral)}
     </Exceptions>
   </Calendar>
  </Calendars>
  <Tasks>
`

  // Agregar tareas
  tasks.forEach(task => {
    xml += `    <Task>
      <UID>${task.UID}</UID>
      <ID>${task.ID}</ID>
      <Name>${escapeXml(task.Name)}</Name>
      <Type>${task.Type}</Type>
      <IsNull>0</IsNull>
      <CreateDate>${formatMSProjectDate(new Date())}</CreateDate>
      <WBS>${task.OutlineNumber}</WBS>
      <OutlineNumber>${task.OutlineNumber}</OutlineNumber>
      <OutlineLevel>${task.OutlineLevel}</OutlineLevel>
      <CalendarUID>1</CalendarUID>`
    if (task.parentId) {
      xml += `\n      <ParentTaskUID>${task.parentId}</ParentTaskUID>`
    }
    if (task.Start) {
      xml += `\n      <Start>${task.Start}</Start>`
    }
    if (task.Finish) {
      xml += `\n      <Finish>${task.Finish}</Finish>`
    }
    if (task.Duration) {
      xml += `\n      <Duration>${task.Duration}</Duration>`
    }
    if (task.ManualStart) {
      xml += `\n      <ManualStart>${task.ManualStart}</ManualStart>`
    }
    if (task.ManualFinish) {
      xml += `\n      <ManualFinish>${task.ManualFinish}</ManualFinish>`
    }
    if (task.ManualDuration) {
      xml += `\n      <ManualDuration>${task.ManualDuration}</ManualDuration>`
    }
    xml += `
      <ResumeValid>0</ResumeValid>
      <EffortDriven>0</EffortDriven>
      <Recurring>0</Recurring>
      <OverAllocated>0</OverAllocated>
      <Estimated>0</Estimated>
      <Milestone>${task.isMilestone ? 1 : 0}</Milestone>
      <FixedCostAccrual>3</FixedCostAccrual>
      <PercentComplete>${task.PercentComplete}</PercentComplete>
      <PercentWorkComplete>${task.PercentComplete}</PercentWorkComplete>`
    // TODAS las tareas necesitan configuración Fixed Duration
    xml += `\n      <FixedDuration>1</FixedDuration>`
    xml += `\n      <Estimated>0</Estimated>` // Not estimated
    xml += `\n      <Units>1</Units>` // Explicitly set units to 1.0 for all tasks

    if (task.hasChildren) {
      // TAREAS RESUMEN: Auto-scheduled, sin restricciones específicas - GYS-XML-02
      xml += `\n      <TaskMode>2</TaskMode>` // Auto-scheduled
      xml += `\n      <ConstraintType>2</ConstraintType>` // As Soon As Possible
      xml += `\n      <Manual>0</Manual>`
    } else {
      // TAREAS HOJA: Manually scheduled con Must Start On - GYS-XML-10
      xml += `\n      <Manual>1</Manual>` // Manual mode
      xml += `\n      <TaskMode>1</TaskMode>` // Manually scheduled
      xml += `\n      <ConstraintType>4</ConstraintType>` // Must Start On
      if (task.Start) {
        xml += `\n      <ConstraintDate>${task.Start}</ConstraintDate>`
      }
      xml += `\n      <DurationFormat>21</DurationFormat>` // Days (MS Project native)
      // WorkFormat removed - not needed per GYS-XML-11
    }

    // Agregar campos específicos para tareas summary
    if (task.Summary === 1) {
      xml += `\n      <Summary>1</Summary>`
      xml += `\n      <DisplayAsSummary>1</DisplayAsSummary>`
    }
    xml += `
      <DisplayAsSummary>${task.hasChildren ? 1 : 0}</DisplayAsSummary>
      <Summary>${task.hasChildren ? 1 : 0}</Summary>
      <Critical>0</Critical>
      <IsSubproject>0</IsSubproject>
      <IsExternalTask>0</IsExternalTask>
      <ExternalTaskProject>00000000-0000-0000-0000-000000000000</ExternalTaskProject>
      <StartVariance>0</StartVariance>
      <FinishVariance>0</FinishVariance>
      <WorkVariance>0</WorkVariance>
      <FreeSlack>0</FreeSlack>
      <TotalSlack>0</TotalSlack>
      <StartSlack>0</StartSlack>
      <FinishSlack>0</FinishSlack>
      <CanLevel>1</CanLevel>
      <IgnoreResourceCalendar>0</IgnoreResourceCalendar>
      <ExtendedAttribute>
        <FieldID>188744000</FieldID>
        <Value></Value>
      </ExtendedAttribute>
    </Task>
`
  })

  xml += `  </Tasks>
  <Resources/>
  <Assignments/>
  <TaskLinks>
`

  // Agregar TaskLinks
  taskLinks.forEach(link => {
    xml += `    <TaskLink>
      <PredecessorUID>${link.predecessorUID}</PredecessorUID>
      <SuccessorUID>${link.successorUID}</SuccessorUID>
      <Type>${link.type}</Type>
      <Lag>${link.lag}</Lag>
    </TaskLink>
`
  })

  xml += `  </TaskLinks>
</Project>`

  return xml
}

/**
 * Escapa caracteres especiales para XML
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Descarga archivo XML
 */
export function downloadMSProjectXML(xml: string, filename: string = 'cronograma-gys.xml'): void {
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}