/**
 * 🚀 Servicio de Optimización - Aprovisionamiento
 * 
 * Funcionalidades:
 * - Optimización de cronogramas
 * - Balanceado de cargas de trabajo
 * - Programación de recursos
 * - Algoritmos de scheduling
 * - Detección de cuellos de botella
 * 
 * @author GYS Team
 * @version 2.0.0
 */

import { addDays, differenceInDays, isWeekend, format } from 'date-fns';
import type { GanttCalculationResult } from './aprovisionamientoCalculos';
import type { ProyectoAprovisionamiento } from '@/types/aprovisionamiento';

// ✅ Types para optimización
export interface RecursoDisponible {
  id: string;
  nombre: string;
  tipo: 'comercial' | 'gestor' | 'coordinador' | 'proveedor';
  capacidadMaxima: number; // proyectos simultáneos
  capacidadActual: number;
  especialidades: string[];
  disponibilidad: {
    fechaInicio: Date;
    fechaFin: Date;
    diasNoDisponibles: Date[];
  };
}

export interface OptimizacionResult {
  cronogramaOptimizado: GanttCalculationResult[];
  asignacionRecursos: {
    recursoId: string;
    proyectos: string[];
    cargaTrabajo: number; // 0-100%
    eficiencia: number;
  }[];
  metricas: {
    tiempoTotalReducido: number; // días
    eficienciaGlobal: number; // %
    conflictosResueltos: number;
    costoOptimizacion: number;
  };
  recomendaciones: string[];
  alertas: string[];
}

export interface ConfiguracionOptimizacion {
  objetivos: {
    minimizarTiempo: boolean;
    maximizarEficiencia: boolean;
    balancearCargas: boolean;
    respetarPrioridades: boolean;
  };
  restricciones: {
    fechasLimite: boolean;
    recursosDisponibles: boolean;
    dependencias: boolean;
    presupuesto?: number;
  };
  algoritmo: 'greedy' | 'genetic' | 'simulated_annealing' | 'critical_path';
  iteraciones: number;
}

export interface CuelloBotella {
  tipo: 'recurso' | 'fecha' | 'dependencia' | 'presupuesto';
  descripcion: string;
  impacto: 'bajo' | 'medio' | 'alto' | 'critico';
  proyectosAfectados: string[];
  solucionesPropuestas: string[];
  costoResolucion: number;
}

/**
 * 🧠 Clase principal para optimización de aprovisionamiento
 */
export class AprovisionamientoOptimizacion {
  
  /**
   * 🚀 Optimiza cronograma completo usando algoritmo seleccionado
   */
  static async optimizarCronograma(
    proyectos: ProyectoAprovisionamiento[],
    ganttActual: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    configuracion: ConfiguracionOptimizacion
  ): Promise<OptimizacionResult> {
    
    // 📊 Análisis inicial
    const estadoInicial = this.analizarEstadoActual(ganttActual, recursos);
    
    // 🔍 Detectar cuellos de botella
    const cuellosBottella = this.detectarCuellosBottella(proyectos, ganttActual, recursos);
    
    // 🎯 Aplicar algoritmo de optimización
    let cronogramaOptimizado: GanttCalculationResult[];
    
    switch (configuracion.algoritmo) {
      case 'greedy':
        cronogramaOptimizado = await this.algoritmoGreedy(ganttActual, recursos, configuracion);
        break;
      case 'genetic':
        cronogramaOptimizado = await this.algoritmoGenetico(ganttActual, recursos, configuracion);
        break;
      case 'simulated_annealing':
        cronogramaOptimizado = await this.algoritmoSimulatedAnnealing(ganttActual, recursos, configuracion);
        break;
      case 'critical_path':
        cronogramaOptimizado = await this.algoritmoCriticalPath(ganttActual, recursos, configuracion);
        break;
      default:
        cronogramaOptimizado = ganttActual;
    }
    
    // 📈 Calcular métricas de mejora
    const metricas = this.calcularMetricasOptimizacion(ganttActual, cronogramaOptimizado, recursos);
    
    // 👥 Optimizar asignación de recursos
    const asignacionRecursos = this.optimizarAsignacionRecursos(cronogramaOptimizado, recursos);
    
    // 💡 Generar recomendaciones
    const recomendaciones = this.generarRecomendaciones(cuellosBottella, metricas, configuracion);
    
    // ⚠️ Generar alertas
    const alertas = this.generarAlertas(cronogramaOptimizado, recursos, cuellosBottella);
    
    return {
      cronogramaOptimizado,
      asignacionRecursos,
      metricas,
      recomendaciones,
      alertas
    };
  }
  
