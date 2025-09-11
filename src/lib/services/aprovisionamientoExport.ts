/**
 * 📄 Servicio de Exportación y Reportes - Aprovisionamiento
 * 
 * Funcionalidades:
 * - Exportar Gantt a imagen (PNG/SVG)
 * - Generar reporte PDF ejecutivo
 * - Exportar datos a Excel
 * - Programar reportes automáticos
 * 
 * @author GYS Team
 * @version 2.0.0
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GanttCalculationResult, CoherenciaResult } from './aprovisionamientoCalculos';
import type { ProyectoAprovisionamiento } from '@/types/aprovisionamiento';

// ✅ Types para exportación
export interface ExportOptions {
  formato: 'pdf' | 'excel' | 'csv' | 'png' | 'svg';
  incluirGraficos: boolean;
  incluirDetalles: boolean;
  rangoFechas?: {
    inicio: Date;
    fin: Date;
  };
  filtros?: {
    proyectos?: string[];
    estados?: string[];
    responsables?: string[];
  };
}

export interface ReporteEjecutivo {
  titulo: string;
  fechaGeneracion: Date;
  resumenEjecutivo: {
    totalProyectos: number;
    montoTotalListas: number;
    montoTotalPedidos: number;
    porcentajeEjecucion: number;
    elementosEnRiesgo: number;
  };
  proyectos: ProyectoAprovisionamiento[];
  ganttListas: GanttCalculationResult[];
  ganttPedidos: GanttCalculationResult[];
  alertas: string[];
  recomendaciones: string[];
}

export interface ExcelData {
  hojas: {
    nombre: string;
    datos: any[];
    columnas: string[];
  }[];
  metadatos: {
    titulo: string;
    fechaGeneracion: string;
    usuario: string;
  };
}

/**
 * 📊 Clase principal para exportación y reportes
 */
export class AprovisionamientoExport {
  
  /**
   * 📄 Genera reporte PDF ejecutivo
   */
  static async generarReportePDF(
    datos: ReporteEjecutivo,
    opciones: ExportOptions
  ): Promise<Blob> {
    // 📋 Estructura del reporte PDF
    const contenidoPDF = {
      // 🏢 Header corporativo
      header: {
        logo: '/logo.png',
        titulo: datos.titulo,
        subtitulo: 'Reporte de Aprovisionamiento Financiero',
        fecha: format(datos.fechaGeneracion, 'dd/MM/yyyy HH:mm', { locale: es }),
        confidencial: true
      },
      
      // 📊 Resumen ejecutivo
      resumenEjecutivo: {
        kpis: [
          {
            label: 'Total Proyectos',
            valor: datos.resumenEjecutivo.totalProyectos,
            formato: 'numero'
          },
          {
            label: 'Monto Total Listas',
            valor: datos.resumenEjecutivo.montoTotalListas,
            formato: 'moneda'
          },
          {
            label: 'Monto Total Pedidos',
            valor: datos.resumenEjecutivo.montoTotalPedidos,
            formato: 'moneda'
          },
          {
            label: '% Ejecución',
            valor: datos.resumenEjecutivo.porcentajeEjecucion,
            formato: 'porcentaje'
          }
        ],
        alertas: datos.alertas,
        recomendaciones: datos.recomendaciones.slice(0, 5) // Top 5
      },
      
      // 📈 Gráficos y visualizaciones
      graficos: opciones.incluirGraficos ? {
        ganttListas: await this.generarGanttSVG(datos.ganttListas, 'listas'),
        ganttPedidos: await this.generarGanttSVG(datos.ganttPedidos, 'pedidos'),
        distribucionEstados: this.generarGraficoEstados(datos.proyectos)
      } : null,
      
      // 📋 Detalles por proyecto
      detallesProyectos: opciones.incluirDetalles ? 
        datos.proyectos.map(proyecto => ({
          nombre: proyecto.nombre,
          codigo: proyecto.codigo,
          estado: proyecto.estado,
          montoPresupuestado: proyecto.totalInterno || 0, // Campo correcto del modelo Proyecto
          montoEjecutado: proyecto.totalReal || 0, // Campo correcto del modelo Proyecto
          porcentajeAvance: proyecto.porcentajeEjecucion || 0, // Campo calculado disponible
          fechaInicio: proyecto.fechaInicio,
          fechaFin: proyecto.fechaFin,
          responsables: {
            comercial: proyecto.comercialNombre || 'N/A', // Campo disponible en ProyectoAprovisionamiento
            gestor: proyecto.gestorNombre || 'N/A' // Campo disponible en ProyectoAprovisionamiento
          },
          indicadores: {
            coherencia: proyecto.coherenciaEstado || 'ok', // Campo disponible en ProyectoAprovisionamiento
            riesgo: proyecto.desviacion && Math.abs(proyecto.desviacion) > 10000 ? 'alto' : 'bajo' // Calculado basado en desviación
          }
        })) : [],
      
      // 📅 Cronograma consolidado
      cronograma: {
        fechasCriticas: this.extraerFechasCriticas(datos.ganttListas, datos.ganttPedidos),
        hitos: this.generarHitos(datos.ganttListas, datos.ganttPedidos)
      },
      
      // 📊 Anexos
      anexos: {
        metodologia: 'Cálculos basados en fechas necesarias y tiempos de entrega',
        definiciones: {
          'Lista de Equipos': 'Proyección inicial de costos y fechas de necesidad',
          'Pedido de Equipos': 'Ejecución detallada y prorrateada de las listas',
          'Coherencia': 'Validación que ∑(pedidos) = lista'
        },
        contacto: 'Sistema GYS - Gestión y Servicios'
      }
    };
    
    // 🔧 Generar PDF usando biblioteca (jsPDF o similar)
    return this.compilarPDF(contenidoPDF);
  }
  
