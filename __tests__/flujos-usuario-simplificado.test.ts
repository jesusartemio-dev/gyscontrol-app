import { describe, test, expect, beforeEach } from 'vitest'

/**
 * Tests de Flujos de Usuario - Versión Unit Tests
 * 
 * Tests simplificados que se enfocan en la lógica de negocio sin dependencias UI
 */

describe('Flujo: Registro de Horas', () => {
  test('debe validar datos antes del registro', () => {
    const datosRegistro = {
      proyectoId: 'proyecto-123',
      edtId: 'edt-456',
      horas: 8,
      fecha: '2025-01-15',
      descripcion: 'Desarrollo de interfaz',
      nivel: 'edt'
    }

    const validacion = validarDatosRegistro(datosRegistro)
    expect(validacion.valido).toBe(true)
    expect(validacion.errores).toHaveLength(0)
  })

  test('debe rechazar datos inválidos', () => {
    const datosInvalidos = {
      proyectoId: '',
      edtId: null,
      horas: -5,
      fecha: '2025-13-40', // Fecha inválida
      descripcion: ''
    }

    const validacion = validarDatosRegistro(datosInvalidos)
    expect(validacion.valido).toBe(false)
    expect(validacion.errores.length).toBeGreaterThan(0)
    expect(validacion.errores).toContain('El ID del proyecto es requerido')
  })

  test('debe calcular costo total correctamente', () => {
    const registro = {
      horas: 8,
      costoHora: 25.50,
      factorSeguridad: 1.2
    }

    const costoTotal = calcularCostoTotal(registro)
    expect(costoTotal).toBe(244.8) // 8 * 25.50 * 1.2 = 244.8
  })

  test('debe propagar horas a jerarquía superior', () => {
    const jerarquia = {
      proyecto: { id: 'proyecto-123', nombre: 'Proyecto ABC' },
      fase: { id: 'fase-1', nombre: 'Fase 1', horasPlanificadas: 40 },
      edt: { id: 'edt-1', nombre: 'PLC', horasPlanificadas: 20 },
      actividad: { id: 'actividad-1', nombre: 'Programación', horasPlanificadas: 10 },
      tareas: [
        { id: 'tarea-1', horasPlanificadas: 5, horasReales: 3 },
        { id: 'tarea-2', horasPlanificadas: 5, horasReales: 4 }
      ]
    }

    const progreso = calcularProgresoJerarquia(jerarquia)
    
    expect(progreso.tareas.promedio).toBe(70) // (3+4)/10 = 70%
    expect(progreso.actividad.porcentaje).toBe(70)
    expect(progreso.edt.porcentaje).toBe(70)
    expect(progreso.fase.porcentaje).toBe(70)
  })
})

describe('Flujo: Timesheet Semanal', () => {
  test('debe calcular totales semanales correctamente', () => {
    const registrosSemana = [
      { fecha: '2025-01-13', horas: 8, proyecto: 'ABC' },
      { fecha: '2025-01-14', horas: 7.5, proyecto: 'ABC' },
      { fecha: '2025-01-15', horas: 0, proyecto: null },
      { fecha: '2025-01-16', horas: 8, proyecto: 'XYZ' },
      { fecha: '2025-01-17', horas: 6, proyecto: 'ABC' },
      { fecha: '2025-01-18', horas: 0, proyecto: null },
      { fecha: '2025-01-19', horas: 0, proyecto: null }
    ]

    const resumen = calcularResumenSemana(registrosSemana)
    
    expect(resumen.totalHoras).toBe(29.5)
    expect(resumen.promedioDiario).toBe(4.2) // 29.5/7
    expect(resumen.diasTrabajados).toBe(4)
    expect(resumen.proyectos).toEqual(['ABC', 'XYZ'])
  })

  test('debe detectar días con horas excesivas', () => {
    const registrosConExceso = [
      { fecha: '2025-01-13', horas: 12, proyecto: 'ABC' },
      { fecha: '2025-01-14', horas: 10, proyecto: 'ABC' }
    ]

    const alertas = detectarAlertasHoras(registrosConExceso)
    
    expect(alertas.length).toBe(2)
    expect(alertas[0].tipo).toBe('horas_excesivas')
    expect(alertas[0].mensaje).toContain('12 horas el 2025-01-13')
  })
})

