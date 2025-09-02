// ===================================================
// 📁 Archivo: ListaEquipoCard.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para el componente ListaEquipoCard
//
// 🧠 Uso: Verificar renderizado, edición, cálculo de fechas y estados
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ListaEquipoCard from '../ListaEquipoCard'
import { ListaEquipo, ListaEquipoItem } from '@/types'

// 🎯 Mock de servicios
vi.mock('@/lib/services/listaEquipo', () => ({
  calcularDiasRestantes: vi.fn((fecha) => {
    if (!fecha) return null
    const hoy = new Date('2025-01-20')
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha
    const diferencia = fechaObj.getTime() - hoy.getTime()
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24))
  }),
  getEstadoTiempo: vi.fn((dias) => {
    if (dias === null) return null
    if (dias < 0) return 'critico'
    if (dias <= 3) return 'critico'
    if (dias <= 7) return 'urgente'
    return 'normal'
  })
}))

// 🎯 Mock de componentes
vi.mock('../ListaEstadoFlujo', () => ({
  default: ({ estado }: { estado: string }) => <div data-testid="estado-flujo">{estado}</div>
}))

vi.mock('../ListaEquipoItemList', () => ({
  default: ({ items }: { items: any[] }) => (
    <div data-testid="item-list">{items.length} items</div>
  )
}))

// 🎯 Datos de prueba
const mockLista: ListaEquipo = {
  id: 'lista-1',
  proyectoId: 'proyecto-1',
  codigo: 'LST-001',
  nombre: 'Lista de Prueba',
  numeroSecuencia: 1,
  estado: 'borrador',
  createdAt: '2025-01-20T10:00:00Z',
  updatedAt: '2025-01-20T10:00:00Z',
  fechaNecesaria: '2025-01-25T00:00:00Z', // 5 días en el futuro
  items: []
}

const mockListaSinFecha: ListaEquipo = {
  ...mockLista,
  fechaNecesaria: undefined
}

const mockItems: ListaEquipoItem[] = [
  {
    id: 'item-1',
    listaEquipoId: 'lista-1',
    descripcion: 'Item de prueba',
    cantidad: 2,
    presupuesto: 100,
    verificado: true,
    estado: 'pendiente',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z'
  }
]

const mockProps = {
  proyectoId: 'proyecto-1',
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  onAgregarCotizacion: vi.fn(),
  onAgregarCatalogo: vi.fn(),
  onEnviar: vi.fn(),
  onRefreshItems: vi.fn()
}