  /**
   * 📊 Exporta datos a Excel con múltiples hojas
   */
  static async exportarExcel(
    proyectos: ProyectoAprovisionamiento[],
    ganttListas: GanttCalculationResult[],
    ganttPedidos: GanttCalculationResult[],
    opciones: ExportOptions
  ): Promise<Blob> {
    const excelData: ExcelData = {
      hojas: [
        // 📋 Hoja 1: Resumen de Proyectos
        {
          nombre: 'Resumen Proyectos',
          columnas: [
            'Código', 'Nombre', 'Estado', 'Comercial', 'Gestor',
            'Fecha Inicio', 'Fecha Fin', 'Monto Presupuestado',
            'Monto Ejecutado', '% Avance', 'Coherencia', 'Riesgo'
          ],
          datos: proyectos.map(p => ([
            p.codigo,
            p.nombre,
            p.estado,
            p.comercialNombre || 'N/A', // Campo correcto
            p.gestorNombre || 'N/A', // Campo correcto
            p.fechaInicio ? format(new Date(p.fechaInicio), 'dd/MM/yyyy') : 'N/A',
            p.fechaFin ? format(new Date(p.fechaFin), 'dd/MM/yyyy') : 'N/A',
            p.totalInterno || 0, // Campo correcto del modelo Proyecto
            p.totalReal || 0, // Campo correcto del modelo Proyecto
            `${p.porcentajeEjecucion || 0}%`, // Campo calculado disponible
            p.coherenciaEstado === 'ok' ? 'Coherente' : 'Desviado', // Campo correcto
            p.desviacion && Math.abs(p.desviacion) > 10000 ? 'Alto' : 'Bajo' // Calculado basado en desviación
          ]))
        },
        
        // 📋 Hoja 2: Gantt Listas
        {
          nombre: 'Gantt Listas',
          columnas: [
            'ID', 'Código', 'Fecha Inicio', 'Fecha Fin',
            'Monto', 'Estado', 'Criticidad', 'Días Restantes'
          ],
          datos: ganttListas.map(lista => ([
            lista.id,
            lista.label,
            format(lista.start, 'dd/MM/yyyy'),
            format(lista.end, 'dd/MM/yyyy'),
            lista.amount,
            lista.estado,
            lista.criticidad,
            lista.diasRestantes
          ]))
        },
        
        // 📋 Hoja 3: Gantt Pedidos
        {
          nombre: 'Gantt Pedidos',
          columnas: [
            'ID', 'Código', 'Fecha Inicio', 'Fecha Fin',
            'Monto', 'Estado', 'Criticidad', 'Días Restantes', '% Avance'
          ],
          datos: ganttPedidos.map(pedido => ([
            pedido.id,
            pedido.label,
            format(pedido.start, 'dd/MM/yyyy'),
            format(pedido.end, 'dd/MM/yyyy'),
            pedido.amount,
            pedido.estado,
            pedido.criticidad,
            pedido.diasRestantes,
            `${pedido.porcentajeAvance || 0}%`
          ]))
        },
        
        // 📋 Hoja 4: Análisis de Coherencia
        {
          nombre: 'Análisis Coherencia',
          columnas: [
            'Proyecto', 'Lista ID', 'Monto Lista', 'Monto Pedidos',
            'Desviación', '% Desviación', 'Estado Coherencia'
          ],
          datos: this.generarDatosCoherencia(proyectos, ganttListas, ganttPedidos)
        }
      ],
      
      metadatos: {
        titulo: 'Reporte Aprovisionamiento Financiero',
        fechaGeneracion: format(new Date(), 'dd/MM/yyyy HH:mm'),
        usuario: 'Sistema GYS'
      }
    };
    
    // 🔧 Generar Excel usando biblioteca (xlsx o similar)
    return this.compilarExcel(excelData);
  }
  
