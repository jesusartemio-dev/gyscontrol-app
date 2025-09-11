/**
 * 🧪 Tests para Componente ReportesList
 * 
 * @description Tests para la lista de reportes con filtros y exportación
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportesList } from '@/components/reportes/ReportesList';

import type { Reporte, FiltrosReporte } from '@/types/modelos';

// 🔧 Mocks
jest.mock('@/lib/services/reportes', () => ({
  obtenerReportes: jest.fn(),
  exportarReportePDF: jest.fn(),
  exportarReporteExcel: jest.fn()
}));

jest.mock('@/components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/components/ui/data-table', () => ({
  DataTable: ({ data, columns, ...props }: any) => (
    <div data-testid="data-table" {...props}>
      <table>
        <thead>
          <tr>
            {columns.map((col: any, idx: number) => (
              <th key={idx}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx: number) => (
            <tr key={idx} data-testid={`table-row-${idx}`}>
              {columns.map((col: any, colIdx: number) => (
                <td key={colIdx}>{col.accessorKey ? row[col.accessorKey] : col.cell?.(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}));

const mockReportes: Reporte[] = [
  {
    id: 'reporte-1',
    titulo: 'Reporte de Entregas Enero 2025',
    tipo: 'entregas',
    fechaCreacion: new Date('2025-01-15'),
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-01-31'),
    estado: 'completado',
    autor: {
      id: 'user-1',
      nombre: 'Juan Pérez',
      email: 'juan@gys.com'
    },
    parametros: {
      proyectoId: 'proyecto-1',
      estadoEntrega: 'entregado',
      incluirDetalles: true
    },
    resultados: {
      totalEntregas: 45,
      entregasCompletadas: 38,
      entregasRetrasadas: 7,
      tiempoPromedioEntrega: 5.2
    },
    archivoUrl: '/reportes/reporte-1.pdf',
    tamaño: 2.5
  },
  {
    id: 'reporte-2',
    titulo: 'Análisis de Trazabilidad Q1 2025',
    tipo: 'trazabilidad',
    fechaCreacion: new Date('2025-01-20'),
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-03-31'),
    estado: 'procesando',
    autor: {
      id: 'user-2',
      nombre: 'María García',
      email: 'maria@gys.com'
    },
    parametros: {
      incluirEventos: true,
      incluirRetrasos: true
    },
    resultados: null,
    archivoUrl: null,
    tamaño: 0
  },
  {
    id: 'reporte-3',
    titulo: 'Dashboard Ejecutivo Diciembre',
    tipo: 'dashboard',
    fechaCreacion: new Date('2024-12-31'),
    fechaInicio: new Date('2024-12-01'),
    fechaFin: new Date('2024-12-31'),
    estado: 'error',
    autor: {
      id: 'user-1',
      nombre: 'Juan Pérez',
      email: 'juan@gys.com'
    },
    parametros: {
      incluirGraficos: true,
      formato: 'pdf'
    },
    resultados: null,
    archivoUrl: null,
    tamaño: 0,
    error: 'Error al generar gráficos de rendimiento'
  }
];

const defaultProps = {
  usuarioId: 'user-1',
  rol: 'ADMIN' as const,
  onReporteSelect: jest.fn(),
  onReporteDelete: jest.fn()
};

// Mock de servicios
const mockObtenerReportes = require('@/lib/services/reportes').obtenerReportes;
const mockExportarReportePDF = require('@/lib/services/reportes').exportarReportePDF;
const mockExportarReporteExcel = require('@/lib/services/reportes').exportarReporteExcel;

describe('ReportesList Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockObtenerReportes.mockResolvedValue({
      reportes: mockReportes,
      total: mockReportes.length,
      pagina: 1,
      totalPaginas: 1
    });
  });

  // ✅ Test renderizado básico
  describe('Renderizado', () => {
    it('debe renderizar lista de reportes correctamente', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Reportes Generados')).toBeInTheDocument();
      });

      expect(screen.getByText('Reporte de Entregas Enero 2025')).toBeInTheDocument();
      expect(screen.getByText('Análisis de Trazabilidad Q1 2025')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Ejecutivo Diciembre')).toBeInTheDocument();
    });

    it('debe mostrar información de cada reporte', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('María García')).toBeInTheDocument();
        expect(screen.getByText('completado')).toBeInTheDocument();
        expect(screen.getByText('procesando')).toBeInTheDocument();
        expect(screen.getByText('error')).toBeInTheDocument();
      });
    });

    it('debe mostrar badges de estado correctos', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        const completadoBadge = screen.getByText('completado');
        expect(completadoBadge).toHaveClass('bg-green-100', 'text-green-800');

        const procesandoBadge = screen.getByText('procesando');
        expect(procesandoBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');

        const errorBadge = screen.getByText('error');
        expect(errorBadge).toHaveClass('bg-red-100', 'text-red-800');
      });
    });

    it('debe mostrar tamaño de archivo formateado', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2.5 MB')).toBeInTheDocument();
      });
    });

    it('debe mostrar estado de carga', () => {
      mockObtenerReportes.mockImplementation(() => new Promise(() => {}));

      render(<ReportesList {...defaultProps} />);

      expect(screen.getByTestId('reportes-skeleton')).toBeInTheDocument();
      expect(screen.getByText('Cargando reportes...')).toBeInTheDocument();
    });

    it('debe mostrar estado vacío cuando no hay reportes', async () => {
      mockObtenerReportes.mockResolvedValue({
        reportes: [],
        total: 0,
        pagina: 1,
        totalPaginas: 0
      });

      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No hay reportes generados')).toBeInTheDocument();
        expect(screen.getByText('Crear primer reporte')).toBeInTheDocument();
      });
    });
  });

  // ✅ Test filtros
  describe('Filtros', () => {
    it('debe permitir filtrar por tipo de reporte', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filtrar por tipo')).toBeInTheDocument();
      });

      const tipoFilter = screen.getByLabelText('Filtrar por tipo');
      await user.click(tipoFilter);
      
      const entregasOption = screen.getByText('Solo Entregas');
      await user.click(entregasOption);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          tipo: 'entregas',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe permitir filtrar por estado', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument();
      });

      const estadoFilter = screen.getByLabelText('Filtrar por estado');
      await user.click(estadoFilter);
      
      const completadoOption = screen.getByText('Solo Completados');
      await user.click(completadoOption);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          estado: 'completado',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe permitir filtrar por rango de fechas', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Fecha desde')).toBeInTheDocument();
        expect(screen.getByLabelText('Fecha hasta')).toBeInTheDocument();
      });

      const fechaDesde = screen.getByLabelText('Fecha desde');
      const fechaHasta = screen.getByLabelText('Fecha hasta');

      await user.type(fechaDesde, '2025-01-01');
      await user.type(fechaHasta, '2025-01-31');

      const aplicarButton = screen.getByText('Aplicar filtros');
      await user.click(aplicarButton);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          fechaDesde: '2025-01-01',
          fechaHasta: '2025-01-31',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe permitir filtrar por autor', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filtrar por autor')).toBeInTheDocument();
      });

      const autorFilter = screen.getByLabelText('Filtrar por autor');
      await user.click(autorFilter);
      
      const juanOption = screen.getByText('Juan Pérez');
      await user.click(juanOption);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          autorId: 'user-1',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe permitir búsqueda por texto', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar reportes...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar reportes...');
      await user.type(searchInput, 'Entregas Enero');

      // Debounce delay
      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          busqueda: 'Entregas Enero',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      }, { timeout: 1000 });
    });

    it('debe limpiar filtros correctamente', async () => {
      render(<ReportesList {...defaultProps} />);

      // Aplicar filtros
      const tipoFilter = screen.getByLabelText('Filtrar por tipo');
      await user.click(tipoFilter);
      await user.click(screen.getByText('Solo Entregas'));

      await waitFor(() => {
        expect(screen.getByText('Limpiar filtros')).toBeInTheDocument();
      });

      // Limpiar filtros
      const clearButton = screen.getByText('Limpiar filtros');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });
  });

  // ✅ Test ordenamiento
  describe('Ordenamiento', () => {
    it('debe permitir ordenar por fecha de creación', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Fecha')).toBeInTheDocument();
      });

      const fechaHeader = screen.getByText('Fecha');
      await user.click(fechaHeader);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          ordenarPor: 'fechaCreacion',
          orden: 'desc',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe permitir ordenar por título', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Título')).toBeInTheDocument();
      });

      const tituloHeader = screen.getByText('Título');
      await user.click(tituloHeader);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          ordenarPor: 'titulo',
          orden: 'asc',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe permitir ordenar por estado', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Estado')).toBeInTheDocument();
      });

      const estadoHeader = screen.getByText('Estado');
      await user.click(estadoHeader);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          ordenarPor: 'estado',
          orden: 'asc',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe alternar dirección de ordenamiento', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Fecha')).toBeInTheDocument();
      });

      const fechaHeader = screen.getByText('Fecha');
      
      // Primer click - descendente
      await user.click(fechaHeader);
      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith(expect.objectContaining({
          orden: 'desc'
        }));
      });

      // Segundo click - ascendente
      await user.click(fechaHeader);
      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith(expect.objectContaining({
          orden: 'asc'
        }));
      });
    });
  });

  // ✅ Test paginación
  describe('Paginación', () => {
    beforeEach(() => {
      mockObtenerReportes.mockResolvedValue({
        reportes: mockReportes,
        total: 25,
        pagina: 1,
        totalPaginas: 3
      });
    });

    it('debe mostrar controles de paginación', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
        expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
        expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
      });
    });

    it('debe navegar a página siguiente', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Página siguiente');
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          usuarioId: 'user-1',
          pagina: 2,
          limite: 10
        });
      });
    });

    it('debe navegar a página anterior', async () => {
      mockObtenerReportes.mockResolvedValue({
        reportes: mockReportes,
        total: 25,
        pagina: 2,
        totalPaginas: 3
      });

      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
      });

      const prevButton = screen.getByLabelText('Página anterior');
      await user.click(prevButton);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });

    it('debe permitir cambiar tamaño de página', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Elementos por página')).toBeInTheDocument();
      });

      const pageSizeSelect = screen.getByLabelText('Elementos por página');
      await user.click(pageSizeSelect);
      
      const option25 = screen.getByText('25');
      await user.click(option25);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          usuarioId: 'user-1',
          pagina: 1,
          limite: 25
        });
      });
    });
  });

  // ✅ Test acciones
  describe('Acciones', () => {
    it('debe permitir ver detalles de reporte', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByLabelText('Ver detalles')[0]).toBeInTheDocument();
      });

      const viewButton = screen.getAllByLabelText('Ver detalles')[0];
      await user.click(viewButton);

      expect(defaultProps.onReporteSelect).toHaveBeenCalledWith(mockReportes[0]);
    });

    it('debe permitir descargar reporte completado', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByLabelText('Descargar reporte')[0]).toBeInTheDocument();
      });

      const downloadButton = screen.getAllByLabelText('Descargar reporte')[0];
      await user.click(downloadButton);

      // Verificar que se inicia la descarga
      expect(screen.getByText('Descargando...')).toBeInTheDocument();
    });

    it('debe deshabilitar descarga para reportes en proceso', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        const downloadButtons = screen.getAllByLabelText('Descargar reporte');
        expect(downloadButtons[1]).toBeDisabled(); // Segundo reporte está procesando
      });
    });

    it('debe permitir eliminar reporte', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByLabelText('Eliminar reporte')[0]).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByLabelText('Eliminar reporte')[0];
      await user.click(deleteButton);

      // Confirmar eliminación
      await waitFor(() => {
        expect(screen.getByText('¿Confirmar eliminación?')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Eliminar');
      await user.click(confirmButton);

      expect(defaultProps.onReporteDelete).toHaveBeenCalledWith(mockReportes[0].id);
    });

    it('debe permitir duplicar reporte', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByLabelText('Duplicar reporte')[0]).toBeInTheDocument();
      });

      const duplicateButton = screen.getAllByLabelText('Duplicar reporte')[0];
      await user.click(duplicateButton);

      await waitFor(() => {
        expect(screen.getByText('Reporte duplicado correctamente')).toBeInTheDocument();
      });
    });

    it('debe mostrar menú de exportación', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Exportar')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Exportar');
      await user.click(exportButton);

      expect(screen.getByText('Exportar PDF')).toBeInTheDocument();
      expect(screen.getByText('Exportar Excel')).toBeInTheDocument();
      expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
    });

    it('debe exportar lista a PDF', async () => {
      mockExportarReportePDF.mockResolvedValue({ url: '/exports/reportes.pdf' });

      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Exportar')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Exportar');
      await user.click(exportButton);

      const pdfOption = screen.getByText('Exportar PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(mockExportarReportePDF).toHaveBeenCalledWith({
          reportes: mockReportes,
          filtros: expect.any(Object)
        });
      });
    });

    it('debe exportar lista a Excel', async () => {
      mockExportarReporteExcel.mockResolvedValue({ url: '/exports/reportes.xlsx' });

      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Exportar')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Exportar');
      await user.click(exportButton);

      const excelOption = screen.getByText('Exportar Excel');
      await user.click(excelOption);

      await waitFor(() => {
        expect(mockExportarReporteExcel).toHaveBeenCalledWith({
          reportes: mockReportes,
          filtros: expect.any(Object)
        });
      });
    });
  });

  // ✅ Test permisos por rol
  describe('Permisos por Rol', () => {
    it('debe mostrar todas las acciones para ADMIN', async () => {
      render(<ReportesList {...defaultProps} rol="ADMIN" />);

      await waitFor(() => {
        expect(screen.getAllByLabelText('Ver detalles')[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText('Eliminar reporte')[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText('Duplicar reporte')[0]).toBeInTheDocument();
        expect(screen.getByText('Exportar')).toBeInTheDocument();
      });
    });

    it('debe limitar acciones para COMERCIAL', async () => {
      render(<ReportesList {...defaultProps} rol="COMERCIAL" />);

      await waitFor(() => {
        expect(screen.getAllByLabelText('Ver detalles')[0]).toBeInTheDocument();
        expect(screen.getAllByLabelText('Descargar reporte')[0]).toBeInTheDocument();
        expect(screen.queryByLabelText('Eliminar reporte')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar solo reportes propios para COLABORADOR', async () => {
      const reportesPropios = mockReportes.filter(r => r.autor.id === 'user-1');
      mockObtenerReportes.mockResolvedValue({
        reportes: reportesPropios,
        total: reportesPropios.length,
        pagina: 1,
        totalPaginas: 1
      });

      render(<ReportesList {...defaultProps} rol="COLABORADOR" />);

      await waitFor(() => {
        expect(mockObtenerReportes).toHaveBeenCalledWith({
          autorId: 'user-1',
          usuarioId: 'user-1',
          pagina: 1,
          limite: 10
        });
      });
    });
  });

  // ✅ Test responsive
  describe('Diseño Responsive', () => {
    it('debe mostrar vista de tarjetas en móviles', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<ReportesList {...defaultProps} />);

      expect(screen.getByTestId('reportes-cards-view')).toBeInTheDocument();
      expect(screen.queryByTestId('data-table')).not.toBeInTheDocument();
    });

    it('debe mostrar tabla completa en desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      render(<ReportesList {...defaultProps} />);

      expect(screen.getByTestId('data-table')).toBeInTheDocument();
      expect(screen.queryByTestId('reportes-cards-view')).not.toBeInTheDocument();
    });

    it('debe ocultar columnas menos importantes en tablets', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(<ReportesList {...defaultProps} />);

      expect(screen.getByText('Título')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.queryByText('Autor')).not.toBeInTheDocument();
      expect(screen.queryByText('Tamaño')).not.toBeInTheDocument();
    });
  });

  // ✅ Test manejo de errores
  describe('Manejo de Errores', () => {
    it('debe mostrar error cuando falla la carga', async () => {
      mockObtenerReportes.mockRejectedValue(new Error('Error de red'));

      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar reportes')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });
    });

    it('debe reintentar carga de datos', async () => {
      mockObtenerReportes.mockRejectedValueOnce(new Error('Error de red'));
      mockObtenerReportes.mockResolvedValueOnce({
        reportes: mockReportes,
        total: mockReportes.length,
        pagina: 1,
        totalPaginas: 1
      });

      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Reintentar');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Reporte de Entregas Enero 2025')).toBeInTheDocument();
      });
    });

    it('debe mostrar error cuando falla la exportación', async () => {
      mockExportarReportePDF.mockRejectedValue(new Error('Error al generar PDF'));

      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Exportar')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Exportar');
      await user.click(exportButton);

      const pdfOption = screen.getByText('Exportar PDF');
      await user.click(pdfOption);

      await waitFor(() => {
        expect(screen.getByText('Error al exportar reporte')).toBeInTheDocument();
      });
    });

    it('debe mostrar mensaje de error específico para reportes fallidos', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error al generar gráficos de rendimiento')).toBeInTheDocument();
      });
    });
  });

  // ✅ Test accesibilidad
  describe('Accesibilidad', () => {
    it('debe tener estructura semántica correcta', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Lista de reportes');
      });

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    it('debe tener etiquetas ARIA para filtros', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filtrar por tipo')).toBeInTheDocument();
        expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument();
        expect(screen.getByLabelText('Filtrar por autor')).toBeInTheDocument();
      });
    });

    it('debe ser navegable por teclado', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar reportes...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar reportes...');
      searchInput.focus();

      await user.tab();
      expect(screen.getByLabelText('Filtrar por tipo')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Filtrar por estado')).toHaveFocus();
    });

    it('debe anunciar cambios de estado a lectores de pantalla', async () => {
      render(<ReportesList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('3 reportes cargados');
      });

      // Aplicar filtro
      const tipoFilter = screen.getByLabelText('Filtrar por tipo');
      await user.click(tipoFilter);
      await user.click(screen.getByText('Solo Entregas'));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Filtros aplicados');
      });
    });
  });
});