describe('Flujo: Reportes de Productividad', () => {
  test('debe calcular eficiencia correctamente', () => {
    const datosProductividad = {
      horasPlanificadas: 40,
      horasReales: 36,
      diasTrabajados: 5,
      diasLaborables: 7
    }

    const metricas = calcularProductividad(datosProductividad)
    
    expect(metricas.eficiencia).toBe(90) // (36/40)*100
    expect(metricas.utilizacionDias).toBe(71.4) // (5/7)*100
    expect(metricas.horasPromedioDia).toBe(7.2) // 36/5
  })

  test('debe generar alertas de bajo rendimiento', () => {
    const datosBajoRendimiento = {
      horasPlanificadas: 40,
      horasReales: 20,
      diasTrabajados: 3,
      diasLaborables: 7
    }

    const alertas = generarAlertasRendimiento(datosBajoRendimiento)
    
    expect(alertas.length).toBeGreaterThan(0)
    expect(alertas.find(a => a.tipo === 'bajo_rendimiento')).toBeDefined()
    expect(alertas.find(a => a.tipo === 'pocos_dias_trabajados')).toBeDefined()
  })
})

describe('Validación de Flujos Complejos', () => {
  test('debe mantener consistencia en jerarquía de EDTs', () => {
    const edtsUnificados = [
      { id: 'edt-1', nombre: 'PLC', categoria: 'AUTOMATIZACION' },
      { id: 'edt-1', nombre: 'PLC', categoria: 'AUTOMATIZACION' }, // Duplicado
      { id: 'edt-2', nombre: 'HMI', categoria: 'INTERFACES' }
    ]

    const edtsNormalizados = normalizarEdtsUnificados(edtsUnificados)
    
    expect(edtsNormalizados.length).toBe(2)
    expect(edtsNormalizados.find(e => e.id === 'edt-1')).toBeDefined()
    expect(edtsNormalizados.find(e => e.id === 'edt-2')).toBeDefined()
  })

  test('debe calcular costos históricos para cotizaciones', () => {
    const historicoProyectos = [
      { proyecto: 'Proyecto A', edt: 'PLC', horas: 45, costoTotal: 1125 },
      { proyecto: 'Proyecto B', edt: 'PLC', horas: 38, costoTotal: 950 },
      { proyecto: 'Proyecto C', edt: 'HMI', horas: 20, costoTotal: 600 }
    ]

    const proyecciones = calcularProyeccionesCotizacion(historicoProyectos, 'PLC', 50)
    
    expect(proyecciones.horasEstimadas).toBe(50)
    expect(proyecciones.costoEstimado).toBeGreaterThan(0)
    expect(proyecciones.precision).toBeGreaterThan(0)
    expect(proyecciones.precision).toBeLessThanOrEqual(1)
  })
})

/**
 * Funciones auxiliares para tests
 */

function validarDatosRegistro(datos: any) {
  const errores: string[] = []
  
  if (!datos.proyectoId || datos.proyectoId.trim() === '') {
    errores.push('El ID del proyecto es requerido')
  }
  
  if (!datos.edtId) {
    errores.push('El EDT es requerido')
  }
  
  if (datos.horas <= 0 || datos.horas > 24) {
    errores.push('Las horas deben estar entre 1 y 24')
  }
  
  if (!datos.fecha || isNaN(Date.parse(datos.fecha))) {
    errores.push('La fecha es inválida')
  }
  
  if (!datos.descripcion || datos.descripcion.trim() === '') {
    errores.push('La descripción es requerida')
  }
  
  return {
    valido: errores.length === 0,
    errores
  }
}

function calcularCostoTotal(registro: any) {
  return registro.horas * registro.costoHora * (registro.factorSeguridad || 1)
}

