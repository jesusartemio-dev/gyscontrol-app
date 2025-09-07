/**
 * 🔔 Servicio de Notificaciones y Alertas - Aprovisionamiento
 * 
 * Funcionalidades:
 * - Sistema de notificaciones en tiempo real
 * - Alertas automáticas por fechas críticas
 * - Notificaciones por email y push
 * - Escalamiento de alertas
 * - Dashboard de notificaciones
 * 
 * @author GYS Team
 * @version 2.0.0
 */

import { format, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GanttCalculationResult, CoherenciaResult } from './aprovisionamientoCalculos';
import type { ProyectoAprovisionamiento } from '@/types/aprovisionamiento';

// ✅ Interfaz extendida para coherencia con información adicional
export interface CoherenciaResultExtended extends CoherenciaResult {
  listaId: string;
  montoLista: number;
  montoPedidos: number;
  pedidosRelacionados: {
    codigo: string;
    monto: number;
  }[];
}

// ✅ Función auxiliar para crear CoherenciaResultExtended
export function crearCoherenciaExtendida(
  coherenciaBase: CoherenciaResult,
  listaId: string,
  montoLista: number,
  montoPedidos: number,
  pedidosRelacionados: { codigo: string; monto: number }[] = []
): CoherenciaResultExtended {
  return {
    ...coherenciaBase,
    listaId,
    montoLista,
    montoPedidos,
    pedidosRelacionados
  };
}

// ✅ Types para notificaciones
export interface Notificacion {
  id: string;
  tipo: 'info' | 'warning' | 'error' | 'success' | 'critical';
  categoria: 'fecha_critica' | 'coherencia' | 'presupuesto' | 'recurso' | 'sistema';
  titulo: string;
  mensaje: string;
  detalles?: string;
  fechaCreacion: Date;
  fechaVencimiento?: Date;
  leida: boolean;
  accionRequerida: boolean;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  destinatarios: string[];
  proyectoId?: string;
  elementoId?: string;
  acciones?: AccionNotificacion[];
  metadatos?: Record<string, any>;
}

export interface AccionNotificacion {
  id: string;
  etiqueta: string;
  tipo: 'link' | 'button' | 'modal' | 'api';
  url?: string;
  callback?: () => void;
  parametros?: Record<string, any>;
}

export interface ConfiguracionAlertas {
  fechasCriticas: {
    habilitado: boolean;
    diasAnticipacion: number[];
    horarios: string[];
    destinatarios: string[];
  };
  coherencia: {
    habilitado: boolean;
    umbralDesviacion: number; // %
    frecuenciaRevision: 'diaria' | 'semanal' | 'mensual';
    destinatarios: string[];
  };
  presupuesto: {
    habilitado: boolean;
    umbrales: number[]; // % de ejecución
    destinatarios: string[];
  };
  recursos: {
    habilitado: boolean;
    umbralSobrecarga: number; // %
    destinatarios: string[];
  };
  escalamiento: {
    habilitado: boolean;
    nivelesEscalamiento: {
      nivel: number;
      tiempoEspera: number; // horas
      destinatarios: string[];
    }[];
  };
}

export interface EstadisticasNotificaciones {
  totalNotificaciones: number;
  notificacionesPendientes: number;
  notificacionesCriticas: number;
  tasaRespuesta: number; // %
  tiempoPromedioRespuesta: number; // horas
  distribucionPorTipo: Record<string, number>;
  tendenciaSemanal: {
    fecha: Date;
    cantidad: number;
  }[];
}

/**
 * 🔔 Clase principal para gestión de notificaciones
 */
export class AprovisionamientoNotificaciones {
  private static notificaciones: Notificacion[] = [];
  private static configuracion: ConfiguracionAlertas = this.getConfiguracionDefault();
  private static suscriptores: ((notificacion: Notificacion) => void)[] = [];
  
