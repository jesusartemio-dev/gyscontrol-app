// ===================================================
// 📁 Archivo: master-detail-transformers.test.ts
// 📌 Ubicación: src/__tests__/lib/transformers/
// 🔧 Descripción: Tests para verificar la corrección de tipos
//    en master-detail-transformers después del fix de stats
//
// ✍️ Autor: Sistema GYS
// 📅 Fecha: 2025-01-27
// ===================================================

import { calculateMasterStats, calculateDetailStats, transformToMaster } from '@/lib/transformers/master-detail-transformers'
import type { ListaEquipo, ListaEquipoItem } from '@/types/modelos'
import type { ListaEquipoMaster, ListaEquipoDetail } from '@/types/master-detail'

describe('Master Detail Transformers - Stats Type Fix', () => {
  const mockItems: ListaEquipoItem[] = [
    {
      id: '1',
      codigo: 'ITEM-001',
      descripcion: 'Item de prueba 1',
      cantidad: 2,
      presupuesto: 100,
      precioElegido: 120,
      estado: 'aprobado',
      verificado: true,
      origen: 'cotizado',
      comentario: '',
      listaEquipoId: 'lista-1',
      equipoId: 'equipo-1',
      fechaCreacion: new Date('2025-01-27'),
      fechaActualizacion: new Date('2025-01-27'),
      creadoPor: 'user-1'
    },
    {
      id: '2',
      codigo: 'ITEM-002',
      descripcion: 'Item de prueba 2',
      cantidad: 1,
      presupuesto: 200,
      precioElegido: 180,
      estado: 'rechazado',
      verificado: false,
      origen: 'nuevo',
      comentario: '',
      listaEquipoId: 'lista-1',
      equipoId: 'equipo-2',
      fechaCreacion: new Date('2025-01-27'),
      fechaActualizacion: new Date('2025-01-27'),
      creadoPor: 'user-1'
    }
  ]

  const mockLista: ListaEquipo = {
    id: 'lista-1',
    codigo: 'LST-001',
    nombre: 'Lista Test',
    numeroSecuencia: 1,
    descripcion: 'Lista de prueba',
    estado: 'activa',
    fechaCreacion: new Date('2025-01-27'),
    fechaActualizacion: new Date('2025-01-27'),
    proyectoId: 'proyecto-1',
    creadoPor: 'user-1',
    items: mockItems,
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      codigo: 'PROY-001',
      descripcion: 'Proyecto de prueba',
      estado: 'activo',
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-12-31'),
      presupuesto: 10000,
      clienteId: 'cliente-1',
      gestorId: 'gestor-1',
      fechaCreacion: new Date('2025-01-01'),
      fechaActualizacion: new Date('2025-01-27'),
      creadoPor: 'user-1',
      gestor: {
        id: 'gestor-1',
        name: 'Gestor Test',
        email: 'gestor@test.com',
        role: 'gestor'
      }
    }
  }

  describe('calculateMasterStats', () => {
    it('should return correct ListaEquipoMaster stats type', () => {
      // ✅ Esta función debe retornar específicamente ListaEquipoMaster['stats']
      const stats = calculateMasterStats(mockItems)

      // 🎯 Verificar que tiene todas las propiedades requeridas para Master
      expect(stats).toHaveProperty('totalItems')
      expect(stats).toHaveProperty('itemsVerificados')
      expect(stats).toHaveProperty('itemsAprobados')
      expect(stats).toHaveProperty('itemsRechazados')
      expect(stats).toHaveProperty('costoTotal')
      expect(stats).toHaveProperty('costoAprobado')

      // 🎯 Verificar que NO tiene propiedades adicionales de Detail
      expect(stats).not.toHaveProperty('itemsPendientes')
      expect(stats).not.toHaveProperty('costoRechazado')
      expect(stats).not.toHaveProperty('itemsPorOrigen')
      expect(stats).not.toHaveProperty('itemsConPedido')
      expect(stats).not.toHaveProperty('itemsSinPedido')
    })

    it('should calculate stats correctly', () => {
      const stats = calculateMasterStats(mockItems)

      expect(stats.totalItems).toBe(2)
      expect(stats.itemsVerificados).toBe(1) // Solo el primer item está verificado
      expect(stats.itemsAprobados).toBe(1) // Solo el primer item está aprobado
      expect(stats.itemsRechazados).toBe(1) // Solo el segundo item está rechazado
      expect(stats.costoTotal).toBe(420) // (120 * 2) + (180 * 1)
      expect(stats.costoAprobado).toBe(240) // Solo el item aprobado: 120 * 2
    })
  })

  describe('transformToMaster', () => {
    it('should transform ListaEquipo to ListaEquipoMaster with correct stats type', () => {
      // ✅ Esta función debe compilar sin errores de tipos
      const masterLista: ListaEquipoMaster = transformToMaster(mockLista)

      // 🎯 Verificar que la transformación es correcta
      expect(masterLista.id).toBe(mockLista.id)
      expect(masterLista.codigo).toBe(mockLista.codigo)
      expect(masterLista.nombre).toBe(mockLista.nombre)
      expect(masterLista.estado).toBe(mockLista.estado)

      // 🎯 Verificar que stats tiene el tipo correcto
      expect(masterLista.stats).toBeDefined()
      expect(masterLista.stats.totalItems).toBe(2)
      expect(masterLista.stats.itemsVerificados).toBe(1)
      expect(masterLista.stats.itemsAprobados).toBe(1)
      expect(masterLista.stats.itemsRechazados).toBe(1)
      expect(masterLista.stats.costoTotal).toBe(420)
      expect(masterLista.stats.costoAprobado).toBe(240)

      // 🎯 Verificar información del proyecto
      expect(masterLista.proyecto).toBeDefined()
      expect(masterLista.proyecto.id).toBe('proyecto-1')
      expect(masterLista.proyecto.nombre).toBe('Proyecto Test')
      expect(masterLista.proyecto.codigo).toBe('PROY-001')

      // 🎯 Verificar información del responsable
      expect(masterLista.responsable).toBeDefined()
      expect(masterLista.responsable?.id).toBe('gestor-1')
      expect(masterLista.responsable?.name).toBe('Gestor Test')
    })

    it('should handle lista without items', () => {
      const listaVacia: ListaEquipo = {
        ...mockLista,
        items: []
      }

      const masterLista = transformToMaster(listaVacia)

      expect(masterLista.stats.totalItems).toBe(0)
      expect(masterLista.stats.itemsVerificados).toBe(0)
      expect(masterLista.stats.itemsAprobados).toBe(0)
      expect(masterLista.stats.itemsRechazados).toBe(0)
      expect(masterLista.stats.costoTotal).toBe(0)
      expect(masterLista.stats.costoAprobado).toBe(0)
    })

    it('should handle lista without proyecto.gestor', () => {
      const listaSinGestor: ListaEquipo = {
        ...mockLista,
        proyecto: {
          ...mockLista.proyecto!,
          gestor: undefined
        }
      }

      const masterLista = transformToMaster(listaSinGestor)

      expect(masterLista.responsable).toBeUndefined()
    })
  })

  describe('calculateDetailStats', () => {
    it('should calculate extended stats correctly', () => {
      const result = calculateDetailStats(mockItems)
      
      // ✅ Verificar propiedades básicas
      expect(result.totalItems).toBe(2)
      expect(result.itemsVerificados).toBe(1)
      expect(result.itemsAprobados).toBe(1)
      expect(result.itemsRechazados).toBe(1)
      expect(result.costoTotal).toBe(420)
      expect(result.costoAprobado).toBe(240)
      
      // ✅ Verificar propiedades extendidas
      expect(result.itemsPendientes).toBe(0)
      expect(result.costoRechazado).toBe(180)
      expect(result.costoPendiente).toBe(0)
      expect(result.itemsPorOrigen).toBeDefined()
      expect(result.itemsConPedido).toBe(0)
      expect(result.itemsSinPedido).toBe(2)
    })
    
    it('should match ListaEquipoDetail stats type', () => {
      const result = calculateDetailStats(mockItems)
      
      // ✅ El tipo debe coincidir exactamente con ListaEquipoDetail['stats']
      const stats: NonNullable<ListaEquipoDetail['stats']> = result
      expect(stats).toBeDefined()
      expect(stats.totalItems).toBeDefined()
      expect(stats.itemsPorOrigen).toBeDefined()
      expect(stats.itemsConPedido).toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should ensure stats property matches ListaEquipoMaster interface', () => {
      const masterLista = transformToMaster(mockLista)
      
      // ✅ Esta asignación debe compilar sin errores
      const statsTyped: ListaEquipoMaster['stats'] = masterLista.stats
      
      expect(statsTyped).toBeDefined()
      expect(typeof statsTyped.totalItems).toBe('number')
      expect(typeof statsTyped.itemsVerificados).toBe('number')
      expect(typeof statsTyped.itemsAprobados).toBe('number')
      expect(typeof statsTyped.itemsRechazados).toBe('number')
      expect(typeof statsTyped.costoTotal).toBe('number')
      expect(typeof statsTyped.costoAprobado).toBe('number')
    })
  })
})