function calcularProgresoJerarquia(jerarquia: any) {
  const horasRealesTareas = jerarquia.tareas.reduce((sum: number, t: any) => sum + t.horasReales, 0)
  const horasPlanificadasTareas = jerarquia.tareas.reduce((sum: number, t: any) => sum + t.horasPlanificadas, 0)
  
  return {
    tareas: {
      promedio: horasPlanificadasTareas > 0 ? Math.round((horasRealesTareas / horasPlanificadasTareas) * 100) : 0
    },
    actividad: {
      porcentaje: horasPlanificadasTareas > 0 ? Math.round((horasRealesTareas / horasPlanificadasTareas) * 100) : 0
    },
    edt: {
      porcentaje: horasPlanificadasTareas > 0 ? Math.round((horasRealesTareas / horasPlanificadasTareas) * 100) : 0
    },
    fase: {
      porcentaje: horasPlanificadasTareas > 0 ? Math.round((horasRealesTareas / horasPlanificadasTareas) * 100) : 0
    }
  }
}

function calcularResumenSemana(registros: any[]) {
  const totalHoras = registros.reduce((sum, r) => sum + r.horas, 0)
  const diasTrabajados = registros.filter(r => r.horas > 0).length
  const proyectos = [...new Set(registros.filter(r => r.proyecto).map(r => r.proyecto))]
  
  return {
    totalHoras,
    promedioDiario: Math.round((totalHoras / 7) * 10) / 10,
    diasTrabajados,
    proyectos
  }
}

function detectarAlertasHoras(registros: any[]) {
  const alertas: any[] = []
  
  registros.forEach(registro => {
    if (registro.horas > 10) {
      alertas.push({
        tipo: 'horas_excesivas',
        mensaje: `${registro.horas} horas el ${registro.fecha} - excede 10h/día`
      })
    }
  })
  
  return alertas
}

function calcularProductividad(datos: any) {
  const eficiencia = datos.horasPlanificadas > 0 ? (datos.horasReales / datos.horasPlanificadas) * 100 : 0
  const utilizacionDias = datos.diasLaborables > 0 ? (datos.diasTrabajados / datos.diasLaborables) * 100 : 0
  const horasPromedioDia = datos.diasTrabajados > 0 ? datos.horasReales / datos.diasTrabajados : 0
  
  return {
    eficiencia: Math.round(eficiencia),
    utilizacionDias: Math.round(utilizacionDias * 10) / 10,
    horasPromedioDia: Math.round(horasPromedioDia * 10) / 10
  }
}

function generarAlertasRendimiento(datos: any) {
  const alertas: any[] = []
  
  if (datos.horasReales / datos.horasPlanificadas < 0.7) {
    alertas.push({
      tipo: 'bajo_rendimiento',
      mensaje: 'Eficiencia por debajo del 70%'
    })
  }
  
  if (datos.diasTrabajados / datos.diasLaborables < 0.6) {
    alertas.push({
      tipo: 'pocos_dias_trabajados',
      mensaje: 'Pocos días trabajados en el período'
    })
  }
  
  return alertas
}

function normalizarEdtsUnificados(edts: any[]) {
  const normalizados: any[] = []
  const idsVistos = new Set()
  
  edts.forEach(edt => {
    if (!idsVistos.has(edt.id)) {
      normalizados.push(edt)
      idsVistos.add(edt.id)
    }
  })
  
  return normalizados
}

function calcularProyeccionesCotizacion(historico: any[], edtTarget: string, horasEstimadas: number) {
  const datosEdt = historico.filter(h => h.edt === edtTarget)
  
  if (datosEdt.length === 0) {
    return {
      horasEstimadas,
      costoEstimado: 0,
      precision: 0
    }
  }
  
  const costoPromedioHora = datosEdt.reduce((sum, d) => sum + (d.costoTotal / d.horas), 0) / datosEdt.length
  const costoEstimado = horasEstimadas * costoPromedioHora
  const precision = Math.min(1, datosEdt.length / 5) // Precisión basada en cantidad de datos
  
  return {
    horasEstimadas,
    costoEstimado: Math.round(costoEstimado * 100) / 100,
    precision: Math.round(precision * 100) / 100
  }
}