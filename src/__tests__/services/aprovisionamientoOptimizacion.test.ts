/**
 * 🧪 Tests para AprovisionamientoOptimizacion
 * 
 * Verifica:
 * - Detección de cuellos de botella
 * - Optimización de cronogramas
 * - Asignación de recursos
 * - Corrección de propiedades TypeScript
 * 
 * @author GYS Team
 */

import { AprovisionamientoOptimizacion, RecursoDisponible, ConfiguracionOptimizacion } from '@/lib/services/aprovisionamientoOptimizacion';
import type { ProyectoAprovisionamiento } from '@/types/aprovisionamiento';
import type { GanttCalculationResult } from '@/lib/services/aprovisionamientoCalculos';

// 🎭 Mocks de datos de prueba
const mockProyectos: ProyectoAprovisionamiento[] = [
  {
    id: 'PROJ-001',
    nombre: 'Proyecto Alpha',
    codigo: 'ALPHA-2024',
    estado: 'en_progreso',
    fechaInicio: new Date('2024-01-15'),
    fechaFin: new Date('2024-06-15'),
    comercialId: 'COM-001',
    comercialNombre: 'Juan Pérez',
    gestorId: 'GES-001',
    gestorNombre: 'María García',
    clienteId: 'CLI-001',
    clienteNombre: 'Cliente ABC',
    totalInterno: 150000,
    totalReal: 120000,
    moneda: 'PEN',
    fechaCreacion: new Date('2024-01-01'),
    fechaActualizacion: new Date('2024-01-15')
  },
  {
    id: 'PROJ-002',
    nombre: 'Proyecto Beta',
    codigo: 'BETA-2024',
    estado: 'planificacion',
    fechaInicio: new Date('2024-02-01'),
    fechaFin: new Date('2024-07-01'),
    comercialId: 'COM-001',
    comercialNombre: 'Juan Pérez',
    gestorId: 'GES-002',
    gestorNombre: 'Carlos López',
    clienteId: 'CLI-002',
    clienteNombre: 'Cliente XYZ',
    totalInterno: 200000,
    totalReal: 180000,
    moneda: 'USD',
    fechaCreacion: new Date('2024-01-10'),
    fechaActualizacion: new Date('2024-01-20')
  },
  {
    id: 'PROJ-003',
    nombre: 'Proyecto Gamma',
    codigo: 'GAMMA-2024',
    estado: 'en_progreso',
    fechaInicio: new Date('2024-03-01'),
    fechaFin: new Date('2024-08-01'),
    comercialId: 'COM-001',
    comercialNombre: 'Juan Pérez',
    gestorId: 'GES-001',
    gestorNombre: 'María García',
    clienteId: 'CLI-003',
    clienteNombre: 'Cliente DEF',
    totalInterno: 300000,
    totalReal: 250000,
    moneda: 'PEN',
    fechaCreacion: new Date('2024-02-15'),
    fechaActualizacion: new Date('2024-03-01')
  }
];

const mockRecursos: RecursoDisponible[] = [
  {
    id: 'REC-001',
    nombre: 'Juan Pérez',
    tipo: 'comercial',
    capacidadMaxima: 2,
    capacidadActual: 3,
    especialidades: ['ventas', 'negociación'],
    disponibilidad: {
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2024-12-31'),
      diasNoDisponibles: []
    }
  },
  {
    id: 'REC-002',
    nombre: 'María García',
    tipo: 'gestor',
    capacidadMaxima: 3,
    capacidadActual: 2,
    especialidades: ['gestión', 'coordinación'],
    disponibilidad: {
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2024-12-31'),
      diasNoDisponibles: []
    }
  },
  {
    id: 'REC-003',
    nombre: 'Carlos López',
    tipo: 'gestor',
    capacidadMaxima: 2,
    capacidadActual: 1,
    especialidades: ['análisis', 'planificación'],
    disponibilidad: {
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2024-12-31'),
      diasNoDisponibles: []
    }
  }
];

const mockGantt: GanttCalculationResult[] = [
  {
    id: 'PROJ-001',
    label: 'Proyecto Alpha',
    start: new Date('2024-01-15'),
    end: new Date('2024-06-15'),
    amount: 150000,
    criticidad: 'alta',
    diasRestantes: 30,
    porcentajeCompletado: 75
  },
  {
    id: 'PROJ-002',
    label: 'Proyecto Beta',
    start: new Date('2024-02-01'),
    end: new Date('2024-07-01'),
    amount: 200000,
    criticidad: 'media',
    diasRestantes: 60,
    porcentajeCompletado: 45
  }
];

const mockConfiguracion: ConfiguracionOptimizacion = {
  objetivos: {
    minimizarTiempo: true,
    maximizarEficiencia: true,
    balancearCargas: true,
    respetarPrioridades: true
  },
  restricciones: {
    fechasLimite: true,
    recursosDisponibles: true,
    dependencias: true,
    presupuesto: 1000000
  },
  algoritmo: 'greedy',
  iteraciones: 100
};

