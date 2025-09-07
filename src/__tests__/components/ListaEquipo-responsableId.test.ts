// ===================================================
// 📁 Archivo: ListaEquipo-responsableId.test.ts
// 📌 Ubicación: src/__tests__/types/
// 🔧 Descripción: Test para verificar que ListaEquipo incluye responsableId
// ✍️ Autor: GYS AI Assistant
// 📅 Fecha: 2025-01-27
// ===================================================

import { ListaEquipo } from '@/types/modelos'

describe('ListaEquipo Interface - responsableId Property', () => {
  test('should include responsableId property', () => {
    // ✅ Test de compilación: si este código compila, significa que responsableId existe
    const mockLista: ListaEquipo = {
      id: 'test-id',
      proyectoId: 'project-id',
      responsableId: 'user-id', // ✅ Esta línea debe compilar sin errores
      codigo: 'TEST-001',
      nombre: 'Lista de prueba',
      numeroSecuencia: 1,
      estado: 'borrador',
      createdAt: '2025-01-27T00:00:00Z',
      updatedAt: '2025-01-27T00:00:00Z',
      items: []
    }

    // ✅ Verificar que responsableId es accesible
    expect(mockLista.responsableId).toBe('user-id')
    expect(typeof mockLista.responsableId).toBe('string')
  })

  test('should allow responsableId in PedidoDesdeListaModal props', () => {
    // ✅ Simular el caso de uso específico del error original
    const mockLista: ListaEquipo = {
      id: 'lista-id',
      proyectoId: 'proyecto-id',
      responsableId: 'responsable-id',
      codigo: 'LST-001',
      nombre: 'Lista Equipos',
      numeroSecuencia: 1,
      estado: 'borrador',
      createdAt: '2025-01-27T00:00:00Z',
      updatedAt: '2025-01-27T00:00:00Z',
      items: []
    }

    // ✅ Esta expresión debe compilar sin errores TypeScript
    const responsableIdForModal = mockLista.responsableId || 'default-user'
    
    expect(responsableIdForModal).toBe('responsable-id')
  })

  test('should handle optional chaining with responsableId', () => {
    const mockLista: ListaEquipo | null = null
    
    // ✅ Optional chaining debe funcionar
    const responsableId = mockLista?.responsableId || 'default-user'
    
    expect(responsableId).toBe('default-user')
  })
})