  /**
   * 🔍 Detecta cuellos de botella en el sistema
   */
  static detectarCuellosBottella(
    proyectos: ProyectoAprovisionamiento[],
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[]
  ): CuelloBotella[] {
    const cuellos: CuelloBotella[] = [];
    
    // 🔍 Cuello de botella por recursos sobrecargados
    recursos.forEach(recurso => {
      const proyectosAsignados = proyectos.filter(p => 
        p.comercialNombre === recurso.nombre || p.gestorNombre === recurso.nombre
      );
      
      if (proyectosAsignados.length > recurso.capacidadMaxima) {
        cuellos.push({
          tipo: 'recurso',
          descripcion: `${recurso.nombre} tiene ${proyectosAsignados.length} proyectos asignados (máximo: ${recurso.capacidadMaxima})`,
          impacto: proyectosAsignados.length > recurso.capacidadMaxima * 1.5 ? 'critico' : 'alto',
          proyectosAfectados: proyectosAsignados.map(p => p.id),
          solucionesPropuestas: [
            'Reasignar proyectos a otros recursos',
            'Contratar recurso adicional',
            'Extender cronograma de proyectos no críticos'
          ],
          costoResolucion: proyectosAsignados.length * 5000 // Estimado
        });
      }
    });
    
    // 🔍 Cuello de botella por fechas críticas coincidentes
    const fechasCriticas = gantt
      .filter(g => g.criticidad === 'alta' || g.criticidad === 'critica')
      .map(g => g.end.toDateString());
    
    const fechasConflictivas = fechasCriticas.filter((fecha, index) => 
      fechasCriticas.indexOf(fecha) !== index
    );
    
    if (fechasConflictivas.length > 0) {
      cuellos.push({
        tipo: 'fecha',
        descripcion: `${fechasConflictivas.length} fechas críticas coincidentes detectadas`,
        impacto: fechasConflictivas.length > 3 ? 'critico' : 'alto',
        proyectosAfectados: gantt
          .filter(g => fechasConflictivas.includes(g.end.toDateString()))
          .map(g => g.id),
        solucionesPropuestas: [
          'Escalonar entregas críticas',
          'Adelantar proyectos menos críticos',
          'Negociar extensión de fechas límite'
        ],
        costoResolucion: fechasConflictivas.length * 10000
      });
    }
    
    // 🔍 Cuello de botella por dependencias circulares
    const dependenciasCirculares = this.detectarDependenciasCirculares(gantt);
    if (dependenciasCirculares.length > 0) {
      cuellos.push({
        tipo: 'dependencia',
        descripcion: `${dependenciasCirculares.length} dependencias circulares detectadas`,
        impacto: 'critico',
        proyectosAfectados: dependenciasCirculares,
        solucionesPropuestas: [
          'Redefinir dependencias del proyecto',
          'Paralelizar tareas independientes',
          'Crear hitos intermedios'
        ],
        costoResolucion: dependenciasCirculares.length * 15000
      });
    }
    
    return cuellos;
  }
  
  /**
   * 🎯 Algoritmo Greedy para optimización rápida
   */
  private static async algoritmoGreedy(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    config: ConfiguracionOptimizacion
  ): Promise<GanttCalculationResult[]> {
    
    const optimizado = [...gantt];
    
    // 📊 Ordenar por prioridad (criticidad + monto)
    optimizado.sort((a, b) => {
      const prioridadA = this.calcularPrioridad(a);
      const prioridadB = this.calcularPrioridad(b);
      return prioridadB - prioridadA;
    });
    
    // 🔄 Reasignar fechas optimizando recursos
    for (let i = 0; i < optimizado.length; i++) {
      const elemento = optimizado[i];
      
      // 🎯 Buscar la fecha más temprana disponible
      const fechaOptima = this.buscarFechaOptimaDisponible(
        elemento,
        optimizado.slice(0, i),
        recursos
      );
      
      if (fechaOptima && fechaOptima < elemento.start) {
        const duracion = differenceInDays(elemento.end, elemento.start);
        elemento.start = fechaOptima;
        elemento.end = addDays(fechaOptima, duracion);
      }
    }
    
    return optimizado;
  }
  
