/**
 * @fileoverview Tests para validaciones de null safety en AprovisionamientoNotificaciones
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-XX
 */

import { AprovisionamientoNotificaciones } from '@/lib/services/aprovisionamientoNotificaciones';
import type { ProyectoAprovisionamiento } from '@/types/aprovisionamiento';

describe('AprovisionamientoNotificaciones - Null Safety', () => {
  const mockProyectoCompleto: ProyectoAprovisionamiento = {
    id: '1',
    nombre: 'Proyecto Test',
    codigo: 'PROJ-001',
    clienteId: 'client-1',
    clienteNombre: 'Cliente Test',
    comercialId: 'comercial-1',
    comercialNombre: 'Juan Pérez',
    gestorId: 'gestor-1',
    gestorNombre: 'María García',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    estado: 'activo',
    totalCliente: 100000,
    totalInterno: 80000,
    totalReal: 40000,
    porcentajeEjecucion: 50,
    desviacion: 0,
    coherenciaEstado: 'ok',
    totalListas: 5,
    totalPedidos: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProyectoSinNombres: ProyectoAprovisionamiento = {
    ...mockProyectoCompleto,
    id: '2',
    nombre: '',
    codigo: '',
    comercialNombre: undefined,
    gestorNombre: undefined
  };

  beforeEach(() => {
    // Reset notificaciones antes de cada test
    (AprovisionamientoNotificaciones as any).notificaciones = [];
  });

  describe('generarAlertasPresupuesto', () => {
    it('should handle projects with undefined nombres gracefully', async () => {
      const proyectos = [mockProyectoSinNombres];
      
      const alertas = await AprovisionamientoNotificaciones.generarAlertasAutomaticas(
        proyectos,
        [],
        [],
        []
      );
      
      expect(alertas).toBeDefined();
      expect(Array.isArray(alertas)).toBe(true);
      
      const alertaPresupuesto = alertas.find(a => a.categoria === 'presupuesto');
      if (alertaPresupuesto) {
        expect(alertaPresupuesto.titulo).toContain('Sin nombre');
        expect(alertaPresupuesto.mensaje).toContain('Sin nombre');
        expect(alertaPresupuesto.detalles).toContain('Sin nombre');
        expect(alertaPresupuesto.detalles).toContain('Sin código');
        expect(alertaPresupuesto.detalles).toContain('No asignado');
      }
    });

    it('should use actual values when nombres are provided', async () => {
      const proyectos = [mockProyectoCompleto];
      
      const alertas = await AprovisionamientoNotificaciones.generarAlertasAutomaticas(
        proyectos,
        [],
        [],
        []
      );
      
      const alertaPresupuesto = alertas.find(a => a.categoria === 'presupuesto');
      if (alertaPresupuesto) {
        expect(alertaPresupuesto.titulo).toContain('Proyecto Test');
        expect(alertaPresupuesto.mensaje).toContain('Proyecto Test');
        expect(alertaPresupuesto.detalles).toContain('PROJ-001');
        expect(alertaPresupuesto.detalles).toContain('Juan Pérez');
        expect(alertaPresupuesto.detalles).toContain('María García');
      }
    });
  });

  describe('analizarCargaRecursos', () => {
    it('should skip projects without comercialNombre', () => {
      const proyectos = [
        mockProyectoCompleto,
        mockProyectoSinNombres
      ];
      
      const analizarCargaRecursos = (AprovisionamientoNotificaciones as any).analizarCargaRecursos;
      const resultadoComercial = analizarCargaRecursos(proyectos, 'comercial');
      
      expect(resultadoComercial).toBeDefined();
      expect(Array.isArray(resultadoComercial)).toBe(true);
      
      expect(resultadoComercial.length).toBe(1);
      expect(resultadoComercial[0].recurso).toBe('Juan Pérez');
      expect(resultadoComercial[0].proyectosAsignados).toBe(1);
    });

    it('should skip projects without gestorNombre', () => {
      const proyectos = [
        mockProyectoCompleto,
        mockProyectoSinNombres
      ];
      
      const analizarCargaRecursos = (AprovisionamientoNotificaciones as any).analizarCargaRecursos;
      const resultadoGestor = analizarCargaRecursos(proyectos, 'gestor');
      
      expect(resultadoGestor).toBeDefined();
      expect(Array.isArray(resultadoGestor)).toBe(true);
      
      expect(resultadoGestor.length).toBe(1);
      expect(resultadoGestor[0].recurso).toBe('María García');
      expect(resultadoGestor[0].proyectosAsignados).toBe(1);
    });

    it('should handle empty projects array', () => {
      const proyectos: ProyectoAprovisionamiento[] = [];
      
      const analizarCargaRecursos = (AprovisionamientoNotificaciones as any).analizarCargaRecursos;
      const resultado = analizarCargaRecursos(proyectos, 'comercial');
      
      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado)).toBe(true);
      expect(resultado.length).toBe(0);
    });
  });
});