  /**
   * 🚨 Genera alertas automáticas basadas en cálculos
   * @param proyectos - Lista de proyectos para analizar
   * @param ganttListas - Resultados de cálculos Gantt para listas
   * @param ganttPedidos - Resultados de cálculos Gantt para pedidos
   * @param coherencia - Resultados de validación de coherencia extendidos
   * @returns Array de notificaciones generadas
   * 
   * @example
   * // Para crear coherencia extendida:
   * const coherenciaExtendida = coherenciaResults.map(resultado => 
   *   crearCoherenciaExtendida(
   *     resultado,
   *     lista.id,
   *     lista.montoTotal,
   *     pedidos.reduce((sum, p) => sum + p.monto, 0),
   *     pedidos.map(p => ({ codigo: p.codigo, monto: p.monto }))
   *   )
   * );
   */
  static async generarAlertasAutomaticas(
    proyectos: ProyectoAprovisionamiento[],
    ganttListas: GanttCalculationResult[],
    ganttPedidos: GanttCalculationResult[],
    coherencia: CoherenciaResultExtended[]
  ): Promise<Notificacion[]> {
    const alertasGeneradas: Notificacion[] = [];
    
    // 📅 Alertas por fechas críticas
    if (this.configuracion.fechasCriticas.habilitado) {
      const alertasFechas = this.generarAlertasFechasCriticas(ganttListas, ganttPedidos);
      alertasGeneradas.push(...alertasFechas);
    }
    
    // 🔍 Alertas por coherencia
    if (this.configuracion.coherencia.habilitado) {
      const alertasCoherencia = this.generarAlertasCoherencia(coherencia);
      alertasGeneradas.push(...alertasCoherencia);
    }
    
    // 💰 Alertas por presupuesto
    if (this.configuracion.presupuesto.habilitado) {
      const alertasPresupuesto = this.generarAlertasPresupuesto(proyectos);
      alertasGeneradas.push(...alertasPresupuesto);
    }
    
    // 👥 Alertas por recursos
    if (this.configuracion.recursos.habilitado) {
      const alertasRecursos = this.generarAlertasRecursos(proyectos);
      alertasGeneradas.push(...alertasRecursos);
    }
    
    // 📊 Alertas del sistema
    const alertasSistema = this.generarAlertasSistema(proyectos, ganttListas, ganttPedidos);
    alertasGeneradas.push(...alertasSistema);
    
    // 💾 Guardar notificaciones
    alertasGeneradas.forEach(alerta => this.agregarNotificacion(alerta));
    
    return alertasGeneradas;
  }
  
  /**
   * 📅 Genera alertas por fechas críticas próximas
   */
  private static generarAlertasFechasCriticas(
    ganttListas: GanttCalculationResult[],
    ganttPedidos: GanttCalculationResult[]
  ): Notificacion[] {
    const alertas: Notificacion[] = [];
    const hoy = new Date();
    const elementosCriticos = [...ganttListas, ...ganttPedidos]
      .filter(elemento => elemento.criticidad === 'alta' || elemento.criticidad === 'critica');
    
    this.configuracion.fechasCriticas.diasAnticipacion.forEach(dias => {
      const fechaLimite = addDays(hoy, dias);
      
      elementosCriticos.forEach(elemento => {
        if (this.esFechaEnRango(elemento.end, fechaLimite, 1)) {
          const diasRestantes = differenceInDays(elemento.end, hoy);
          
          alertas.push({
            id: `fecha_critica_${elemento.id}_${dias}d`,
            tipo: diasRestantes <= 3 ? 'critical' : diasRestantes <= 7 ? 'error' : 'warning',
            categoria: 'fecha_critica',
            titulo: `Fecha crítica próxima: ${elemento.label}`,
            mensaje: `El elemento "${elemento.label}" vence en ${diasRestantes} días (${format(elemento.end, 'dd/MM/yyyy', { locale: es })})`,
            detalles: `
              Elemento: ${elemento.label}
              Monto: ${this.formatearMoneda(elemento.amount)}
              Fecha límite: ${format(elemento.end, 'dd/MM/yyyy HH:mm', { locale: es })}
              Criticidad: ${elemento.criticidad}
              Estado: ${elemento.estado}
            `,
            fechaCreacion: new Date(),
            fechaVencimiento: elemento.end,
            leida: false,
            accionRequerida: true,
            prioridad: diasRestantes <= 3 ? 'critica' : diasRestantes <= 7 ? 'alta' : 'media',
            destinatarios: this.configuracion.fechasCriticas.destinatarios,
            elementoId: elemento.id,
            acciones: [
              {
                id: 'ver_detalle',
                etiqueta: 'Ver Detalle',
                tipo: 'link',
                url: `/finanzas/aprovisionamiento/elemento/${elemento.id}`
              },
              {
                id: 'reprogramar',
                etiqueta: 'Reprogramar',
                tipo: 'modal',
                parametros: { elementoId: elemento.id }
              }
            ],
            metadatos: {
              diasRestantes,
              montoAfectado: elemento.amount,
              criticidadOriginal: elemento.criticidad
            }
          });
        }
      });
    });
    
    return alertas;
  }
  
