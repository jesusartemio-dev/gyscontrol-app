// ===================================================
// 📁 Archivo: fechaModificacion-property.test.ts
// 📌 Ubicación: src/__tests__/components/
// 🔧 Descripción: Tests para verificar las propiedades fechaModificacion y modificadoPor
//    en la interfaz ListaEquipoMaster
// 🧠 Uso: Valida que las propiedades de modificación funcionen correctamente
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Creado: 2025-01-15
// ===================================================

import { ListaEquipoMaster } from '../../types/master-detail'
import { EstadoListaEquipo } from '../../types/modelos'

describe('ListaEquipoMaster - fechaModificacion y modificadoPor Properties', () => {
  // ✅ Mock data con propiedades de modificación
  const mockListaWithModification: ListaEquipoMaster = {
    id: 'lista-1',
    codigo: 'LST-001',
    nombre: 'Lista de Equipos Test',
    numeroSecuencia: 1,
    estado: 'borrador' as EstadoListaEquipo,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T12:00:00Z',
    fechaModificacion: '2025-01-15T12:00:00Z',
    modificadoPor: 'Juan Pérez',
    stats: {
      totalItems: 5,
      itemsVerificados: 3,
      itemsAprobados: 2,
      itemsRechazados: 0,
      costoTotal: 15000,
      costoAprobado: 10000
    },
    proyecto: {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      codigo: 'PRY-001'
    }
  }

  // ✅ Mock data sin propiedades de modificación
  const mockListaWithoutModification: ListaEquipoMaster = {
    id: 'lista-2',
    codigo: 'LST-002',
    nombre: 'Lista Sin Modificación',
    numeroSecuencia: 2,
    estado: 'aprobado' as EstadoListaEquipo,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    stats: {
      totalItems: 3,
      itemsVerificados: 3,
      itemsAprobados: 3,
      itemsRechazados: 0,
      costoTotal: 8000,
      costoAprobado: 8000
    },
    proyecto: {
      id: 'proyecto-2',
      nombre: 'Proyecto Sin Modificación',
      codigo: 'PRY-002'
    }
  }

  test('✅ debe acceder correctamente a fechaModificacion cuando está presente', () => {
    expect(mockListaWithModification.fechaModificacion).toBe('2025-01-15T12:00:00Z')
    expect(typeof mockListaWithModification.fechaModificacion).toBe('string')
  })

  test('✅ debe acceder correctamente a modificadoPor cuando está presente', () => {
    expect(mockListaWithModification.modificadoPor).toBe('Juan Pérez')
    expect(typeof mockListaWithModification.modificadoPor).toBe('string')
  })

  test('✅ debe manejar fechaModificacion undefined correctamente', () => {
    expect(mockListaWithoutModification.fechaModificacion).toBeUndefined()
    
    // 🔁 Simular lógica de display con fallback
    const displayDate = mockListaWithoutModification.fechaModificacion 
      ? new Date(mockListaWithoutModification.fechaModificacion).toLocaleDateString('es-PE')
      : 'No disponible'
    
    expect(displayDate).toBe('No disponible')
  })

  test('✅ debe manejar modificadoPor undefined correctamente', () => {
    expect(mockListaWithoutModification.modificadoPor).toBeUndefined()
    
    // 🔁 Simular lógica de display con fallback
    const displayModifiedBy = mockListaWithoutModification.modificadoPor || 'Sistema'
    
    expect(displayModifiedBy).toBe('Sistema')
  })

  test('✅ debe formatear fechaModificacion correctamente para display', () => {
    const formattedDate = mockListaWithModification.fechaModificacion
      ? new Date(mockListaWithModification.fechaModificacion).toLocaleDateString('es-PE')
      : 'No disponible'
    
    // 📡 Verificar que la fecha se formatea correctamente
    expect(formattedDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    expect(formattedDate).not.toBe('No disponible')
  })

  test('✅ debe cumplir con la interfaz TypeScript ListaEquipoMaster', () => {
    // 🔁 Verificar que ambos objetos cumplen con la interfaz
    const validateInterface = (lista: ListaEquipoMaster) => {
      expect(lista).toHaveProperty('id')
      expect(lista).toHaveProperty('codigo')
      expect(lista).toHaveProperty('nombre')
      expect(lista).toHaveProperty('estado')
      expect(lista).toHaveProperty('stats')
      expect(lista).toHaveProperty('proyecto')
      // Las propiedades opcionales pueden estar presentes o no
      if (lista.fechaModificacion) {
        expect(typeof lista.fechaModificacion).toBe('string')
      }
      if (lista.modificadoPor) {
        expect(typeof lista.modificadoPor).toBe('string')
      }
    }

    validateInterface(mockListaWithModification)
    validateInterface(mockListaWithoutModification)
  })

  test('✅ debe manejar escenarios mixtos de propiedades de modificación', () => {
    // 🔁 Lista con solo fechaModificacion
    const listaOnlyDate: ListaEquipoMaster = {
      ...mockListaWithoutModification,
      fechaModificacion: '2025-01-15T14:00:00Z'
    }

    // 🔁 Lista con solo modificadoPor
    const listaOnlyUser: ListaEquipoMaster = {
      ...mockListaWithoutModification,
      modificadoPor: 'María García'
    }

    expect(listaOnlyDate.fechaModificacion).toBe('2025-01-15T14:00:00Z')
    expect(listaOnlyDate.modificadoPor).toBeUndefined()

    expect(listaOnlyUser.modificadoPor).toBe('María García')
    expect(listaOnlyUser.fechaModificacion).toBeUndefined()
  })
})