  /**
   * 🧬 Algoritmo Genético para optimización avanzada
   */
  private static async algoritmoGenetico(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    config: ConfiguracionOptimizacion
  ): Promise<GanttCalculationResult[]> {
    
    const poblacionSize = 50;
    const generaciones = config.iteraciones || 100;
    const tasaMutacion = 0.1;
    const tasaCruce = 0.8;
    
    // 🧬 Generar población inicial
    let poblacion = this.generarPoblacionInicial(gantt, poblacionSize);
    
    for (let gen = 0; gen < generaciones; gen++) {
      // 📊 Evaluar fitness de cada individuo
      const fitness = poblacion.map(individuo => 
        this.calcularFitness(individuo, recursos, config)
      );
      
      // 🏆 Seleccionar mejores individuos
      const seleccionados = this.seleccionTorneo(poblacion, fitness, poblacionSize * tasaCruce);
      
      // 🔄 Cruzar individuos
      const descendencia = this.cruzarIndividuos(seleccionados);
      
      // 🎲 Mutar algunos individuos
      const mutados = this.mutarPoblacion(descendencia, tasaMutacion);
      
      // 🔄 Nueva generación
      poblacion = [...seleccionados, ...mutados].slice(0, poblacionSize);
    }
    
    // 🏆 Retornar el mejor individuo
    const fitnessFinales = poblacion.map(individuo => 
      this.calcularFitness(individuo, recursos, config)
    );
    const mejorIndice = fitnessFinales.indexOf(Math.max(...fitnessFinales));
    
    return poblacion[mejorIndice];
  }
  
  /**
   * 🌡️ Algoritmo Simulated Annealing
   */
  private static async algoritmoSimulatedAnnealing(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    config: ConfiguracionOptimizacion
  ): Promise<GanttCalculationResult[]> {
    
    let solucionActual = [...gantt];
    let mejorSolucion = [...gantt];
    
    let temperatura = 1000;
    const temperaturaMinima = 0.1;
    const factorEnfriamiento = 0.95;
    
    while (temperatura > temperaturaMinima) {
      // 🎲 Generar solución vecina
      const solucionVecina = this.generarSolucionVecina(solucionActual);
      
      // 📊 Calcular diferencia de fitness
      const fitnessActual = this.calcularFitness(solucionActual, recursos, config);
      const fitnessVecina = this.calcularFitness(solucionVecina, recursos, config);
      const deltaFitness = fitnessVecina - fitnessActual;
      
      // 🎯 Decidir si aceptar la nueva solución
      if (deltaFitness > 0 || Math.random() < Math.exp(deltaFitness / temperatura)) {
        solucionActual = solucionVecina;
        
        // 🏆 Actualizar mejor solución
        if (fitnessVecina > this.calcularFitness(mejorSolucion, recursos, config)) {
          mejorSolucion = [...solucionVecina];
        }
      }
      
      // 🌡️ Enfriar temperatura
      temperatura *= factorEnfriamiento;
    }
    
    return mejorSolucion;
  }
  
  /**
   * 🛤️ Algoritmo Critical Path Method (CPM)
   */
  private static async algoritmoCriticalPath(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    config: ConfiguracionOptimizacion
  ): Promise<GanttCalculationResult[]> {
    
    // 🔍 Identificar ruta crítica
    const rutaCritica = this.identificarRutaCritica(gantt);
    
    // 📊 Calcular holguras
    const holguras = this.calcularHolguras(gantt, rutaCritica);
    
    // 🎯 Optimizar elementos no críticos
    const optimizado = gantt.map(elemento => {
      const holgura = holguras[elemento.id] || 0;
      
      if (holgura > 0 && !rutaCritica.includes(elemento.id)) {
        // 📅 Adelantar elementos con holgura para liberar recursos
        const diasAdelantar = Math.min(holgura, 7); // Máximo 1 semana
        elemento.start = addDays(elemento.start, -diasAdelantar);
        elemento.end = addDays(elemento.end, -diasAdelantar);
      }
      
      return elemento;
    });
    
    return optimizado;
  }
  
  /**
   * 👥 Optimiza asignación de recursos
   */
  private static optimizarAsignacionRecursos(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[]
  ): OptimizacionResult['asignacionRecursos'] {
    
    return recursos.map(recurso => {
      // 📊 Calcular proyectos asignados
      const proyectosAsignados = gantt.filter(g => 
        g.id.includes(recurso.nombre.toLowerCase())
      ).map(g => g.id);
      
      // 📈 Calcular carga de trabajo
      const cargaTrabajo = Math.min(
        (proyectosAsignados.length / recurso.capacidadMaxima) * 100,
        100
      );
      
      // ⚡ Calcular eficiencia
      const eficiencia = cargaTrabajo > 0 ? 
        Math.max(0, 100 - Math.abs(cargaTrabajo - 80)) : 0; // Óptimo en 80%
      
      return {
        recursoId: recurso.id,
        proyectos: proyectosAsignados,
        cargaTrabajo,
        eficiencia
      };
    });
  }
  