  /**
   * 🔍 Genera alertas por problemas de coherencia
   */
  private static generarAlertasCoherencia(
    coherencia: CoherenciaResultExtended[]
  ): Notificacion[] {
    const alertas: Notificacion[] = [];
    
    coherencia.forEach(resultado => {
       if (!resultado.esCoherente && 
           Math.abs(resultado.desviacionPorcentaje) > this.configuracion.coherencia.umbralDesviacion) {
         
         alertas.push({
           id: `coherencia_${resultado.listaId}`,
           tipo: Math.abs(resultado.desviacionPorcentaje) > 20 ? 'error' : 'warning',
           categoria: 'coherencia',
           titulo: `Desviación de coherencia detectada`,
           mensaje: `La lista ${resultado.listaId} presenta una desviación del ${resultado.desviacionPorcentaje.toFixed(1)}%`,
           detalles: `
             Lista ID: ${resultado.listaId}
             Monto Lista: ${this.formatearMoneda(resultado.montoLista)}
             Monto Pedidos: ${this.formatearMoneda(resultado.montoPedidos)}
             Desviación: ${this.formatearMoneda(resultado.desviacionMonto)}
             % Desviación: ${resultado.desviacionPorcentaje.toFixed(2)}%
             
             Pedidos relacionados:
             ${resultado.pedidosRelacionados.map(p => `- ${p.codigo}: ${this.formatearMoneda(p.monto)}`).join('\n')}
           `,
           fechaCreacion: new Date(),
           leida: false,
           accionRequerida: true,
           prioridad: Math.abs(resultado.desviacionPorcentaje) > 20 ? 'alta' : 'media',
           destinatarios: this.configuracion.coherencia.destinatarios,
           elementoId: resultado.listaId,
           acciones: [
             {
               id: 'revisar_coherencia',
               etiqueta: 'Revisar Coherencia',
               tipo: 'link',
               url: `/finanzas/aprovisionamiento/coherencia/${resultado.listaId}`
             },
             {
               id: 'ajustar_pedidos',
               etiqueta: 'Ajustar Pedidos',
               tipo: 'modal',
               parametros: { listaId: resultado.listaId }
             }
           ],
           metadatos: {
             desviacion: resultado.desviacionMonto,
             porcentajeDesviacion: resultado.desviacionPorcentaje,
             cantidadPedidos: resultado.pedidosRelacionados.length
           }
         });
       }
     });
    
    return alertas;
  }
  
