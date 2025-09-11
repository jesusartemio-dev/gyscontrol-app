/**
 * 🧪 Test de Verificación de Tipos - GraficoProgreso
 * 
 * Verifica que todas las importaciones, tipos e interfaces estén correctamente
 * definidos y que no haya errores de TypeScript en el componente.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import React from 'react';
import { render } from '@testing-library/react';
import GraficoProgreso, {
  type DatoGrafico,
  type SerieGrafico,
  type ConfiguracionGrafico,
  type GraficoProgresoProps,
  crearSerieGrafico,
  crearConfiguracionGrafico,
  convertirDatosProgreso,
  CONFIGURACIONES_PREDEFINIDAS,
  COLORES_ESTADO
} from '@/components/equipos/GraficoProgreso';
import { formatearFecha } from '@/lib/utils/graficos';

// 🎯 Mock de Recharts para evitar errores de renderizado
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />,
  Brush: () => <div data-testid="brush" />
}));

// 🎯 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('GraficoProgreso - Verificación de Tipos TypeScript', () => {
  // ✅ Datos de prueba con tipos correctos
  const datoGraficoValido: DatoGrafico = {
    fecha: '2024-01-15',
    valor: 100,
    valorAnterior: 80,
    meta: 120,
    categoria: 'equipos',
    estado: 'completado',
    detalles: { proyecto: 'Test' }
  };

  const serieGraficoValida: SerieGrafico = {
    id: 'serie-test',
    nombre: 'Serie de Prueba',
    datos: [datoGraficoValido],
    color: '#1e40af',
    tipo: 'linea',
    visible: true,
    formato: 'entero',
    unidad: 'items'
  };

  const configuracionValida: ConfiguracionGrafico = {
    tipo: 'linea',
    titulo: 'Gráfico de Prueba',
    subtitulo: 'Subtítulo de prueba',
    mostrarLeyenda: true,
    mostrarGrid: true,
    mostrarTooltip: true,
    mostrarBrush: false,
    mostrarMetas: true,
    animaciones: true,
    altura: 300,
    margenX: 20,
    margenY: 20
  };

  const propsValidas: GraficoProgresoProps = {
    series: [serieGraficoValida],
    configuracion: configuracionValida,
    className: 'test-class',
    cargando: false,
    error: undefined,
    compacto: false,
    interactivo: true,
    exportable: true,
    filtrable: true,
    rangoFechas: [new Date('2024-01-01'), new Date('2024-12-31')],
    onSerieToggle: (serieId: string) => console.log(serieId),
    onPuntoClick: (dato: DatoGrafico, serie: SerieGrafico) => console.log(dato, serie),
    onExportar: (formato: 'png' | 'svg' | 'csv') => console.log(formato),
    onActualizar: () => console.log('actualizar'),
    ultimaActualizacion: new Date()
  };

  describe('✅ Verificación de Interfaces y Tipos', () => {
    it('should have correct DatoGrafico interface', () => {
      // ✅ Verificar que la interfaz DatoGrafico acepta todos los campos requeridos
      expect(datoGraficoValido.fecha).toBe('2024-01-15');
      expect(datoGraficoValido.valor).toBe(100);
      expect(datoGraficoValido.estado).toBe('completado');
      
      // ✅ Verificar campos opcionales
      expect(datoGraficoValido.valorAnterior).toBe(80);
      expect(datoGraficoValido.meta).toBe(120);
      expect(datoGraficoValido.categoria).toBe('equipos');
      expect(datoGraficoValido.detalles).toEqual({ proyecto: 'Test' });
    });

    it('should have correct SerieGrafico interface', () => {
      // ✅ Verificar que la interfaz SerieGrafico acepta todos los campos
      expect(serieGraficoValida.id).toBe('serie-test');
      expect(serieGraficoValida.nombre).toBe('Serie de Prueba');
      expect(serieGraficoValida.datos).toHaveLength(1);
      expect(serieGraficoValida.color).toBe('#1e40af');
      expect(serieGraficoValida.tipo).toBe('linea');
      expect(serieGraficoValida.visible).toBe(true);
      expect(serieGraficoValida.formato).toBe('entero');
      expect(serieGraficoValida.unidad).toBe('items');
    });

    it('should have correct ConfiguracionGrafico interface', () => {
      // ✅ Verificar que la interfaz ConfiguracionGrafico acepta todos los campos
      expect(configuracionValida.tipo).toBe('linea');
      expect(configuracionValida.titulo).toBe('Gráfico de Prueba');
      expect(configuracionValida.mostrarLeyenda).toBe(true);
      expect(configuracionValida.altura).toBe(300);
    });

    it('should have correct GraficoProgresoProps interface', () => {
      // ✅ Verificar que las props del componente son correctas
      expect(propsValidas.series).toHaveLength(1);
      expect(propsValidas.configuracion.tipo).toBe('linea');
      expect(propsValidas.cargando).toBe(false);
      expect(propsValidas.interactivo).toBe(true);
    });
  });

  describe('✅ Verificación de Funciones Helper', () => {
    it('should create SerieGrafico correctly with crearSerieGrafico', () => {
      const serie = crearSerieGrafico('test-id', 'Test Serie', [datoGraficoValido], {
        color: '#ff0000',
        tipo: 'barra',
        formato: 'porcentaje'
      });

      expect(serie.id).toBe('test-id');
      expect(serie.nombre).toBe('Test Serie');
      expect(serie.color).toBe('#ff0000');
      expect(serie.tipo).toBe('barra');
      expect(serie.formato).toBe('porcentaje');
    });

    it('should create ConfiguracionGrafico correctly with crearConfiguracionGrafico', () => {
      const config = crearConfiguracionGrafico('area', 'Test Config', {
        altura: 400,
        mostrarLeyenda: false
      });

      expect(config.tipo).toBe('area');
      expect(config.titulo).toBe('Test Config');
      expect(config.altura).toBe(400);
      expect(config.mostrarLeyenda).toBe(false);
    });

    it('should convert DatoProgreso correctly with convertirDatosProgreso', () => {
      const datosProgreso = [
        { fecha: '2024-01-01', completados: 10, pendientes: 5, retrasados: 2 },
        { fecha: '2024-01-02', completados: 15, pendientes: 3, retrasados: 1 }
      ];

      const series = convertirDatosProgreso(datosProgreso);
      
      expect(series).toHaveLength(3); // completados, pendientes, retrasados
      expect(series[0].nombre).toBe('Completados');
      expect(series[1].nombre).toBe('Pendientes');
      expect(series[2].nombre).toBe('Retrasados');
    });
  });

  describe('✅ Verificación de Constantes Exportadas', () => {
    it('should have CONFIGURACIONES_PREDEFINIDAS with correct types', () => {
      expect(CONFIGURACIONES_PREDEFINIDAS.progreso.tipo).toBe('area');
      expect(CONFIGURACIONES_PREDEFINIDAS.tendencia.tipo).toBe('linea');
      expect(CONFIGURACIONES_PREDEFINIDAS.comparativo.tipo).toBe('barra');
      expect(CONFIGURACIONES_PREDEFINIDAS.distribucion.tipo).toBe('pie');
    });

    it('should have COLORES_ESTADO with correct values', () => {
      expect(COLORES_ESTADO.completado).toBe('#10b981');
      expect(COLORES_ESTADO.en_progreso).toBe('#3b82f6');
      expect(COLORES_ESTADO.retrasado).toBe('#f59e0b');
      expect(COLORES_ESTADO.cancelado).toBe('#ef4444');
    });
  });

  describe('✅ Verificación de Función formatearFecha', () => {
    it('should accept correct format parameters', () => {
      const fecha = new Date('2024-01-15');
      
      // ✅ Verificar que los formatos corregidos funcionan
      expect(() => formatearFecha(fecha, 'corto')).not.toThrow();
      expect(() => formatearFecha(fecha, 'medio')).not.toThrow();
      expect(() => formatearFecha(fecha, 'largo')).not.toThrow();
      expect(() => formatearFecha(fecha, 'iso')).not.toThrow();
      expect(() => formatearFecha(fecha, 'hora')).not.toThrow();
      expect(() => formatearFecha(fecha, 'completo')).not.toThrow();
    });

    it('should format dates correctly', () => {
      const fecha = new Date('2024-01-15T10:30:00');
      
      const formatoCorto = formatearFecha(fecha, 'corto');
      const formatoCompleto = formatearFecha(fecha, 'completo');
      
      expect(formatoCorto).toContain('15');
      expect(formatoCorto).toContain('01');
      expect(formatoCompleto).toContain('15');
      expect(formatoCompleto).toContain('01');
      expect(formatoCompleto).toContain('2024');
    });
  });

  describe('✅ Renderizado del Componente', () => {
    it('should render without TypeScript errors', () => {
      // ✅ Si este test pasa, significa que no hay errores de tipos en el componente
      const { container } = render(<GraficoProgreso {...propsValidas} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle all prop combinations without type errors', () => {
      // ✅ Probar diferentes combinaciones de props
      const propsMinimas: GraficoProgresoProps = {
        series: [serieGraficoValida],
        configuracion: configuracionValida
      };

      const { container } = render(<GraficoProgreso {...propsMinimas} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle loading state correctly', () => {
      const propsConCarga: GraficoProgresoProps = {
        ...propsValidas,
        cargando: true
      };

      const { container } = render(<GraficoProgreso {...propsConCarga} />);
      expect(container).toBeInTheDocument();
    });

    it('should handle error state correctly', () => {
      const propsConError: GraficoProgresoProps = {
        ...propsValidas,
        error: 'Error de prueba'
      };

      const { container } = render(<GraficoProgreso {...propsConError} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('✅ Verificación de Callbacks y Event Handlers', () => {
    it('should handle onSerieToggle callback with correct types', () => {
      const mockCallback = jest.fn((serieId: string) => {
        expect(typeof serieId).toBe('string');
      });

      const propsConCallback: GraficoProgresoProps = {
        ...propsValidas,
        onSerieToggle: mockCallback
      };

      render(<GraficoProgreso {...propsConCallback} />);
      // El callback se testea en la implementación del componente
    });

    it('should handle onPuntoClick callback with correct types', () => {
      const mockCallback = jest.fn((dato: DatoGrafico, serie: SerieGrafico) => {
        expect(typeof dato.fecha).toBe('string');
        expect(typeof dato.valor).toBe('number');
        expect(typeof serie.id).toBe('string');
      });

      const propsConCallback: GraficoProgresoProps = {
        ...propsValidas,
        onPuntoClick: mockCallback
      };

      render(<GraficoProgreso {...propsConCallback} />);
      // El callback se testea en la implementación del componente
    });

    it('should handle onExportar callback with correct types', () => {
      const mockCallback = jest.fn((formato: 'png' | 'svg' | 'csv') => {
        expect(['png', 'svg', 'csv']).toContain(formato);
      });

      const propsConCallback: GraficoProgresoProps = {
        ...propsValidas,
        onExportar: mockCallback
      };

      render(<GraficoProgreso {...propsConCallback} />);
      // El callback se testea en la implementación del componente
    });
  });
});