  /**
   * 📊 Calcula métricas de optimización
   */
  private static calcularMetricasOptimizacion(
    ganttOriginal: GanttCalculationResult[],
    ganttOptimizado: GanttCalculationResult[],
    recursos: RecursoDisponible[]
  ): OptimizacionResult['metricas'] {
    
    // ⏱️ Tiempo total reducido
    const tiempoOriginal = Math.max(...ganttOriginal.map(g => g.end.getTime())) - 
                          Math.min(...ganttOriginal.map(g => g.start.getTime()));
    const tiempoOptimizado = Math.max(...ganttOptimizado.map(g => g.end.getTime())) - 
                            Math.min(...ganttOptimizado.map(g => g.start.getTime()));
    
    const tiempoTotalReducido = Math.max(0, 
      differenceInDays(new Date(tiempoOriginal), new Date(tiempoOptimizado))
    );
    
    // ⚡ Eficiencia global
    const asignacionRecursos = this.optimizarAsignacionRecursos(ganttOptimizado, recursos);
    const eficienciaGlobal = asignacionRecursos.reduce((sum, r) => sum + r.eficiencia, 0) / 
                            asignacionRecursos.length;
    
    // 🔧 Conflictos resueltos
    const conflictosOriginales = this.contarConflictos(ganttOriginal, recursos);
    const conflictosOptimizados = this.contarConflictos(ganttOptimizado, recursos);
    const conflictosResueltos = Math.max(0, conflictosOriginales - conflictosOptimizados);
    
    // 💰 Costo de optimización (estimado)
    const costoOptimizacion = tiempoTotalReducido * 1000 + conflictosResueltos * 500;
    
    return {
      tiempoTotalReducido,
      eficienciaGlobal,
      conflictosResueltos,
      costoOptimizacion
    };
  }
  
  // 🔧 Métodos auxiliares privados
  private static analizarEstadoActual(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[]
  ) {
    return {
      totalElementos: gantt.length,
      elementosCriticos: gantt.filter(g => g.criticidad === 'alta' || g.criticidad === 'critica').length,
      recursosUtilizados: recursos.filter(r => r.capacidadActual > 0).length,
      eficienciaPromedio: recursos.reduce((sum, r) => 
        sum + (r.capacidadActual / r.capacidadMaxima), 0
      ) / recursos.length * 100
    };
  }
  
  private static calcularPrioridad(elemento: GanttCalculationResult): number {
    const criticidadPeso = {
      'baja': 1,
      'media': 2,
      'alta': 3,
      'critica': 4
    };
    
    return (criticidadPeso[elemento.criticidad] || 1) * Math.log(elemento.amount + 1);
  }
  
  private static buscarFechaOptimaDisponible(
    elemento: GanttCalculationResult,
    elementosAnteriores: GanttCalculationResult[],
    recursos: RecursoDisponible[]
  ): Date | null {
    // Implementación simplificada
    const fechaActual = new Date();
    let fechaCandidato = new Date(fechaActual);
    
    // Buscar primera fecha disponible
    for (let dias = 0; dias < 365; dias++) {
      if (!isWeekend(fechaCandidato)) {
        const conflictos = elementosAnteriores.filter(e => 
          fechaCandidato >= e.start && fechaCandidato <= e.end
        );
        
        if (conflictos.length === 0) {
          return fechaCandidato;
        }
      }
      fechaCandidato = addDays(fechaCandidato, 1);
    }
    
    return null;
  }
  
  private static generarPoblacionInicial(
    gantt: GanttCalculationResult[],
    size: number
  ): GanttCalculationResult[][] {
    const poblacion: GanttCalculationResult[][] = [];
    
    for (let i = 0; i < size; i++) {
      const individuo = [...gantt];
      // Aplicar mutaciones aleatorias
      this.mutarIndividuo(individuo, 0.3);
      poblacion.push(individuo);
    }
    
    return poblacion;
  }
  