  /**
   * 💰 Genera alertas por ejecución presupuestaria
   */
  private static generarAlertasPresupuesto(
    proyectos: ProyectoAprovisionamiento[]
  ): Notificacion[] {
    const alertas: Notificacion[] = [];
    
    proyectos.forEach(proyecto => {
      const porcentajeEjecucion = (proyecto.totalReal / proyecto.totalInterno) * 100;
      
      this.configuracion.presupuesto.umbrales.forEach(umbral => {
        if (porcentajeEjecucion >= umbral) {
          const tipoAlerta = porcentajeEjecucion >= 95 ? 'critical' : 
                           porcentajeEjecucion >= 85 ? 'error' : 'warning';
          
          alertas.push({
            id: `presupuesto_${proyecto.id}_${umbral}`,
            tipo: tipoAlerta,
            categoria: 'presupuesto',
            titulo: `Umbral presupuestario alcanzado: ${proyecto.nombre || 'Sin nombre'}`,
            mensaje: `El proyecto "${proyecto.nombre || 'Sin nombre'}" ha ejecutado el ${porcentajeEjecucion.toFixed(1)}% de su presupuesto`,
            detalles: `
              Proyecto: ${proyecto.nombre || 'Sin nombre'} (${proyecto.codigo || 'Sin código'})
              Presupuesto Total: ${this.formatearMoneda(proyecto.totalInterno)}
              Monto Ejecutado: ${this.formatearMoneda(proyecto.totalReal)}
              % Ejecución: ${porcentajeEjecucion.toFixed(2)}%
              Saldo Disponible: ${this.formatearMoneda(proyecto.totalInterno - proyecto.totalReal)}
              
              Responsables:
              - Comercial: ${proyecto.comercialNombre || 'No asignado'}
              - Gestor: ${proyecto.gestorNombre || 'No asignado'}
            `,
            fechaCreacion: new Date(),
            leida: false,
            accionRequerida: porcentajeEjecucion >= 90,
            prioridad: porcentajeEjecucion >= 95 ? 'critica' : 
                      porcentajeEjecucion >= 85 ? 'alta' : 'media',
            destinatarios: this.configuracion.presupuesto.destinatarios,
            proyectoId: proyecto.id,
            acciones: [
              {
                id: 'ver_proyecto',
                etiqueta: 'Ver Proyecto',
                tipo: 'link',
                url: `/finanzas/aprovisionamiento/proyecto/${proyecto.id}`
              },
              {
                id: 'revisar_presupuesto',
                etiqueta: 'Revisar Presupuesto',
                tipo: 'modal',
                parametros: { proyectoId: proyecto.id }
              }
            ],
            metadatos: {
              porcentajeEjecucion,
              montoDisponible: proyecto.totalInterno - proyecto.totalReal,
              umbralAlcanzado: umbral
            }
          });
        }
      });
    });
    
    return alertas;
  }
  
  /**
   * 👥 Genera alertas por sobrecarga de recursos
   */
  private static generarAlertasRecursos(
    proyectos: ProyectoAprovisionamiento[]
  ): Notificacion[] {
    const alertas: Notificacion[] = [];
    
    // Analizar carga por comercial
    const cargaComerciales = this.analizarCargaRecursos(proyectos, 'comercial');
    const cargaGestores = this.analizarCargaRecursos(proyectos, 'gestor');
    
    [...cargaComerciales, ...cargaGestores].forEach(carga => {
      if (carga.porcentajeCarga > this.configuracion.recursos.umbralSobrecarga) {
        alertas.push({
          id: `recurso_sobrecarga_${carga.recurso}`,
          tipo: carga.porcentajeCarga > 120 ? 'critical' : 'warning',
          categoria: 'recurso',
          titulo: `Sobrecarga de recurso: ${carga.recurso}`,
          mensaje: `${carga.recurso} tiene una carga del ${carga.porcentajeCarga.toFixed(1)}% (${carga.proyectosAsignados} proyectos)`,
          detalles: `
            Recurso: ${carga.recurso}
            Tipo: ${carga.tipo}
            Proyectos Asignados: ${carga.proyectosAsignados}
            Capacidad Máxima: ${carga.capacidadMaxima}
            % Carga: ${carga.porcentajeCarga.toFixed(2)}%
            
            Proyectos:
            ${carga.proyectos.map(p => `- ${p.nombre} (${p.estado})`).join('\n')}
          `,
          fechaCreacion: new Date(),
          leida: false,
          accionRequerida: true,
          prioridad: carga.porcentajeCarga > 120 ? 'critica' : 'alta',
          destinatarios: this.configuracion.recursos.destinatarios,
          acciones: [
            {
              id: 'redistribuir',
              etiqueta: 'Redistribuir Proyectos',
              tipo: 'modal',
              parametros: { recurso: carga.recurso, proyectos: carga.proyectos }
            },
            {
              id: 'ver_carga',
              etiqueta: 'Ver Carga Completa',
              tipo: 'link',
              url: `/finanzas/aprovisionamiento/recursos/${carga.recurso}`
            }
          ],
          metadatos: {
            porcentajeCarga: carga.porcentajeCarga,
            proyectosExceso: carga.proyectosAsignados - carga.capacidadMaxima,
            tipoRecurso: carga.tipo
          }
        });
      }
    });
    
    return alertas;
  }
  
