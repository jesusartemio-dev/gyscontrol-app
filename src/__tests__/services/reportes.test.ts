/**
 * 🧪 Tests para Servicio de Reportes
 * 
 * @description Tests para lógica de negocio de reportes, métricas y análisis
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import {
  generarReportePedidos,
  generarReporteTrazabilidad,
  obtenerMetricasProyecto,
  obtenerMetricasGenerales,
  generarReporteComparativo,
  exportarReportePDF,
  obtenerDashboardData
} from '@/lib/services/reportes';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { EstadoPedido } from '@/types/modelos';
import type { FiltrosReporte, MetricasProyecto } from '@/types/payloads';

// 🔧 Mocks
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pedidoEquipo: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    pedidoEquipoItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn()
    },
    trazabilidadEvento: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    proyecto: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    entrega: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    }
  }
}));
jest.mock('@/lib/logger');
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}));

const mockPrismaPedido = prisma.pedidoEquipo as jest.Mocked<typeof prisma.pedidoEquipo>;
const mockPrismaItem = prisma.pedidoEquipoItem as jest.Mocked<typeof prisma.pedidoEquipoItem>;
const mockPrismaTrazabilidad = prisma.trazabilidadEvento as jest.Mocked<typeof prisma.trazabilidadEvento>;
const mockPrismaProyecto = prisma.proyecto as jest.Mocked<typeof prisma.proyecto>;
const mockPrismaEntrega = prisma.entrega as jest.Mocked<typeof prisma.entrega>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Servicio de Reportes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ Test generarReportePedidos
  describe('generarReportePedidos', () => {
    it('debe generar reporte completo de pedidos', async () => {
      const filtros: FiltrosReporte = {
        fechaDesde: new Date('2025-01-01'),
        fechaHasta: new Date('2025-01-31'),
        proyectoId: 'proyecto-1'
      };

      const mockPedidos = [
        {
          id: 'pedido-1',
          numero: 'P-001',
          fechaSolicitud: new Date('2025-01-15'),
          estado: EstadoPedido.aprobado,
          proyecto: {
            nombre: 'Proyecto Alpha',
            codigo: 'ALPHA'
          },
          items: [
            {
              id: 'item-1',
              cantidad: 10,
              cantidadAtendida: 8,
              estadoEntrega: 'entregado',
              catalogoEquipo: {
                nombre: 'Equipo A',
                codigo: 'EQ-001',
                categoria: 'Herramientas'
              }
            }
          ],
          usuario: {
            nombre: 'Juan Pérez',
            email: 'juan@example.com'
          }
        }
      ];

      const mockMetricas = {
        _count: { id: 1 },
        _sum: { 
          items: { cantidad: 10, cantidadAtendida: 8 }
        }
      };

      mockPrismaPedido.findMany.mockResolvedValue(mockPedidos as any);
      mockPrismaPedido.count.mockResolvedValue(1);
      mockPrismaItem.aggregate.mockResolvedValue(mockMetricas as any);

      const resultado = await generarReportePedidos(filtros);

      expect(resultado.pedidos).toHaveLength(1);
      expect(resultado.resumen).toMatchObject({
        totalPedidos: 1,
        totalItems: 10,
        itemsAtendidos: 8,
        porcentajeCompletado: 80,
        pedidosPorEstado: expect.any(Object)
      });
      expect(resultado.pedidos[0]).toMatchObject({
        id: 'pedido-1',
        numero: 'P-001',
        estado: EstadoPedido.aprobado,
        proyecto: {
          nombre: 'Proyecto Alpha'
        }
      });
    });

    it('debe filtrar pedidos por estado', async () => {
      const filtros: FiltrosReporte = {
        estado: EstadoPedido.pendiente
      };

      mockPrismaPedido.findMany.mockResolvedValue([]);
      mockPrismaPedido.count.mockResolvedValue(0);
      mockPrismaItem.aggregate.mockResolvedValue({ _sum: { cantidad: 0, cantidadAtendida: 0 } } as any);

      await generarReportePedidos(filtros);

      expect(mockPrismaPedido.findMany).toHaveBeenCalledWith({
        where: {
          estado: EstadoPedido.pendiente
        },
        include: expect.any(Object),
        orderBy: { fechaSolicitud: 'desc' }
      });
    });

    it('debe agrupar pedidos por categoría de equipo', async () => {
      const filtros: FiltrosReporte = {
        agruparPor: 'categoria'
      };

      const mockAgrupacion = [
        {
          categoria: 'Herramientas',
          _count: { id: 5 },
          _sum: { cantidad: 25, cantidadAtendida: 20 }
        },
        {
          categoria: 'Maquinaria',
          _count: { id: 3 },
          _sum: { cantidad: 15, cantidadAtendida: 12 }
        }
      ];

      mockPrismaPedido.findMany.mockResolvedValue([]);
      mockPrismaItem.groupBy.mockResolvedValue(mockAgrupacion as any);

      const resultado = await generarReportePedidos(filtros);

      expect(resultado.agrupacion).toHaveLength(2);
      expect(resultado.agrupacion[0]).toMatchObject({
        categoria: 'Herramientas',
        totalPedidos: 5,
        totalItems: 25,
        itemsAtendidos: 20,
        porcentajeCompletado: 80
      });
    });

    it('debe calcular tendencias temporales', async () => {
      const filtros: FiltrosReporte = {
        fechaDesde: new Date('2025-01-01'),
        fechaHasta: new Date('2025-01-31'),
        incluirTendencias: true
      };

      const mockTendencias = [
        {
          fecha: new Date('2025-01-15'),
          _count: { id: 3 },
          _sum: { cantidad: 15 }
        },
        {
          fecha: new Date('2025-01-20'),
          _count: { id: 5 },
          _sum: { cantidad: 25 }
        }
      ];

      mockPrismaPedido.findMany.mockResolvedValue([]);
      mockPrismaPedido.groupBy.mockResolvedValue(mockTendencias as any);

      const resultado = await generarReportePedidos(filtros);

      expect(resultado.tendencias).toHaveLength(2);
      expect(resultado.tendencias[0]).toMatchObject({
        fecha: '2025-01-15',
        pedidos: 3,
        items: 15
      });
    });

    it('debe manejar errores de base de datos', async () => {
      mockPrismaPedido.findMany.mockRejectedValue(new Error('Database error'));

      await expect(generarReportePedidos({})).rejects.toThrow('Error al generar reporte de pedidos');
      expect(mockLogger.error).toHaveBeenCalledWith('Error al generar reporte de pedidos', expect.any(Error));
    });
  });

  // ✅ Test generarReporteTrazabilidad
  describe('generarReporteTrazabilidad', () => {
    it('debe generar timeline de eventos', async () => {
      const filtros: FiltrosReporte = {
        tipo: 'timeline',
        proyectoId: 'proyecto-1'
      };

      const mockEventos = [
        {
          id: 'evento-1',
          fechaRegistro: new Date('2025-01-15T10:00:00Z'),
          estadoAnterior: 'pendiente',
        estadoNuevo: 'en_proceso',
          observaciones: 'Iniciando preparación',
          pedidoEquipoItem: {
            catalogoEquipo: { nombre: 'Equipo A', codigo: 'EQ-001' },
            pedidoEquipo: {
              numero: 'P-001',
              proyecto: { nombre: 'Proyecto Alpha' }
            }
          },
          usuario: { nombre: 'Juan Pérez' }
        }
      ];

      mockPrismaTrazabilidad.findMany.mockResolvedValue(mockEventos as any);
      mockPrismaTrazabilidad.count.mockResolvedValue(1);

      const resultado = await generarReporteTrazabilidad(filtros);

      expect(resultado.timeline).toHaveLength(1);
      expect(resultado.timeline[0]).toMatchObject({
        id: 'evento-1',
        fecha: expect.any(Date),
        estadoAnterior: 'pendiente',
        estadoNuevo: 'en_proceso',
        equipo: {
          nombre: 'Equipo A',
          codigo: 'EQ-001'
        },
        proyecto: 'Proyecto Alpha',
        usuario: 'Juan Pérez'
      });
    });

    it('debe analizar retrasos por proyecto', async () => {
      const filtros: FiltrosReporte = {
        tipo: 'retrasos',
        incluirMetricas: true
      };

      const mockItemsRetrasados = [
        {
          id: 'item-1',
          fechaEntregaEstimada: new Date('2025-01-10'),
          fechaEntregaReal: new Date('2025-01-15'), // 5 días de retraso
          estadoEntrega: 'entregado',
          catalogoEquipo: { nombre: 'Equipo A', codigo: 'EQ-001' },
          pedidoEquipo: {
            numero: 'P-001',
            proyecto: { nombre: 'Proyecto Alpha' }
          }
        },
        {
          id: 'item-2',
          fechaEntregaEstimada: new Date('2025-01-12'),
          fechaEntregaReal: null, // Pendiente con retraso
          estadoEntrega: 'retrasado',
          catalogoEquipo: { nombre: 'Equipo B', codigo: 'EQ-002' },
          pedidoEquipo: {
            numero: 'P-002',
            proyecto: { nombre: 'Proyecto Beta' }
          }
        }
      ];

      mockPrismaItem.findMany.mockResolvedValue(mockItemsRetrasados as any);

      const resultado = await generarReporteTrazabilidad(filtros);

      expect(resultado.retrasos).toHaveLength(2);
      expect(resultado.metricas).toMatchObject({
        totalItemsConRetraso: 2,
        promedioRetraso: expect.any(Number),
        retrasoMaximo: expect.any(Number),
        itemsPendientesConRetraso: 1,
        itemsEntregadosConRetraso: 1
      });
    });

    it('debe generar comparativa entre proyectos', async () => {
      const filtros: FiltrosReporte = {
        tipo: 'comparativa',
        proyectos: ['proyecto-1', 'proyecto-2']
      };

      const mockComparativa = [
        {
          proyectoId: 'proyecto-1',
          _count: { id: 100 },
          _sum: { cantidad: 500, cantidadAtendida: 450 },
          proyecto: {
            nombre: 'Proyecto Alpha',
            codigo: 'ALPHA'
          }
        },
        {
          proyectoId: 'proyecto-2',
          _count: { id: 75 },
          _sum: { cantidad: 300, cantidadAtendida: 280 },
          proyecto: {
            nombre: 'Proyecto Beta',
            codigo: 'BETA'
          }
        }
      ];

      mockPrismaItem.groupBy.mockResolvedValue(mockComparativa as any);

      const resultado = await generarReporteTrazabilidad(filtros);

      expect(resultado.comparativa).toHaveLength(2);
      expect(resultado.comparativa[0]).toMatchObject({
        proyecto: {
          nombre: 'Proyecto Alpha',
          codigo: 'ALPHA'
        },
        metricas: {
          totalItems: 100,
          totalCantidad: 500,
          cantidadAtendida: 450,
          porcentajeCompletado: 90
        }
      });
    });
  });

  // ✅ Test obtenerMetricasProyecto
  describe('obtenerMetricasProyecto', () => {
    it('debe calcular métricas completas del proyecto', async () => {
      const proyectoId = 'proyecto-1';
      
      const mockProyecto = {
        id: proyectoId,
        nombre: 'Proyecto Alpha',
        fechaInicio: new Date('2025-01-01'),
        fechaFinEstimada: new Date('2025-06-30')
      };

      const mockPedidos = [
        { id: 'pedido-1', estado: EstadoPedido.aprobado },
        { id: 'pedido-2', estado: EstadoPedido.pendiente }
      ];

      const mockItems = [
        {
          cantidad: 10,
          cantidadAtendida: 8,
          estadoEntrega: 'entregado',
          fechaEntregaEstimada: new Date('2025-01-15'),
          fechaEntregaReal: new Date('2025-01-12')
        },
        {
          cantidad: 5,
          cantidadAtendida: 3,
          estadoEntrega: 'pendiente',
          fechaEntregaEstimada: new Date('2025-01-20'),
          fechaEntregaReal: null
        }
      ];

      const mockEntregas = [
        { id: 'entrega-1', estado: 'completada' },
        { id: 'entrega-2', estado: 'pendiente' }
      ];

      mockPrismaProyecto.findUnique.mockResolvedValue(mockProyecto as any);
      mockPrismaPedido.findMany.mockResolvedValue(mockPedidos as any);
      mockPrismaItem.findMany.mockResolvedValue(mockItems as any);
      mockPrismaEntrega.findMany.mockResolvedValue(mockEntregas as any);

      const resultado = await obtenerMetricasProyecto(proyectoId);

      expect(resultado).toMatchObject({
        proyecto: {
          nombre: 'Proyecto Alpha'
        },
        pedidos: {
          total: 2,
          aprobados: 1,
          pendientes: 1,
          porcentajeAprobacion: 50
        },
        items: {
          total: 15,
          atendidos: 11,
          porcentajeCompletado: expect.closeTo(73.33, 1),
          itemsAdelantados: 1,
          itemsRetrasados: 0,
          itemsPuntuales: 0
        },
        entregas: {
          total: 2,
          completadas: 1,
          pendientes: 1,
          porcentajeCompletado: 50
        },
        tiempos: {
          diasTranscurridos: expect.any(Number),
          diasRestantes: expect.any(Number),
          porcentajeAvance: expect.any(Number)
        }
      });
    });

    it('debe manejar proyecto inexistente', async () => {
      mockPrismaProyecto.findUnique.mockResolvedValue(null);

      await expect(obtenerMetricasProyecto('proyecto-inexistente'))
        .rejects.toThrow('Proyecto no encontrado');
    });
  });

  // ✅ Test obtenerMetricasGenerales
  describe('obtenerMetricasGenerales', () => {
    it('debe calcular métricas del sistema completo', async () => {
      const mockContadores = {
        proyectos: 5,
        pedidos: 25,
        items: 150,
        entregas: 20
      };

      const mockEstadisticas = {
        pedidosPorEstado: [
          { estado: EstadoPedido.aprobado, _count: { id: 15 } },
          { estado: EstadoPedido.pendiente, _count: { id: 10 } }
        ],
        itemsPorEstado: [
          { estadoEntrega: 'entregado', _count: { id: 100 } },
        { estadoEntrega: 'pendiente', _count: { id: 50 } }
        ]
      };

      mockPrismaProyecto.count.mockResolvedValue(mockContadores.proyectos);
      mockPrismaPedido.count.mockResolvedValue(mockContadores.pedidos);
      mockPrismaItem.count.mockResolvedValue(mockContadores.items);
      mockPrismaEntrega.count.mockResolvedValue(mockContadores.entregas);
      mockPrismaPedido.groupBy.mockResolvedValue(mockEstadisticas.pedidosPorEstado as any);
      mockPrismaItem.groupBy.mockResolvedValue(mockEstadisticas.itemsPorEstado as any);

      const resultado = await obtenerMetricasGenerales();

      expect(resultado).toMatchObject({
        resumen: {
          totalProyectos: 5,
          totalPedidos: 25,
          totalItems: 150,
          totalEntregas: 20
        },
        pedidos: {
          porEstado: expect.any(Object),
          porcentajeAprobacion: 60 // 15/25
        },
        items: {
          porEstado: expect.any(Object),
          porcentajeCompletado: expect.closeTo(66.67, 1) // 100/150
        },
        rendimiento: {
          eficienciaEntregas: expect.any(Number),
          tiempoPromedioEntrega: expect.any(Number)
        }
      });
    });
  });

  // ✅ Test generarReporteComparativo
  describe('generarReporteComparativo', () => {
    it('debe comparar múltiples proyectos', async () => {
      const proyectos = ['proyecto-1', 'proyecto-2'];
      const periodo = {
        fechaDesde: new Date('2025-01-01'),
        fechaHasta: new Date('2025-01-31')
      };

      const mockDatosComparativos = [
        {
          proyectoId: 'proyecto-1',
          proyecto: { nombre: 'Proyecto Alpha', codigo: 'ALPHA' },
          _count: { id: 50 },
          _sum: { cantidad: 250, cantidadAtendida: 200 },
          _avg: { diasEntrega: 5.2 }
        },
        {
          proyectoId: 'proyecto-2',
          proyecto: { nombre: 'Proyecto Beta', codigo: 'BETA' },
          _count: { id: 30 },
          _sum: { cantidad: 150, cantidadAtendida: 140 },
          _avg: { diasEntrega: 3.8 }
        }
      ];

      mockPrismaItem.groupBy.mockResolvedValue(mockDatosComparativos as any);

      const resultado = await generarReporteComparativo(proyectos, periodo);

      expect(resultado.comparativa).toHaveLength(2);
      expect(resultado.comparativa[0]).toMatchObject({
        proyecto: {
          nombre: 'Proyecto Alpha',
          codigo: 'ALPHA'
        },
        metricas: {
          totalItems: 50,
          totalCantidad: 250,
          cantidadAtendida: 200,
          porcentajeCompletado: 80,
          tiempoPromedioEntrega: 5.2
        }
      });
      expect(resultado.ranking).toMatchObject({
        mejorRendimiento: 'proyecto-2', // Mayor % completado
        mayorVolumen: 'proyecto-1', // Mayor cantidad total
        menorTiempoEntrega: 'proyecto-2' // Menor tiempo promedio
      });
    });
  });

  // ✅ Test exportarReportePDF
  describe('exportarReportePDF', () => {
    it('debe generar PDF con datos del reporte', async () => {
      const datosReporte = {
        titulo: 'Reporte de Pedidos',
        periodo: '2025-01-01 a 2025-01-31',
        resumen: {
          totalPedidos: 10,
          totalItems: 50
        },
        pedidos: [
          {
            numero: 'P-001',
            proyecto: 'Proyecto Alpha',
            estado: EstadoPedido.aprobado
          }
        ]
      };

      const resultado = await exportarReportePDF(datosReporte);

      expect(resultado).toBeInstanceOf(Buffer);
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('debe incluir branding corporativo en PDF', async () => {
      const datosReporte = {
        titulo: 'Reporte Corporativo',
        empresa: 'GYS Company',
        logo: '/assets/logo.png'
      };

      const resultado = await exportarReportePDF(datosReporte);

      expect(resultado).toBeInstanceOf(Buffer);
      // Verificar que el PDF se generó correctamente
      expect(resultado.length).toBeGreaterThan(100);
    });
  });

  // ✅ Test obtenerDashboardData
  describe('obtenerDashboardData', () => {
    it('debe obtener datos completos para dashboard', async () => {
      const mockDashboardData = {
        metricas: {
          totalProyectos: 5,
          pedidosActivos: 15,
          itemsPendientes: 75,
          entregasHoy: 3
        },
        alertas: [
          {
            tipo: 'retraso',
            mensaje: '5 items con retraso',
            prioridad: 'alta'
          }
        ],
        actividad: [
          {
            fecha: new Date(),
            evento: 'Nuevo pedido creado',
            usuario: 'Juan Pérez'
          }
        ],
        graficos: {
          pedidosPorMes: [],
          itemsPorEstado: [],
          rendimientoPorProyecto: []
        }
      };

      // Mock de múltiples consultas para dashboard
      mockPrismaProyecto.count.mockResolvedValue(5);
      mockPrismaPedido.count.mockResolvedValue(15);
      mockPrismaItem.count.mockResolvedValue(75);
      mockPrismaEntrega.count.mockResolvedValue(3);
      mockPrismaTrazabilidad.findMany.mockResolvedValue([]);
      mockPrismaItem.groupBy.mockResolvedValue([]);

      const resultado = await obtenerDashboardData();

      expect(resultado).toMatchObject({
        metricas: expect.objectContaining({
          totalProyectos: expect.any(Number),
          pedidosActivos: expect.any(Number),
          itemsPendientes: expect.any(Number)
        }),
        alertas: expect.any(Array),
        actividad: expect.any(Array),
        graficos: expect.any(Object)
      });
    });

    it('debe identificar alertas críticas', async () => {
      const mockItemsRetrasados = [
        {
          id: 'item-1',
          fechaEntregaEstimada: new Date('2025-01-10'),
          estadoEntrega: 'retrasado',
          catalogoEquipo: { nombre: 'Equipo Crítico' },
          pedidoEquipo: { proyecto: { nombre: 'Proyecto Urgente' } }
        }
      ];

      mockPrismaItem.findMany.mockResolvedValue(mockItemsRetrasados as any);
      mockPrismaProyecto.count.mockResolvedValue(0);
      mockPrismaPedido.count.mockResolvedValue(0);
      mockPrismaEntrega.count.mockResolvedValue(0);
      mockPrismaTrazabilidad.findMany.mockResolvedValue([]);
      mockPrismaItem.groupBy.mockResolvedValue([]);

      const resultado = await obtenerDashboardData();

      expect(resultado.alertas).toContainEqual(
        expect.objectContaining({
          tipo: 'retraso',
          prioridad: 'alta',
          mensaje: expect.stringContaining('items con retraso')
        })
      );
    });
  });

  // ✅ Test de performance y optimización
  describe('Performance y Optimización', () => {
    it('debe usar paginación en consultas grandes', async () => {
      const filtros: FiltrosReporte = {
        limit: 1000 // Límite alto
      };

      mockPrismaPedido.findMany.mockResolvedValue([]);
      mockPrismaPedido.count.mockResolvedValue(0);
      mockPrismaItem.aggregate.mockResolvedValue({ _sum: { cantidad: 0 } } as any);

      await generarReportePedidos(filtros);

      expect(mockPrismaPedido.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { fechaSolicitud: 'desc' },
        take: 500, // Límite máximo aplicado
        skip: 0
      });
    });

    it('debe usar índices apropiados en consultas complejas', async () => {
      const filtros: FiltrosReporte = {
        proyectoId: 'proyecto-1',
        estado: EstadoPedido.aprobado,
        fechaDesde: new Date('2025-01-01')
      };

      mockPrismaPedido.findMany.mockResolvedValue([]);

      await generarReportePedidos(filtros);

      expect(mockPrismaPedido.findMany).toHaveBeenCalledWith({
        where: {
          proyectoId: 'proyecto-1', // Índice en proyectoId
          estado: EstadoPedido.aprobado, // Índice en estado
          fechaSolicitud: { gte: filtros.fechaDesde } // Índice en fechaSolicitud
        },
        include: expect.any(Object),
        orderBy: { fechaSolicitud: 'desc' }
      });
    });
  });

  // ✅ Test de manejo de errores
  describe('Manejo de Errores', () => {
    it('debe manejar timeouts de base de datos', async () => {
      mockPrismaPedido.findMany.mockRejectedValue(new Error('Query timeout'));

      await expect(generarReportePedidos({})).rejects.toThrow('Error al generar reporte de pedidos');
      expect(mockLogger.error).toHaveBeenCalledWith('Error al generar reporte de pedidos', expect.any(Error));
    });

    it('debe validar parámetros de entrada', async () => {
      const filtrosInvalidos: any = {
        fechaDesde: 'fecha-invalida',
        limit: -1
      };

      await expect(generarReportePedidos(filtrosInvalidos))
        .rejects.toThrow('Parámetros de filtro inválidos');
    });

    it('debe manejar datos corruptos graciosamente', async () => {
      const mockDatosCorruptos = [
        {
          id: 'pedido-1',
          numero: null, // Dato corrupto
          fechaSolicitud: 'invalid-date',
          items: null
        }
      ];

      mockPrismaPedido.findMany.mockResolvedValue(mockDatosCorruptos as any);
      mockPrismaPedido.count.mockResolvedValue(1);
      mockPrismaItem.aggregate.mockResolvedValue({ _sum: { cantidad: 0 } } as any);

      const resultado = await generarReportePedidos({});

      expect(resultado.pedidos).toHaveLength(0); // Datos corruptos filtrados
      expect(resultado.errores).toContain('Datos corruptos detectados');
    });
  });
});