  /**
   * 🎨 Genera Gantt en formato SVG
   */
  static async generarGanttSVG(
    datos: GanttCalculationResult[],
    tipo: 'listas' | 'pedidos'
  ): Promise<string> {
    const width = 800;
    const height = Math.max(400, datos.length * 40 + 100);
    const margen = { top: 50, right: 50, bottom: 50, left: 150 };
    
    // 📅 Calcular rango de fechas
    const fechas = datos.flatMap(d => [d.start, d.end]);
    const fechaMin = new Date(Math.min(...fechas.map(f => f.getTime())));
    const fechaMax = new Date(Math.max(...fechas.map(f => f.getTime())));
    
    // 📏 Escalas
    const escalaX = (width - margen.left - margen.right) / 
      (fechaMax.getTime() - fechaMin.getTime());
    const escalaY = (height - margen.top - margen.bottom) / datos.length;
    
    // 🎨 Generar SVG
    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Fondo -->
        <rect width="${width}" height="${height}" fill="#f8fafc"/>
        
        <!-- Título -->
        <text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e40af">
          Cronograma de ${tipo === 'listas' ? 'Listas' : 'Pedidos'} de Equipos
        </text>
        
        <!-- Grilla vertical (meses) -->
    `;
    
    // 📅 Líneas de grilla por mes
    const mesesEnRango = this.generarMesesEnRango(fechaMin, fechaMax);
    mesesEnRango.forEach(fecha => {
      const x = margen.left + (fecha.getTime() - fechaMin.getTime()) * escalaX;
      svg += `
        <line x1="${x}" y1="${margen.top}" x2="${x}" y2="${height - margen.bottom}" 
              stroke="#e2e8f0" stroke-width="1"/>
        <text x="${x}" y="${height - 20}" text-anchor="middle" font-size="10" fill="#64748b">
          ${format(fecha, 'MMM yyyy', { locale: es })}
        </text>
      `;
    });
    
    // 📊 Barras del Gantt
    datos.forEach((elemento, index) => {
      const y = margen.top + index * escalaY + escalaY * 0.1;
      const barHeight = escalaY * 0.8;
      
      const x1 = margen.left + (elemento.start.getTime() - fechaMin.getTime()) * escalaX;
      const x2 = margen.left + (elemento.end.getTime() - fechaMin.getTime()) * escalaX;
      const barWidth = x2 - x1;
      
      // 🎨 Color según criticidad
      const colores = {
        'baja': '#10b981',
        'media': '#f59e0b', 
        'alta': '#ef4444',
        'critica': '#7c2d12'
      };
      const color = colores[elemento.criticidad] || '#6b7280';
      
      // 📊 Barra principal
      svg += `
        <rect x="${x1}" y="${y}" width="${barWidth}" height="${barHeight}" 
              fill="${color}" opacity="0.8" rx="4"/>
        
        <!-- Etiqueta -->
        <text x="${margen.left - 10}" y="${y + barHeight/2 + 4}" 
              text-anchor="end" font-size="11" fill="#374151">
          ${elemento.label}
        </text>
        
        <!-- Monto -->
        <text x="${x1 + barWidth/2}" y="${y + barHeight/2 + 4}" 
              text-anchor="middle" font-size="10" fill="white" font-weight="bold">
          ${this.formatearMontoCorto(elemento.amount)}
        </text>
      `;
      
      // 📊 Indicador de progreso (solo para pedidos)
      if (tipo === 'pedidos' && elemento.porcentajeAvance) {
        const progresoWidth = barWidth * (elemento.porcentajeAvance / 100);
        svg += `
          <rect x="${x1}" y="${y}" width="${progresoWidth}" height="${barHeight}" 
                fill="${color}" opacity="1" rx="4"/>
        `;
      }
    });
    
    // 🏷️ Leyenda
    svg += `
      <!-- Leyenda -->
      <g transform="translate(${width - 200}, ${margen.top})">
        <rect x="0" y="0" width="180" height="120" fill="white" stroke="#e2e8f0" rx="4"/>
        <text x="10" y="20" font-size="12" font-weight="bold" fill="#374151">Criticidad</text>
        
        <circle cx="20" cy="35" r="6" fill="#10b981"/>
        <text x="35" y="40" font-size="10" fill="#374151">Baja</text>
        
        <circle cx="20" cy="55" r="6" fill="#f59e0b"/>
        <text x="35" y="60" font-size="10" fill="#374151">Media</text>
        
        <circle cx="20" cy="75" r="6" fill="#ef4444"/>
        <text x="35" y="80" font-size="10" fill="#374151">Alta</text>
        
        <circle cx="20" cy="95" r="6" fill="#7c2d12"/>
        <text x="35" y="100" font-size="10" fill="#374151">Crítica</text>
      </g>
    `;
    
    svg += '</svg>';
    return svg;
  }
  
  /**
   * 📊 Genera gráfico de distribución de estados
   */
  private static generarGraficoEstados(proyectos: ProyectoAprovisionamiento[]): string {
    const distribucion = proyectos.reduce((acc, proyecto) => {
      acc[proyecto.estado] = (acc[proyecto.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 🎨 Generar gráfico de barras simple en SVG
    const width = 400;
    const height = 300;
    const estados = Object.keys(distribucion);
    const maxValor = Math.max(...Object.values(distribucion));
    
    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#f8fafc"/>
        <text x="${width/2}" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#1e40af">
          Distribución por Estado
        </text>
    `;
    
    estados.forEach((estado, index) => {
      const barWidth = (width - 80) / estados.length - 10;
      const barHeight = (distribucion[estado] / maxValor) * (height - 100);
      const x = 40 + index * (barWidth + 10);
      const y = height - 50 - barHeight;
      
      svg += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
              fill="#3b82f6" opacity="0.8"/>
        <text x="${x + barWidth/2}" y="${height - 30}" text-anchor="middle" 
              font-size="10" fill="#374151">${estado}</text>
        <text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" 
              font-size="12" font-weight="bold" fill="#1e40af">${distribucion[estado]}</text>
      `;
    });
    
    svg += '</svg>';
    return svg;
  }
  
  /**
   * 📅 Extrae fechas críticas del cronograma
   */
  private static extraerFechasCriticas(
    ganttListas: GanttCalculationResult[],
    ganttPedidos: GanttCalculationResult[]
  ): Date[] {
    const fechasCriticas = [...ganttListas, ...ganttPedidos]
      .filter(elemento => elemento.criticidad === 'alta' || elemento.criticidad === 'critica')
      .map(elemento => elemento.end);
    
    return [...new Set(fechasCriticas.map(f => f.getTime()))]
      .map(timestamp => new Date(timestamp))
      .sort((a, b) => a.getTime() - b.getTime());
  }
  
  /**
   * 🎯 Genera hitos importantes
   */
  private static generarHitos(
    ganttListas: GanttCalculationResult[],
    ganttPedidos: GanttCalculationResult[]
  ): { fecha: Date; descripcion: string; tipo: string }[] {
    const hitos: { fecha: Date; descripcion: string; tipo: string }[] = [];
    
    // 🏁 Hito: Primera entrega
    const primeraEntrega = [...ganttListas, ...ganttPedidos]
      .sort((a, b) => a.end.getTime() - b.end.getTime())[0];
    
    if (primeraEntrega) {
      hitos.push({
        fecha: primeraEntrega.end,
        descripcion: `Primera entrega: ${primeraEntrega.label}`,
        tipo: 'inicio'
      });
    }
    
    // 🏁 Hito: Última entrega
    const ultimaEntrega = [...ganttListas, ...ganttPedidos]
      .sort((a, b) => b.end.getTime() - a.end.getTime())[0];
    
    if (ultimaEntrega) {
      hitos.push({
        fecha: ultimaEntrega.end,
        descripcion: `Última entrega: ${ultimaEntrega.label}`,
        tipo: 'fin'
      });
    }
    
    return hitos;
  }
  
  /**
   * 📊 Genera datos de coherencia para Excel
   */
  private static generarDatosCoherencia(
    proyectos: ProyectoAprovisionamiento[],
    ganttListas: GanttCalculationResult[],
    ganttPedidos: GanttCalculationResult[]
  ): any[][] {
    return proyectos.map(proyecto => {
      const listasProyecto = ganttListas.filter(l => l.id.startsWith(proyecto.id));
      const pedidosProyecto = ganttPedidos.filter(p => p.id.startsWith(proyecto.id));
      
      const montoListas = listasProyecto.reduce((sum, l) => sum + l.amount, 0);
      const montoPedidos = pedidosProyecto.reduce((sum, p) => sum + p.amount, 0);
      
      const desviacion = montoPedidos - montoListas;
      const porcentajeDesviacion = montoListas > 0 ? (desviacion / montoListas) * 100 : 0;
      
      return [
        proyecto.nombre,
        listasProyecto.map(l => l.id).join(', '),
        montoListas,
        montoPedidos,
        desviacion,
        `${porcentajeDesviacion.toFixed(2)}%`,
        Math.abs(porcentajeDesviacion) <= 1 ? 'Coherente' : 'Desviado'
      ];
    });
  }
  
  // 🔧 Métodos auxiliares privados
  private static async compilarPDF(contenido: any): Promise<Blob> {
    // Implementación con jsPDF o similar
    // Por ahora retornamos un blob vacío como placeholder
    return new Blob(['PDF content'], { type: 'application/pdf' });
  }
  
  private static async compilarExcel(data: ExcelData): Promise<Blob> {
    // Implementación con xlsx o similar
    // Por ahora retornamos un blob vacío como placeholder
    return new Blob(['Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  
  private static generarMesesEnRango(fechaMin: Date, fechaMax: Date): Date[] {
    const meses: Date[] = [];
    const fecha = new Date(fechaMin.getFullYear(), fechaMin.getMonth(), 1);
    
    while (fecha <= fechaMax) {
      meses.push(new Date(fecha));
      fecha.setMonth(fecha.getMonth() + 1);
    }
    
    return meses;
  }
  
  private static formatearMontoCorto(monto: number): string {
    if (monto >= 1000000) {
      return `${(monto / 1000000).toFixed(1)}M`;
    } else if (monto >= 1000) {
      return `${(monto / 1000).toFixed(1)}K`;
    }
    return monto.toString();
  }
}

// 🔧 Utilidades de exportación
export const ExportUtils = {
  /**
   * 📱 Detecta si es dispositivo móvil para ajustar exportación
   */
  esMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  },
  
  /**
   * 💾 Descarga archivo generado
   */
  descargarArchivo(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  
  /**
   * 📧 Prepara datos para envío por email
   */
  prepararParaEmail(reporte: ReporteEjecutivo): {
    asunto: string;
    cuerpo: string;
    adjuntos: string[];
  } {
    return {
      asunto: `Reporte de Aprovisionamiento - ${format(reporte.fechaGeneracion, 'dd/MM/yyyy')}`,
      cuerpo: `
        Estimado/a,
        
        Adjunto encontrará el reporte de aprovisionamiento financiero correspondiente al ${format(reporte.fechaGeneracion, 'dd/MM/yyyy')}.
        
        Resumen ejecutivo:
        - Total de proyectos: ${reporte.resumenEjecutivo.totalProyectos}
        - Porcentaje de ejecución: ${reporte.resumenEjecutivo.porcentajeEjecucion.toFixed(1)}%
        - Elementos en riesgo: ${reporte.resumenEjecutivo.elementosEnRiesgo}
        
        Saludos cordiales,
        Sistema GYS
      `,
      adjuntos: ['reporte-aprovisionamiento.pdf']
    };
  }
};