  private static calcularFitness(
    individuo: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    config: ConfiguracionOptimizacion
  ): number {
    let fitness = 0;
    
    // Factor tiempo
    if (config.objetivos.minimizarTiempo) {
      const tiempoTotal = Math.max(...individuo.map(g => g.end.getTime())) - 
                         Math.min(...individuo.map(g => g.start.getTime()));
      fitness += 1000000 / tiempoTotal; // Menor tiempo = mayor fitness
    }
    
    // Factor eficiencia
    if (config.objetivos.maximizarEficiencia) {
      const asignacion = this.optimizarAsignacionRecursos(individuo, recursos);
      const eficienciaPromedio = asignacion.reduce((sum, r) => sum + r.eficiencia, 0) / asignacion.length;
      fitness += eficienciaPromedio;
    }
    
    // Penalizar conflictos
    const conflictos = this.contarConflictos(individuo, recursos);
    fitness -= conflictos * 50;
    
    return fitness;
  }
  
  private static seleccionTorneo(
    poblacion: GanttCalculationResult[][],
    fitness: number[],
    cantidad: number
  ): GanttCalculationResult[][] {
    const seleccionados: GanttCalculationResult[][] = [];
    
    for (let i = 0; i < cantidad; i++) {
      const candidato1 = Math.floor(Math.random() * poblacion.length);
      const candidato2 = Math.floor(Math.random() * poblacion.length);
      
      if (fitness[candidato1] > fitness[candidato2]) {
        seleccionados.push([...poblacion[candidato1]]);
      } else {
        seleccionados.push([...poblacion[candidato2]]);
      }
    }
    
    return seleccionados;
  }
  
  private static cruzarIndividuos(
    padres: GanttCalculationResult[][]
  ): GanttCalculationResult[][] {
    const descendencia: GanttCalculationResult[][] = [];
    
    for (let i = 0; i < padres.length - 1; i += 2) {
      const padre1 = padres[i];
      const padre2 = padres[i + 1];
      
      // Cruce de un punto
      const puntoCruce = Math.floor(Math.random() * padre1.length);
      
      const hijo1 = [...padre1.slice(0, puntoCruce), ...padre2.slice(puntoCruce)];
      const hijo2 = [...padre2.slice(0, puntoCruce), ...padre1.slice(puntoCruce)];
      
      descendencia.push(hijo1, hijo2);
    }
    
    return descendencia;
  }
  
  private static mutarPoblacion(
    poblacion: GanttCalculationResult[][],
    tasaMutacion: number
  ): GanttCalculationResult[][] {
    return poblacion.map(individuo => {
      if (Math.random() < tasaMutacion) {
        this.mutarIndividuo(individuo, 0.1);
      }
      return individuo;
    });
  }
  
  private static mutarIndividuo(
    individuo: GanttCalculationResult[],
    intensidad: number
  ): void {
    individuo.forEach(elemento => {
      if (Math.random() < intensidad) {
        // Mutar fechas ligeramente
        const variacion = Math.floor((Math.random() - 0.5) * 14); // ±7 días
        elemento.start = addDays(elemento.start, variacion);
        elemento.end = addDays(elemento.end, variacion);
      }
    });
  }
  
  private static generarSolucionVecina(
    solucion: GanttCalculationResult[]
  ): GanttCalculationResult[] {
    const vecina = [...solucion];
    
    // Intercambiar dos elementos aleatorios
    const i = Math.floor(Math.random() * vecina.length);
    const j = Math.floor(Math.random() * vecina.length);
    
    [vecina[i], vecina[j]] = [vecina[j], vecina[i]];
    
    return vecina;
  }
  