  /**
   * 🖥️ Genera alertas del sistema
   */
  private static generarAlertasSistema(
    proyectos: ProyectoAprovisionamiento[],
    ganttListas: GanttCalculationResult[],
    ganttPedidos: GanttCalculationResult[]
  ): Notificacion[] {
    const alertas: Notificacion[] = [];
    
    // 📊 Alerta por rendimiento del sistema
    const totalElementos = ganttListas.length + ganttPedidos.length;
    if (totalElementos > 1000) {
      alertas.push({
        id: 'sistema_rendimiento',
        tipo: 'info',
        categoria: 'sistema',
        titulo: 'Alto volumen de datos detectado',
        mensaje: `El sistema está procesando ${totalElementos} elementos. Considere optimizar filtros.`,
        fechaCreacion: new Date(),
        leida: false,
        accionRequerida: false,
        prioridad: 'baja',
        destinatarios: ['admin@gys.com'],
        metadatos: { totalElementos }
      });
    }
    
    // 📈 Alerta por tendencias
    const proyectosRetrasados = proyectos.filter(p => 
      p.fechaFin && isAfter(new Date(), p.fechaFin) && p.estado !== 'completado'
    );
    
    if (proyectosRetrasados.length > 0) {
      alertas.push({
        id: 'tendencia_retrasos',
        tipo: 'warning',
        categoria: 'sistema',
        titulo: `${proyectosRetrasados.length} proyectos con retraso detectados`,
        mensaje: 'Se han identificado proyectos que superaron su fecha límite',
        detalles: `
          Proyectos retrasados:
          ${proyectosRetrasados.map(p => 
            `- ${p.nombre}: ${differenceInDays(new Date(), p.fechaFin!)} días de retraso`
          ).join('\n')}
        `,
        fechaCreacion: new Date(),
        leida: false,
        accionRequerida: true,
        prioridad: 'media',
        destinatarios: ['gerencia@gys.com'],
        acciones: [
          {
            id: 'revisar_retrasos',
            etiqueta: 'Revisar Retrasos',
            tipo: 'link',
            url: '/finanzas/aprovisionamiento/reportes/retrasos'
          }
        ],
        metadatos: { 
          cantidadRetrasos: proyectosRetrasados.length,
          retrasoPromedio: proyectosRetrasados.reduce((sum, p) => 
            sum + differenceInDays(new Date(), p.fechaFin!), 0
          ) / proyectosRetrasados.length
        }
      });
    }
    
    return alertas;
  }
  