describe('AprovisionamientoOptimizacion', () => {
  describe('detectarCuellosBottella', () => {
    it('✅ debe detectar cuellos de botella por recursos sobrecargados', () => {
      const cuellos = AprovisionamientoOptimizacion.detectarCuellosBottella(
        mockProyectos,
        mockGantt,
        mockRecursos
      );

      // Verificar que se detecta sobrecarga de Juan Pérez (3 proyectos, capacidad máxima 2)
      const cuelloRecurso = cuellos.find(c => 
        c.tipo === 'recurso' && c.descripcion.includes('Juan Pérez')
      );
      
      expect(cuelloRecurso).toBeDefined();
      expect(cuelloRecurso?.impacto).toBe('alto');
      expect(cuelloRecurso?.proyectosAfectados).toHaveLength(3);
    });

    it('✅ debe usar comercialNombre y gestorNombre correctamente', () => {
      // Este test verifica que no hay errores TypeScript al acceder a las propiedades
      expect(() => {
        AprovisionamientoOptimizacion.detectarCuellosBottella(
          mockProyectos,
          mockGantt,
          mockRecursos
        );
      }).not.toThrow();
    });

    it('✅ debe manejar proyectos sin comercial o gestor asignado', () => {
      const proyectosSinAsignacion: ProyectoAprovisionamiento[] = [
        {
          ...mockProyectos[0],
          comercialNombre: undefined,
          gestorNombre: undefined
        }
      ];

      expect(() => {
        AprovisionamientoOptimizacion.detectarCuellosBottella(
          proyectosSinAsignacion,
          mockGantt,
          mockRecursos
        );
      }).not.toThrow();
    });

    it('✅ debe detectar fechas críticas coincidentes', () => {
      const ganttConFechasCriticas: GanttCalculationResult[] = [
        {
          ...mockGantt[0],
          criticidad: 'critica',
          end: new Date('2024-06-15')
        },
        {
          ...mockGantt[1],
          criticidad: 'alta',
          end: new Date('2024-06-15')
        }
      ];

      const cuellos = AprovisionamientoOptimizacion.detectarCuellosBottella(
        mockProyectos,
        ganttConFechasCriticas,
        mockRecursos
      );

      const cuelloFecha = cuellos.find(c => c.tipo === 'fecha');
      expect(cuelloFecha).toBeDefined();
    });
  });

  describe('optimizarCronograma', () => {
    it('✅ debe optimizar cronograma sin errores', async () => {
      const resultado = await AprovisionamientoOptimizacion.optimizarCronograma(
        mockProyectos,
        mockGantt,
        mockRecursos,
        mockConfiguracion
      );

      expect(resultado).toBeDefined();
      expect(resultado.cronogramaOptimizado).toBeDefined();
      expect(resultado.asignacionRecursos).toBeDefined();
      expect(resultado.metricas).toBeDefined();
      expect(resultado.recomendaciones).toBeDefined();
      expect(resultado.alertas).toBeDefined();
    });

    it('✅ debe generar métricas válidas', async () => {
      const resultado = await AprovisionamientoOptimizacion.optimizarCronograma(
        mockProyectos,
        mockGantt,
        mockRecursos,
        mockConfiguracion
      );

      expect(resultado.metricas.eficienciaGlobal).toBeGreaterThanOrEqual(0);
      expect(resultado.metricas.eficienciaGlobal).toBeLessThanOrEqual(100);
      expect(resultado.metricas.tiempoTotalReducido).toBeGreaterThanOrEqual(0);
      expect(resultado.metricas.conflictosResueltos).toBeGreaterThanOrEqual(0);
    });

    it('✅ debe generar asignación de recursos', async () => {
      const resultado = await AprovisionamientoOptimizacion.optimizarCronograma(
        mockProyectos,
        mockGantt,
        mockRecursos,
        mockConfiguracion
      );

      expect(resultado.asignacionRecursos).toHaveLength(mockRecursos.length);
      
      resultado.asignacionRecursos.forEach(asignacion => {
        expect(asignacion.recursoId).toBeDefined();
        expect(asignacion.proyectos).toBeDefined();
        expect(asignacion.cargaTrabajo).toBeGreaterThanOrEqual(0);
        expect(asignacion.cargaTrabajo).toBeLessThanOrEqual(100);
        expect(asignacion.eficiencia).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Validaciones TypeScript', () => {
    it('✅ debe acceder correctamente a propiedades de ProyectoAprovisionamiento', () => {
      const proyecto = mockProyectos[0];
      
      // Verificar que las propiedades existen y son accesibles
      expect(proyecto.comercialNombre).toBeDefined();
      expect(proyecto.gestorNombre).toBeDefined();
      expect(proyecto.clienteNombre).toBeDefined();
      expect(proyecto.nombre).toBeDefined();
      expect(proyecto.codigo).toBeDefined();
    });

    it('✅ debe manejar propiedades opcionales correctamente', () => {
      const proyectoConPropiedadesOpcionales: ProyectoAprovisionamiento = {
        ...mockProyectos[0],
        comercialNombre: undefined,
        gestorNombre: undefined,
        clienteNombre: undefined
      };

      expect(() => {
        const comercial = proyectoConPropiedadesOpcionales.comercialNombre || 'No asignado';
        const gestor = proyectoConPropiedadesOpcionales.gestorNombre || 'No asignado';
        const cliente = proyectoConPropiedadesOpcionales.clienteNombre || 'No asignado';
        
        expect(comercial).toBe('No asignado');
        expect(gestor).toBe('No asignado');
        expect(cliente).toBe('No asignado');
      }).not.toThrow();
    });
  });
});