  private static identificarRutaCritica(
    gantt: GanttCalculationResult[]
  ): string[] {
    // Implementación simplificada - elementos más críticos
    return gantt
      .filter(g => g.criticidad === 'alta' || g.criticidad === 'critica')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, Math.ceil(gantt.length * 0.3))
      .map(g => g.id);
  }
  
  private static calcularHolguras(
    gantt: GanttCalculationResult[],
    rutaCritica: string[]
  ): Record<string, number> {
    const holguras: Record<string, number> = {};
    
    gantt.forEach(elemento => {
      if (rutaCritica.includes(elemento.id)) {
        holguras[elemento.id] = 0; // Sin holgura en ruta crítica
      } else {
        // Calcular holgura basada en criticidad
        const factorHolgura = {
          'baja': 14,
          'media': 7,
          'alta': 3,
          'critica': 0
        };
        holguras[elemento.id] = factorHolgura[elemento.criticidad] || 7;
      }
    });
    
    return holguras;
  }
  
  private static contarConflictos(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[]
  ): number {
    let conflictos = 0;
    
    // Conflictos de recursos
    recursos.forEach(recurso => {
      const elementosAsignados = gantt.filter(g => 
        g.id.includes(recurso.nombre.toLowerCase())
      );
      
      if (elementosAsignados.length > recurso.capacidadMaxima) {
        conflictos += elementosAsignados.length - recurso.capacidadMaxima;
      }
    });
    
    // Conflictos de fechas
    for (let i = 0; i < gantt.length; i++) {
      for (let j = i + 1; j < gantt.length; j++) {
        const elem1 = gantt[i];
        const elem2 = gantt[j];
        
        // Verificar solapamiento
        if (elem1.start <= elem2.end && elem2.start <= elem1.end) {
          conflictos++;
        }
      }
    }
    
    return conflictos;
  }
  
  private static detectarDependenciasCirculares(
    gantt: GanttCalculationResult[]
  ): string[] {
    // Implementación simplificada
    // En un sistema real, se analizarían las dependencias explícitas
    return [];
  }
  
  private static generarRecomendaciones(
    cuellos: CuelloBotella[],
    metricas: OptimizacionResult['metricas'],
    config: ConfiguracionOptimizacion
  ): string[] {
    const recomendaciones: string[] = [];
    
    if (metricas.eficienciaGlobal < 70) {
      recomendaciones.push('Considerar redistribución de recursos para mejorar eficiencia global');
    }
    
    if (cuellos.filter(c => c.impacto === 'critico').length > 0) {
      recomendaciones.push('Resolver cuellos de botella críticos como prioridad máxima');
    }
    
    if (metricas.conflictosResueltos < cuellos.length * 0.5) {
      recomendaciones.push('Aplicar algoritmo más agresivo para resolver conflictos restantes');
    }
    
    return recomendaciones;
  }
  
  private static generarAlertas(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    cuellos: CuelloBotella[]
  ): string[] {
    const alertas: string[] = [];
    
    // Alertas de recursos críticos
    const recursosCriticos = recursos.filter(r => 
      (r.capacidadActual / r.capacidadMaxima) > 0.9
    );
    
    if (recursosCriticos.length > 0) {
      alertas.push(`${recursosCriticos.length} recursos operando al límite de capacidad`);
    }
    
    // Alertas de fechas próximas
    const elementosProximos = gantt.filter(g => 
      differenceInDays(g.end, new Date()) <= 7 && g.criticidad === 'alta'
    );
    
    if (elementosProximos.length > 0) {
      alertas.push(`${elementosProximos.length} elementos críticos con vencimiento en 7 días`);
    }
    
    // Alertas de cuellos críticos
    const cuellosCtriticos = cuellos.filter(c => c.impacto === 'critico');
    if (cuellosCtriticos.length > 0) {
      alertas.push(`${cuellosCtriticos.length} cuellos de botella críticos requieren atención inmediata`);
    }
    
    return alertas;
  }
}

// 🔧 Utilidades de optimización
export const OptimizacionUtils = {
  /**
   * 📊 Simula diferentes escenarios de optimización
   */
  simularEscenarios(
    gantt: GanttCalculationResult[],
    recursos: RecursoDisponible[],
    escenarios: ConfiguracionOptimizacion[]
  ): Promise<OptimizacionResult[]> {
    return Promise.all(
      escenarios.map(config => 
        AprovisionamientoOptimizacion.optimizarCronograma([], gantt, recursos, config)
      )
    );
  },
  
  /**
   * 📈 Compara resultados de optimización
   */
  compararResultados(
    resultados: OptimizacionResult[]
  ): {
    mejorTiempo: OptimizacionResult;
    mejorEficiencia: OptimizacionResult;
    mejorBalance: OptimizacionResult;
  } {
    return {
      mejorTiempo: resultados.reduce((mejor, actual) => 
        actual.metricas.tiempoTotalReducido > mejor.metricas.tiempoTotalReducido ? actual : mejor
      ),
      mejorEficiencia: resultados.reduce((mejor, actual) => 
        actual.metricas.eficienciaGlobal > mejor.metricas.eficienciaGlobal ? actual : mejor
      ),
      mejorBalance: resultados.reduce((mejor, actual) => {
        const scoreActual = actual.metricas.eficienciaGlobal + actual.metricas.tiempoTotalReducido;
        const scoreMejor = mejor.metricas.eficienciaGlobal + mejor.metricas.tiempoTotalReducido;
        return scoreActual > scoreMejor ? actual : mejor;
      })
    };
  }
};