  /**
   * 📧 Envía notificaciones por email
   */
  static async enviarNotificacionEmail(
    notificacion: Notificacion,
    destinatarios?: string[]
  ): Promise<boolean> {
    try {
      const receptores = destinatarios || notificacion.destinatarios;
      
      const emailData = {
        to: receptores,
        subject: `[GYS] ${notificacion.titulo}`,
        html: this.generarTemplateEmail(notificacion),
        priority: this.mapearPrioridadEmail(notificacion.prioridad)
      };
      
      // 📧 Enviar email (implementar con servicio de email)
      console.log('Enviando email:', emailData);
      
      // Simular envío exitoso
      return true;
    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  }
  
  /**
   * 📱 Envía notificación push
   */
  static async enviarNotificacionPush(
    notificacion: Notificacion,
    usuarios?: string[]
  ): Promise<boolean> {
    try {
      const pushData = {
        title: notificacion.titulo,
        body: notificacion.mensaje,
        icon: this.getIconoPorTipo(notificacion.tipo),
        badge: this.getBadgePorCategoria(notificacion.categoria),
        data: {
          notificacionId: notificacion.id,
          categoria: notificacion.categoria,
          acciones: notificacion.acciones
        },
        actions: notificacion.acciones?.slice(0, 2).map(accion => ({
          action: accion.id,
          title: accion.etiqueta
        }))
      };
      
      // 📱 Enviar push (implementar con service worker)
      console.log('Enviando push:', pushData);
      
      return true;
    } catch (error) {
      console.error('Error enviando push:', error);
      return false;
    }
  }
  
  /**
   * 📊 Obtiene estadísticas de notificaciones
   */
  static obtenerEstadisticas(): EstadisticasNotificaciones {
    const ahora = new Date();
    const hace7Dias = addDays(ahora, -7);
    
    const notificacionesRecientes = this.notificaciones.filter(n => 
      n.fechaCreacion >= hace7Dias
    );
    
    return {
      totalNotificaciones: this.notificaciones.length,
      notificacionesPendientes: this.notificaciones.filter(n => !n.leida).length,
      notificacionesCriticas: this.notificaciones.filter(n => n.prioridad === 'critica').length,
      tasaRespuesta: this.calcularTasaRespuesta(),
      tiempoPromedioRespuesta: this.calcularTiempoPromedioRespuesta(),
      distribucionPorTipo: this.calcularDistribucionPorTipo(),
      tendenciaSemanal: this.calcularTendenciaSemanal()
    };
  }
  
  // 🔧 Métodos auxiliares privados
  private static agregarNotificacion(notificacion: Notificacion): void {
    this.notificaciones.push(notificacion);
    
    // 📢 Notificar a suscriptores
    this.suscriptores.forEach(callback => {
      try {
        callback(notificacion);
      } catch (error) {
        console.error('Error en callback de notificación:', error);
      }
    });
  }
  
  private static esFechaEnRango(fecha: Date, fechaReferencia: Date, toleranciaDias: number): boolean {
    const diferencia = Math.abs(differenceInDays(fecha, fechaReferencia));
    return diferencia <= toleranciaDias;
  }
  
  private static analizarCargaRecursos(
    proyectos: ProyectoAprovisionamiento[],
    tipoRecurso: 'comercial' | 'gestor'
  ) {
    const recursos = new Map<string, {
      recurso: string;
      tipo: string;
      proyectos: ProyectoAprovisionamiento[];
      capacidadMaxima: number;
    }>();
    
    proyectos.forEach(proyecto => {
      const nombreRecurso = tipoRecurso === 'comercial' ? proyecto.comercialNombre : proyecto.gestorNombre;
      
      // ✅ Validación de null safety para campos opcionales
      if (!nombreRecurso) {
        return; // Skip proyecto si no tiene recurso asignado
      }
      
      if (!recursos.has(nombreRecurso)) {
        recursos.set(nombreRecurso, {
          recurso: nombreRecurso,
          tipo: tipoRecurso,
          proyectos: [],
          capacidadMaxima: 5 // Capacidad por defecto
        });
      }
      
      recursos.get(nombreRecurso)!.proyectos.push(proyecto);
    });
    
    return Array.from(recursos.values()).map(recurso => ({
      ...recurso,
      proyectosAsignados: recurso.proyectos.length,
      porcentajeCarga: (recurso.proyectos.length / recurso.capacidadMaxima) * 100
    }));
  }
  
  private static generarTemplateEmail(notificacion: Notificacion): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notificacion.titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert { padding: 15px; margin: 10px 0; border-radius: 5px; }
          .alert-critical { background: #fee2e2; border-left: 4px solid #dc2626; }
          .alert-error { background: #fef2f2; border-left: 4px solid #ef4444; }
          .alert-warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
          .alert-info { background: #eff6ff; border-left: 4px solid #3b82f6; }
          .actions { margin: 20px 0; }
          .btn { display: inline-block; padding: 10px 20px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔔 Sistema GYS - Notificación</h1>
        </div>
        
        <div class="content">
          <div class="alert alert-${notificacion.tipo}">
            <h2>${notificacion.titulo}</h2>
            <p><strong>Categoría:</strong> ${notificacion.categoria}</p>
            <p><strong>Prioridad:</strong> ${notificacion.prioridad}</p>
            <p><strong>Fecha:</strong> ${format(notificacion.fechaCreacion, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
          </div>
          
          <h3>Mensaje:</h3>
          <p>${notificacion.mensaje}</p>
          
          ${notificacion.detalles ? `
            <h3>Detalles:</h3>
            <pre style="background: #f8fafc; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${notificacion.detalles}</pre>
          ` : ''}
          
          ${notificacion.acciones && notificacion.acciones.length > 0 ? `
            <div class="actions">
              <h3>Acciones Disponibles:</h3>
              ${notificacion.acciones.map(accion => 
                `<a href="${accion.url || '#'}" class="btn">${accion.etiqueta}</a>`
              ).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Este es un mensaje automático del Sistema GYS - Gestión y Servicios</p>
          <p>No responda a este correo. Para consultas, contacte al administrador del sistema.</p>
        </div>
      </body>
      </html>
    `;
  }
  
  private static mapearPrioridadEmail(prioridad: string): string {
    const mapeo = {
      'critica': 'high',
      'alta': 'high',
      'media': 'normal',
      'baja': 'low'
    };
    return mapeo[prioridad as keyof typeof mapeo] || 'normal';
  }
  
  private static getIconoPorTipo(tipo: string): string {
    const iconos = {
      'critical': '/icons/critical.png',
      'error': '/icons/error.png',
      'warning': '/icons/warning.png',
      'info': '/icons/info.png',
      'success': '/icons/success.png'
    };
    return iconos[tipo as keyof typeof iconos] || '/icons/default.png';
  }
  
  private static getBadgePorCategoria(categoria: string): string {
    const badges = {
      'fecha_critica': '/badges/calendar.png',
      'coherencia': '/badges/coherence.png',
      'presupuesto': '/badges/budget.png',
      'recurso': '/badges/resource.png',
      'sistema': '/badges/system.png'
    };
    return badges[categoria as keyof typeof badges] || '/badges/default.png';
  }
  
  private static calcularTasaRespuesta(): number {
    const notificacionesConAccion = this.notificaciones.filter(n => n.accionRequerida);
    const notificacionesRespondidas = notificacionesConAccion.filter(n => n.leida);
    
    return notificacionesConAccion.length > 0 ? 
      (notificacionesRespondidas.length / notificacionesConAccion.length) * 100 : 0;
  }
  
  private static calcularTiempoPromedioRespuesta(): number {
    const notificacionesRespondidas = this.notificaciones.filter(n => n.leida && n.accionRequerida);
    
    if (notificacionesRespondidas.length === 0) return 0;
    
    const tiempoTotal = notificacionesRespondidas.reduce((sum, n) => {
      // Simular tiempo de respuesta (en un sistema real se guardaría la fecha de lectura)
      return sum + Math.random() * 24; // 0-24 horas
    }, 0);
    
    return tiempoTotal / notificacionesRespondidas.length;
  }
  
  private static calcularDistribucionPorTipo(): Record<string, number> {
    return this.notificaciones.reduce((dist, n) => {
      dist[n.tipo] = (dist[n.tipo] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
  }
  
  private static calcularTendenciaSemanal(): { fecha: Date; cantidad: number }[] {
    const hoy = new Date();
    const tendencia: { fecha: Date; cantidad: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const fecha = addDays(hoy, -i);
      const cantidad = this.notificaciones.filter(n => 
        format(n.fechaCreacion, 'yyyy-MM-dd') === format(fecha, 'yyyy-MM-dd')
      ).length;
      
      tendencia.push({ fecha, cantidad });
    }
    
    return tendencia;
  }
  
  private static formatearMoneda(monto: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(monto);
  }
  
  private static getConfiguracionDefault(): ConfiguracionAlertas {
    return {
      fechasCriticas: {
        habilitado: true,
        diasAnticipacion: [1, 3, 7, 15],
        horarios: ['09:00', '15:00'],
        destinatarios: ['comercial@gys.com', 'gestor@gys.com']
      },
      coherencia: {
        habilitado: true,
        umbralDesviacion: 5, // 5%
        frecuenciaRevision: 'diaria',
        destinatarios: ['finanzas@gys.com']
      },
      presupuesto: {
        habilitado: true,
        umbrales: [75, 85, 95],
        destinatarios: ['gerencia@gys.com', 'finanzas@gys.com']
      },
      recursos: {
        habilitado: true,
        umbralSobrecarga: 100, // 100%
        destinatarios: ['rrhh@gys.com', 'gerencia@gys.com']
      },
      escalamiento: {
        habilitado: true,
        nivelesEscalamiento: [
          { nivel: 1, tiempoEspera: 2, destinatarios: ['supervisor@gys.com'] },
          { nivel: 2, tiempoEspera: 6, destinatarios: ['gerencia@gys.com'] },
          { nivel: 3, tiempoEspera: 24, destinatarios: ['direccion@gys.com'] }
        ]
      }
    };
  }
  
  // 🔧 Métodos públicos para gestión
  static suscribirseANotificaciones(callback: (notificacion: Notificacion) => void): void {
    this.suscriptores.push(callback);
  }
  
  static marcarComoLeida(notificacionId: string): void {
    const notificacion = this.notificaciones.find(n => n.id === notificacionId);
    if (notificacion) {
      notificacion.leida = true;
    }
  }
  
  static obtenerNotificaciones(filtros?: {
    leidas?: boolean;
    categoria?: string;
    prioridad?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Notificacion[] {
    let notificacionesFiltradas = [...this.notificaciones];
    
    if (filtros) {
      if (filtros.leidas !== undefined) {
        notificacionesFiltradas = notificacionesFiltradas.filter(n => n.leida === filtros.leidas);
      }
      if (filtros.categoria) {
        notificacionesFiltradas = notificacionesFiltradas.filter(n => n.categoria === filtros.categoria);
      }
      if (filtros.prioridad) {
        notificacionesFiltradas = notificacionesFiltradas.filter(n => n.prioridad === filtros.prioridad);
      }
      if (filtros.fechaDesde) {
        notificacionesFiltradas = notificacionesFiltradas.filter(n => n.fechaCreacion >= filtros.fechaDesde!);
      }
      if (filtros.fechaHasta) {
        notificacionesFiltradas = notificacionesFiltradas.filter(n => n.fechaCreacion <= filtros.fechaHasta!);
      }
    }
    
    return notificacionesFiltradas.sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());
  }
  
  static actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionAlertas>): void {
    this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
  }
}

// 🔧 Utilidades de notificaciones
export const NotificacionUtils = {
  /**
   * 🎨 Obtiene color por tipo de notificación
   */
  getColorPorTipo(tipo: string): string {
    const colores = {
      'critical': '#dc2626',
      'error': '#ef4444',
      'warning': '#f59e0b',
      'info': '#3b82f6',
      'success': '#10b981'
    };
    return colores[tipo as keyof typeof colores] || '#6b7280';
  },
  
  /**
   * 📊 Formatea tiempo relativo
   */
  formatearTiempoRelativo(fecha: Date): string {
    const ahora = new Date();
    const diferencia = differenceInDays(ahora, fecha);
    
    if (diferencia === 0) return 'Hoy';
    if (diferencia === 1) return 'Ayer';
    if (diferencia < 7) return `Hace ${diferencia} días`;
    if (diferencia < 30) return `Hace ${Math.floor(diferencia / 7)} semanas`;
    return format(fecha, 'dd/MM/yyyy');
  },
  
  /**
   * 🔊 Reproduce sonido de notificación
   */
  reproducirSonido(tipo: string): void {
    if (typeof window !== 'undefined' && 'Audio' in window) {
      const sonidos = {
        'critical': '/sounds/critical.mp3',
        'error': '/sounds/error.mp3',
        'warning': '/sounds/warning.mp3',
        'info': '/sounds/info.mp3',
        'success': '/sounds/success.mp3'
      };
      
      const audio = new Audio(sonidos[tipo as keyof typeof sonidos] || '/sounds/default.mp3');
      audio.volume = 0.5;
      audio.play().catch(console.error);
    }
  }
};