describe('🧪 ListaEquipoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('📅 Manejo de fechaNecesaria', () => {
    it('✅ debe mostrar badge de tiempo cuando fechaNecesaria está definida', () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      // Verificar que se muestra el badge de tiempo
      expect(screen.getByText('5 días restantes')).toBeInTheDocument()
    })

    it('✅ debe manejar correctamente cuando fechaNecesaria es undefined', () => {
      render(
        <ListaEquipoCard
          lista={mockListaSinFecha}
          items={mockItems}
          {...mockProps}
        />
      )

      // Verificar que no se muestra badge de tiempo
      expect(screen.queryByText(/días restantes/)).not.toBeInTheDocument()
      expect(screen.queryByText(/días vencido/)).not.toBeInTheDocument()
    })

    it('✅ debe mostrar estado crítico para fechas vencidas', () => {
      const listaVencida = {
        ...mockLista,
        fechaNecesaria: '2025-01-15T00:00:00Z' // 5 días atrás
      }

      render(
        <ListaEquipoCard
          lista={listaVencida}
          items={mockItems}
          {...mockProps}
        />
      )

      expect(screen.getByText('5 días vencido')).toBeInTheDocument()
    })

    it('✅ debe mostrar "Vence hoy" para fecha actual', () => {
      const listaHoy = {
        ...mockLista,
        fechaNecesaria: '2025-01-20T00:00:00Z' // Hoy
      }

      render(
        <ListaEquipoCard
          lista={listaHoy}
          items={mockItems}
          {...mockProps}
        />
      )

      expect(screen.getByText('Vence hoy')).toBeInTheDocument()
    })
  })

  describe('🎨 Renderizado básico', () => {
    it('✅ debe renderizar información básica de la lista', () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      expect(screen.getByText('Lista de Prueba')).toBeInTheDocument()
      expect(screen.getByTestId('estado-flujo')).toBeInTheDocument()
      expect(screen.getByTestId('item-list')).toBeInTheDocument()
    })

    it('✅ debe mostrar total calculado correctamente', () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      // Total = 2 * 100 = 200
      expect(screen.getByText(/200/)).toBeInTheDocument()
    })

    it('✅ debe mostrar estado de verificación cuando todos los items están verificados', () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      expect(screen.getByText('Verificado')).toBeInTheDocument()
    })
  })

  describe('✏️ Modo de edición', () => {
    it('✅ debe entrar en modo edición al hacer clic en el botón editar', async () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      const editButton = screen.getByRole('button', { name: /editar/i })
      fireEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Lista de Prueba')).toBeInTheDocument()
      })
    })

    it('✅ debe guardar cambios al hacer clic en guardar', async () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      // Entrar en modo edición
      const editButton = screen.getByRole('button', { name: /editar/i })
      fireEvent.click(editButton)

      // Cambiar nombre
      const nameInput = screen.getByDisplayValue('Lista de Prueba')
      fireEvent.change(nameInput, { target: { value: 'Nuevo Nombre' } })

      // Guardar
      const saveButton = screen.getByRole('button', { name: /guardar/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockProps.onUpdate).toHaveBeenCalledWith('lista-1', {
          nombre: 'Nuevo Nombre'
        })
      })
    })

    it('✅ debe cancelar edición al hacer clic en cancelar', async () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      // Entrar en modo edición
      const editButton = screen.getByRole('button', { name: /editar/i })
      fireEvent.click(editButton)

      // Cancelar
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.getByText('Lista de Prueba')).toBeInTheDocument()
        expect(screen.queryByDisplayValue('Lista de Prueba')).not.toBeInTheDocument()
      })
    })
  })

  describe('🗑️ Eliminación', () => {
    it('✅ debe llamar onDelete al confirmar eliminación', async () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      const deleteButton = screen.getByRole('button', { name: /eliminar/i })
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockProps.onDelete).toHaveBeenCalledWith('lista-1')
      })
    })
  })

  describe('🎯 Acciones', () => {
    it('✅ debe llamar las funciones de callback correctas', () => {
      render(
        <ListaEquipoCard
          lista={mockLista}
          items={mockItems}
          {...mockProps}
        />
      )

      // Verificar que los botones de acción están presentes
      expect(screen.getByRole('button', { name: /agregar cotización/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /agregar catálogo/i })).toBeInTheDocument()
    })
  })

  describe('📊 Cálculos', () => {
    it('✅ debe calcular total correctamente con múltiples items', () => {
      const multipleItems = [
        ...mockItems,
        {
          id: 'item-2',
          listaEquipoId: 'lista-1',
          descripcion: 'Item 2',
          cantidad: 3,
          presupuesto: 50,
          verificado: false,
          estado: 'pendiente',
          createdAt: '2025-01-20T10:00:00Z',
          updatedAt: '2025-01-20T10:00:00Z'
        }
      ]

      render(
        <ListaEquipoCard
          lista={mockLista}
          items={multipleItems}
          {...mockProps}
        />
      )

      // Total = (2 * 100) + (3 * 50) = 200 + 150 = 350
      expect(screen.getByText(/350/)).toBeInTheDocument()
    })

    it('✅ debe manejar items sin presupuesto', () => {
      const itemsSinPresupuesto = [
        {
          ...mockItems[0],
          presupuesto: undefined
        }
      ]

      render(
        <ListaEquipoCard
          lista={mockLista}
          items={itemsSinPresupuesto}
          {...mockProps}
        />
      )

      // No debe fallar y debe mostrar 0
      expect(screen.getByText(/0/)).toBeInTheDocument()
    })
  })
})