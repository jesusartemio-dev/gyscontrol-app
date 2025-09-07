// ===================================================
// 📁 Archivo: ListasEquipoView-types.test.ts
// 📌 Ubicación: src/__tests__/components/proyectos/
// 🔧 Descripción: Test para verificar que los tipos de
//    ListasEquipoView están correctamente definidos
// ===================================================

import type { ListaEquipo, EstadoListaEquipo } from '@/types'

// ✅ Test para verificar que los mapeos de estado funcionan correctamente
describe('ListasEquipoView Types', () => {
  // Mock data que simula lo que viene de la API
  const mockListaEquipo: ListaEquipo = {
    id: '1',
    proyectoId: 'proj-1',
    codigo: 'TEST-LST-001',
    nombre: 'Lista de Prueba',
    numeroSecuencia: 1,
    estado: 'borrador' as EstadoListaEquipo,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    _count: {
      items: 5
    },
    items: [],
    proyecto: {
      id: 'proj-1',
      nombre: 'Proyecto Test',
      codigo: 'TEST-001',
      numeroSecuencia: 1,
      clienteId: 'client-1',
      comercialId: 'user-1',
      gestorId: 'user-2',
      estado: 'activo',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  }

  // ✅ Mapeos de estado alineados con EstadoListaEquipo
  const estadoBadgeVariant: Record<EstadoListaEquipo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    borrador: 'secondary',
    por_revisar: 'default',
    por_cotizar: 'default',
    por_validar: 'default',
    por_aprobar: 'default',
    aprobado: 'default',
    rechazado: 'destructive'
  }

  const estadoColors: Record<EstadoListaEquipo, string> = {
    borrador: 'bg-gray-100 text-gray-800',
    por_revisar: 'bg-yellow-100 text-yellow-800',
    por_cotizar: 'bg-blue-100 text-blue-800',
    por_validar: 'bg-orange-100 text-orange-800',
    por_aprobar: 'bg-purple-100 text-purple-800',
    aprobado: 'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800'
  }

  it('should have correct badge variant for estado', () => {
    // ✅ Esto debería funcionar sin errores de TypeScript
    const variant = estadoBadgeVariant[mockListaEquipo.estado]
    expect(variant).toBe('secondary')
  })

  it('should have correct colors for estado', () => {
    // ✅ Esto debería funcionar sin errores de TypeScript
    const color = estadoColors[mockListaEquipo.estado]
    expect(color).toBe('bg-gray-100 text-gray-800')
  })

  it('should access _count.items property', () => {
    // ✅ Esto debería funcionar sin errores de TypeScript
    const itemCount = mockListaEquipo._count?.items || 0
    expect(itemCount).toBe(5)
  })

  it('should handle all EstadoListaEquipo values', () => {
    const estados: EstadoListaEquipo[] = [
      'borrador',
      'por_revisar', 
      'por_cotizar',
      'por_validar',
      'por_aprobar',
      'aprobado',
      'rechazado'
    ]

    estados.forEach(estado => {
      // ✅ Todos los estados deben tener mapeos definidos
      expect(estadoBadgeVariant[estado]).toBeDefined()
      expect(estadoColors[estado]).toBeDefined()
    })
  })

  it('should format estado text correctly', () => {
    // ✅ Simula el formateo que se hace en el componente
    const formattedEstado = mockListaEquipo.estado.replace('_', ' ')
    expect(formattedEstado).toBe('borrador')
    
    // Test con estado que tiene guión bajo
    const estadoConGuion: EstadoListaEquipo = 'por_revisar'
    const formattedConGuion = estadoConGuion.replace('_', ' ')
    expect(formattedConGuion).toBe('por revisar')
  })
})